import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RegLinkService } from '../../core/services/registration-link.service';
import { PasswordStrengthFieldComponent } from '../../shared/components/password-strength-field/password-strength-field.component';
import { ToastService } from '../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordStrengthFieldComponent],
  template: `
    <section class="auth-shell">
      <div class="card form-card form-card--md narrow-form">
        <a routerLink="/" class="back-link" aria-label="Torna alla home">&larr; torna alla home</a>

        <header class="headline">
          <h1 class="greeting">Imposta la tua password</h1>
          <p class="subtitle">Il link è monouso e potrebbe scadere dopo pochi minuti.</p>
        </header>

        @if (loading()) {
          <p>Verifica del link in corso…</p>
        } @else if (invalid()) {
          <div class="alert error" role="alert" aria-live="polite">
            Link non valido o scaduto.
          </div>
          <div class="actions-col">
            <a routerLink="/auth/sign-in" class="primary btn--lg">Vai al login</a>
            <a routerLink="/auth/forgot-password" class="button-secondary btn--lg">Recupera password</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wm-form">
            <app-password-strength-field [group]="form" [submitted]="submitted()"></app-password-strength-field>

            <button class="primary btn--lg" type="submit" [disabled]="form.invalid || submitting()">
              {{ submitting() ? 'Salvataggio…' : 'Imposta password e accedi' }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styles: [`
    .narrow-form { max-width: 520px; margin-inline: auto; }
    .headline { display: grid; gap: 0.25rem; margin-bottom: 0.25rem; }
    .greeting { margin: 0; font-size: 1.5rem; line-height: 1.2; }
    .subtitle { margin: 0; font-size: 0.875rem; opacity: 0.8; }
    .alert.error { margin:.5rem 0; padding:.5rem .6rem; border-radius: var(--radius); background:#fee4e2; border:1px solid #fecdca; color:#b42318; }
    .actions-col { display: flex; flex-direction: column; gap: .65rem; margin-top: 1rem; }
    .back-link { display:inline-block; font-size:.65rem; letter-spacing:.05em; text-decoration:none; color:var(--color-primary); font-weight:600; margin-bottom:.25rem; }
  `]
})
export class SetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reg = inject(RegLinkService);
  private readonly toast = inject(ToastService);

  token = signal<string>('');
  loading = signal<boolean>(true);
  invalid = signal<boolean>(false);
  submitting = signal<boolean>(false);
  submitted = signal<boolean>(false);

  form = this.fb.group({
    password: this.fb.control('', [Validators.required, Validators.minLength(8), this.uppercaseValidator(), this.numberValidator(), this.symbolValidator()]),
    confirmPassword: this.fb.control('', [Validators.required])
  }, { validators: [this.matchValidator()] });

  async ngOnInit() {
    const tk = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(tk);

    // Remove the token from the URL bar immediately
    try { await this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: {} }); } catch {}

    if (!tk) {
      this.invalid.set(true);
      this.loading.set(false);
      return;
    }

    try {
      await firstValueFrom(this.reg.validateToken(tk));
      this.invalid.set(false);
    } catch {
      this.invalid.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit() {
    this.submitted.set(true);
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);

    const pwd = this.form.controls.password.value || '';
    const tk = this.token();

    try {
      await firstValueFrom(this.reg.completeRegistration(tk, pwd));
      this.toast.success('Password impostata correttamente. Ora puoi accedere.');
      await this.router.navigateByUrl('/auth/sign-in');
    } catch {
      this.invalid.set(true);
    } finally {
      this.submitting.set(false);
    }
  }

  private matchValidator() {
    return (group: any) => {
      const p = group.get('password')?.value;
      const c = group.get('confirmPassword')?.value;
      return p && c && p !== c ? { passwordMismatch: true } : null;
    };
  }

  private uppercaseValidator() {
    return (ctrl: any) => {
      const v = (ctrl?.value || '') as string;
      return !v || /[A-Z]/.test(v) ? null : { missingUppercase: true };
    };
  }

  private numberValidator() {
    return (ctrl: any) => {
      const v = (ctrl?.value || '') as string;
      return !v || /\d/.test(v) ? null : { missingNumber: true };
    };
  }

  private symbolValidator() {
    return (ctrl: any) => {
      const v = (ctrl?.value || '') as string;
      return !v || /[^A-Za-z0-9]/.test(v) ? null : { missingSymbol: true };
    };
  }
}
