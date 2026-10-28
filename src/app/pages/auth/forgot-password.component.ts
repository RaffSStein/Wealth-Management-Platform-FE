import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {AuthService as ApiAuthService} from '../../api/user-service';
import {AuthLayoutComponent} from '../../shared/components/auth-layout/auth-layout.component';

/**
 * Password reset request (public). Always ends on the same neutral confirmation, whether or not the
 * account exists or the call fails, so the page can't be used to discover registered emails.
 */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, Button, InputText],
  template: `
    <app-auth-layout headline="Reset your password." lead="Enter the email you use for WMP and we'll send you a secure link to choose a new password.">
      @if (sentTo(); as email) {
        <div class="done" role="status">
          <span class="material-symbols-outlined" aria-hidden="true">mark_email_read</span>
          <h2>Check your inbox</h2>
          <p>If an account exists for <strong>{{ email }}</strong>, we've sent a link to reset your password.
            It can take a few minutes; check your spam folder too.</p>
          <a routerLink="/auth/sign-in" class="back">Back to sign in</a>
        </div>
      } @else {
        <header class="head">
          <h2>Forgot password</h2>
          <p>We'll email you a reset link.</p>
        </header>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wmp-form">
          <div class="wmp-field">
            <label for="email">Email</label>
            <input pInputText id="email" type="email" formControlName="email" autocomplete="email"
                   placeholder="name@example.com" [attr.aria-invalid]="showError()"/>
            @if (showError()) { <small class="wmp-field__error">Enter a valid email address.</small> }
          </div>
          <p-button type="submit" label="Send reset link" [loading]="loading()" [fluid]="true"/>
        </form>
        <p class="foot"><a routerLink="/auth/sign-in">Back to sign in</a></p>
      }
    </app-auth-layout>
  `,
  styles: [`
    .head { margin-bottom: 1.25rem; }
    .head h2, .done h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .head p { margin: .35rem 0 0; color: var(--wmp-text-muted); font-size: .9rem; }
    .foot { margin: 1.25rem 0 0; text-align: center; font-size: .9rem; }
    .done { display: grid; gap: .75rem; justify-items: start; }
    .done p { margin: 0; color: var(--wmp-text-muted); line-height: 1.6; }
    .done .material-symbols-outlined { font-size: 36px; color: var(--wmp-primary); }
    .back { font-weight: 500; }
  `]
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apiAuth = inject(ApiAuthService);

  protected readonly loading = signal(false);
  protected readonly sentTo = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: this.fb.control('', {validators: [Validators.required, Validators.email]})
  });

  protected showError(): boolean {
    const c = this.form.controls.email;
    return c.invalid && (c.touched || c.dirty);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = (this.form.controls.email.value || '').trim();
    this.loading.set(true);
    try {
      await firstValueFrom(this.apiAuth.requestPasswordReset({email}));
    } catch {
      // Deliberately ignored: the outcome shown to the user is the same either way (no account enumeration)
    } finally {
      this.loading.set(false);
      this.sentTo.set(email);
    }
  }
}
