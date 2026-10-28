import {Component, inject, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {AuthService as ApiAuthService, RegisterRequestDTO} from '../../api/user-service';
import {ToastService} from '../../shared/services/toast.service';
import {RegistrationStateService} from '../../core/services/registration-state.service';
import {AuthLayoutComponent} from '../../shared/components/auth-layout/auth-layout.component';

/**
 * Public sign-up (/onboarding/start): creates the user; the BE then emails a password-setup link.
 */
@Component({
  selector: 'app-onboarding-start',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, Button, InputText],
  template: `
    <app-auth-layout headline="Open your WMP account."
                     lead="Create your account in a minute. We'll email you a secure link to set your password, then guide you through a short investor profile.">
      <header class="head">
        <h2>Create your account</h2>
        <p>All fields are required.</p>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wmp-form">
        <div class="wmp-form-grid">
          <div class="wmp-field">
            <label for="firstName">First name</label>
            <input pInputText id="firstName" formControlName="firstName" autocomplete="given-name"
                   [attr.aria-invalid]="showError('firstName')"/>
            @if (showError('firstName')) { <small class="wmp-field__error">Enter your first name.</small> }
          </div>
          <div class="wmp-field">
            <label for="lastName">Last name</label>
            <input pInputText id="lastName" formControlName="lastName" autocomplete="family-name"
                   [attr.aria-invalid]="showError('lastName')"/>
            @if (showError('lastName')) { <small class="wmp-field__error">Enter your last name.</small> }
          </div>
        </div>
        <div class="wmp-field">
          <label for="email">Email</label>
          <input pInputText id="email" type="email" formControlName="email" autocomplete="email"
                 placeholder="name@example.com" [attr.aria-invalid]="showError('email')"/>
          @if (showError('email')) { <small class="wmp-field__error">Enter a valid email address.</small> }
        </div>
        <div class="wmp-field">
          <label for="phoneNumber">Phone</label>
          <input pInputText id="phoneNumber" type="tel" formControlName="phoneNumber" autocomplete="tel"
                 placeholder="+39 …" [attr.aria-invalid]="showError('phoneNumber')"/>
          @if (showError('phoneNumber')) { <small class="wmp-field__error">Enter your phone number.</small> }
        </div>

        <p-button type="submit" [label]="loading() ? 'Creating account…' : 'Create account'" [loading]="loading()"
                  [fluid]="true"/>
      </form>

      <p class="foot">Already have an account? <a routerLink="/auth/sign-in">Sign in</a></p>
      <p class="terms">By continuing you agree to our <a routerLink="/terms">Terms of Service</a>.</p>
    </app-auth-layout>
  `,
  styles: [`
    .head { margin-bottom: 1.25rem; }
    .head h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .head p { margin: .35rem 0 0; color: var(--wmp-text-muted); font-size: .9rem; }
    .foot { margin: 1.25rem 0 0; text-align: center; font-size: .9rem; color: var(--wmp-text-muted); }
    .terms { margin: .5rem 0 0; text-align: center; font-size: .75rem; color: var(--wmp-text-muted); }
  `]
})
export class OnboardingStartComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly apiAuth = inject(ApiAuthService);
  private readonly toast = inject(ToastService);
  private readonly registrationState = inject(RegistrationStateService);

  loading = signal(false);

  form = this.fb.group({
    firstName: this.fb.control('', {validators: [Validators.required]}),
    lastName: this.fb.control('', {validators: [Validators.required]}),
    email: this.fb.control('', {validators: [Validators.required, Validators.email]}),
    phoneNumber: this.fb.control('', {validators: [Validators.required]})
  });

  showError(path: string): boolean {
    const ctrl = this.form.get(path);
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: RegisterRequestDTO = {
      email: (value.email || '').trim(),
      firstName: (value.firstName || '').trim(),
      lastName: (value.lastName || '').trim(),
      phoneNumber: (value.phoneNumber || '').trim()
    } as RegisterRequestDTO;

    this.loading.set(true);
    try {
      await firstValueFrom(this.apiAuth.registerUser(payload));
      this.registrationState.setEmail(payload.email);
      await this.router.navigateByUrl('/auth/registration-success');
    } catch {
      this.toast.error('Registration failed. Please try again later.', 5000);
    } finally {
      this.loading.set(false);
    }
  }
}
