import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn, FormGroup, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';
import { PasswordStrengthFieldComponent } from '../../shared/components/password-strength-field/password-strength-field.component';
import { firstValueFrom } from 'rxjs';
import { AuthService as ApiAuthService } from '../../api/user-service';
import { HttpContext } from '@angular/common/http';
import { ONE_TIME_AUTH_TOKEN } from '../../core/interceptors/auth.context';

@Component({
  selector: 'app-setup-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PasswordStrengthFieldComponent],
  template: `
    <section class="setup-password-page">
      <h1>Set your password</h1>

      @if (!success()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="setup-form">
          <app-password-strength-field
            [group]="form"
            [submitted]="submitting()">
          </app-password-strength-field>

          <div class="form-actions">
            <button type="submit" [disabled]="submitting() || form.invalid" class="primary-btn">Set password</button>
          </div>
        </form>
      }

      @if (success()) {
        <div class="success">
          <p>Password successfully set.</p>
          <button (click)="goToLogin()" class="primary-btn">Go to sign in</button>
        </div>
      }
    </section>
  `,
  styles: [`
    .setup-password-page {
      padding: 2rem;
      color: var(--color-text);
      display: grid;
      justify-content: center;
    }
    .setup-password-page h1 {
      text-align: center;
      margin: 0 0 1rem;
      color: var(--color-text);
      font-size: 1.25rem;
      font-weight: 600;
    }
    .setup-form {
      width: 100%;
      max-width: 520px;
      background: var(--surface, var(--color-surface, #fff));
      border: 1px solid var(--color-border);
      border-radius: var(--radius, 8px);
      padding: 1rem;
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.06));
      display: grid;
      gap: 1rem;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: .5rem;
    }
    .primary-btn {
      appearance: none;
      border: none;
      border-radius: var(--radius, 8px);
      padding: .6rem 1rem;
      font-size: .95rem;
      font-weight: 600;
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      cursor: pointer;
      transition: background-color .2s ease, opacity .2s ease;
    }
    .primary-btn:disabled {
      opacity: .6;
      cursor: not-allowed;
    }
    .primary-btn:not(:disabled):hover {
      opacity: .95;
    }
    .success {
      width: 100%;
      max-width: 520px;
      margin: 1rem auto 0;
      text-align: center;
      display: grid;
      gap: .75rem;
    }
  `]
})
export class SetupPasswordPage implements OnInit {
  // Injected services are readonly since they are not reassigned
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiAuthService);

  token = signal<string | null>(null);
  submitting = signal(false);
  success = signal(false);

  form: FormGroup<{
    password: FormControl<string>;
    confirmPassword: FormControl<string>;
  }> = this.fb.group({
    password: this.fb.control<string>('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: this.fb.control<string>('', { validators: [Validators.required], nonNullable: true }),
  }, { validators: passwordMatchValidator() });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const t = qp.get('token');
    if (!t) {
      this.toast.error('Missing token. Please use the link from your email.');
      return;
    }
    this.token.set(t);

    // Clean the URL to avoid keeping the token in history.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    }).then();
  }

  async onSubmit(): Promise<void> {
    if (!this.form.valid || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);

    const payload = { token: this.token()!, password: this.form.get('password')!.value };
    const context = new HttpContext().set(ONE_TIME_AUTH_TOKEN, this.token()!);

    await firstValueFrom(this.api.setupPassword(payload, 'body', false, { context }))
      .then(() => {
        this.toast.success('Password set successfully. You can now sign in.');
        this.success.set(true);
      })
      .catch(() => {
        this.toast.error('Failed to set password. The link may be invalid or expired.');
      })
      .finally(() => {
        this.submitting.set(false);
      });
  }

  goToLogin(): void {
    this.router.navigateByUrl('/auth/sign-in');
  }
}

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const p = control.get('password')?.value as string | undefined;
    const c = control.get('confirmPassword')?.value as string | undefined;
    return p && c && p !== c ? { mismatch: true } : null;
  };
}
