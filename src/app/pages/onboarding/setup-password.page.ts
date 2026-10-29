import { Component, inject, signal, OnInit } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn, FormGroup, FormControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';
import { ToastService } from '../../shared/services/toast.service';
import { PasswordStrengthFieldComponent } from '../../shared/components/password-strength-field/password-strength-field.component';
import { firstValueFrom } from 'rxjs';
import { AuthService as ApiAuthService } from '../../api/user-service';
import { HttpContext } from '@angular/common/http';
import { ONE_TIME_AUTH_TOKEN } from '../../core/interceptors/auth.context';
import { busyAction } from '../../core/services/busy-action';

@Component({
  selector: 'app-setup-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PasswordStrengthFieldComponent, AuthLayoutComponent, Button],
  template: `
    <app-auth-layout headline="Secure your account." lead="Choose a strong password to activate your WMP account. You'll use it with your email to sign in.">
      @if (success()) {
        <div class="state" role="status">
          <span class="material-symbols-outlined state__icon state__icon--ok" aria-hidden="true">verified_user</span>
          <h2>Password set</h2>
          <p>Your account is ready. Sign in with your email and new password.</p>
          <p-button label="Go to sign in" [loading]="goToLogin.pending()" (onClick)="goToLogin()"/>
        </div>
      } @else if (!token()) {
        <div class="state" role="alert">
          <span class="material-symbols-outlined state__icon state__icon--err" aria-hidden="true">link_off</span>
          <h2>This link isn't valid</h2>
          <p>Open the password link from your activation email, or request a new one.</p>
          <a routerLink="/auth/forgot-password">Request a new link</a>
        </div>
      } @else {
        <header class="head">
          <h2>Set your password</h2>
          <p>Use at least 8 characters with an uppercase letter, a number and a symbol.</p>
        </header>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wmp-form">
          <app-password-strength-field [group]="form" [submitted]="onSubmit.pending()"/>
          @if (failed()) {
            <p class="wmp-field__error" role="alert">We couldn't set your password. The link may be invalid or expired;
              <a routerLink="/auth/forgot-password">request a new one</a>.</p>
          }
          <p-button type="submit" label="Set password" [loading]="onSubmit.pending()" [disabled]="form.invalid" [fluid]="true"/>
        </form>
      }
    </app-auth-layout>
  `,
  styles: [`
    .head { margin-bottom: 1.25rem; }
    .head h2, .state h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .head p { margin: .35rem 0 0; color: var(--wmp-text-muted); font-size: .9rem; }
    .state { display: grid; gap: .75rem; justify-items: start; }
    .state p { margin: 0; color: var(--wmp-text-muted); line-height: 1.6; }
    .state__icon { font-size: 36px; }
    .state__icon--ok { color: var(--wmp-gain); }
    .state__icon--err { color: var(--wmp-danger); }
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
  readonly onSubmit = busyAction(() => this.submit());
  readonly goToLogin = busyAction(() => this.router.navigateByUrl('/auth/sign-in'));
  success = signal(false);
  failed = signal(false);

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
      return; // rendered as the "link isn't valid" state
    }
    this.token.set(t);

    // Clean the URL to avoid keeping the token in history.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    }).then();
  }

  private async submit(): Promise<void> {
    if (!this.form.valid || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }
    this.failed.set(false);

    const payload = { token: this.token()!, password: this.form.get('password')!.value };
    const context = new HttpContext().set(ONE_TIME_AUTH_TOKEN, this.token()!);

    await firstValueFrom(this.api.setupPassword(payload, 'body', false, { context }))
      .then(() => {
        this.toast.success('Password set successfully. You can now sign in.');
        this.success.set(true);
      })
      .catch(() => {
        this.failed.set(true);
      });
  }
}

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const p = control.get('password')?.value as string | undefined;
    const c = control.get('confirmPassword')?.value as string | undefined;
    return p && c && p !== c ? { mismatch: true } : null;
  };
}
