import {Component, inject, isDevMode, signal, computed} from '@angular/core';

import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {AuthService as CoreAuthService} from '../../core/services/auth.service';
import {AuthService as ApiAuthService, LoginCredentialsDTO} from '../../api/user-service';
import {UserSessionService} from '../../core/services/user-session.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {ToastService} from '../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import {Button} from 'primeng/button';
import {Checkbox} from 'primeng/checkbox';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {Password} from 'primeng/password';
import {AuthLayoutComponent} from '../../shared/components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, Button, Checkbox, InputText, Message, Password],
  template: `
    <app-auth-layout>
      <header class="head">
        <h2>{{ greeting() }}</h2>
        <p>Sign in to your account. Secure access with your WMP credentials.</p>
      </header>

      @if (errorOpen()) {
        <p-message severity="error" role="alert" class="head__error">
          We couldn't sign you in. Check your email and password and try again.
        </p-message>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wmp-form">
        <div class="wmp-field">
          <label for="username">Email</label>
          <input pInputText id="username" type="email" formControlName="username" autocomplete="username"
                 placeholder="name@example.com" [attr.aria-invalid]="showError('username')"
                 [attr.aria-describedby]="showError('username') ? 'username-error' : null"/>
          @if (showError('username')) {
            <small class="wmp-field__error" id="username-error">Please enter your email.</small>
          }
        </div>

        <div class="wmp-field">
          <span class="label-row">
            <label for="password">Password</label>
            <a routerLink="/auth/forgot-password">Forgot password?</a>
          </span>
          <p-password inputId="password" formControlName="password" [feedback]="false" [toggleMask]="true"
                      autocomplete="current-password" [fluid]="true"/>
          @if (showError('password')) {
            <small class="wmp-field__error">Please enter your password.</small>
          }
        </div>

        <span class="wmp-choice">
          <p-checkbox inputId="rememberMe" formControlName="rememberMe" [binary]="true"/>
          <label for="rememberMe">Remember my email on this device</label>
        </span>

        <p-button type="submit" [label]="loading() ? 'Signing in…' : 'Sign in'" [loading]="loading()"
                  [disabled]="form.invalid" [fluid]="true"/>
      </form>

      <div class="divider"><span>or</span></div>

      <div class="social">
        <p-button label="Continue with Google" severity="secondary" [outlined]="true" [fluid]="true" (onClick)="onSocial('google')"/>
        <p-button label="Continue with Apple" severity="secondary" [outlined]="true" [fluid]="true" (onClick)="onSocial('apple')"/>
      </div>

      <p class="foot">New to WMP? <a routerLink="/onboarding/start">Open an account</a></p>
      @if (devMode) {
        <p class="foot foot--dev"><button type="button" class="link" (click)="devEnterApp()">Dev shortcut: enter app with stored session</button></p>
      }
    </app-auth-layout>
  `,
  styles: [`
    .head { margin-bottom: 1.25rem; }
    .head h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .head p { margin: .35rem 0 0; color: var(--wmp-text-muted); font-size: .9rem; }
    .head__error { display: block; margin-bottom: 1rem; }
    .label-row { display: flex; justify-content: space-between; align-items: baseline; font-size: .85rem; }
    .label-row label { font-weight: 500; color: var(--wmp-text-muted); }
    .divider { display: flex; align-items: center; gap: .75rem; margin: 1.25rem 0; color: var(--wmp-text-muted); font-size: .8rem; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--wmp-border); }
    .social { display: grid; gap: .6rem; }
    .foot { margin: 1.25rem 0 0; text-align: center; font-size: .9rem; color: var(--wmp-text-muted); }
    .foot--dev { margin-top: .5rem; font-size: .75rem; }
    .link {
      height: auto; padding: 0; border: 0; background: none; color: var(--wmp-text-muted); font-weight: 400;
      text-decoration: underline; cursor: pointer;
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly auth = inject(CoreAuthService);
  private readonly apiAuth = inject(ApiAuthService);
  private readonly userSession = inject(UserSessionService);
  private readonly toast = inject(ToastService);

  loading = signal(false);
  errorOpen = signal(false);
  protected readonly devMode = isDevMode();

  greeting = computed(() => {
    const u = this.auth.username();
    if (u) return `Welcome back, ${u}`;
    return 'Welcome to WMP';
  });

  form = this.fb.group({
    username: this.fb.control('', {validators: [Validators.required]}),
    password: this.fb.control('', {validators: [Validators.required]}),
    rememberMe: this.fb.control(true)
  });

  constructor() {
    const nav = this.router.currentNavigation();
    const state = (nav?.extras?.state ?? {}) as { registrationSucceeded?: boolean; registeredEmail?: string };
    if (state.registrationSucceeded) {
      const email = state.registeredEmail ?? '';
      const msg = email
        ? `Registration successful for ${email}. Please check your inbox to complete the activation.`
        : 'Registration successful. Please check your email inbox to complete the activation.';
      this.toast.success(msg, 6000);
    }
  }

  async onSubmit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorOpen.set(false);
    const username = this.form.controls.username.value?.trim() || '';
    const password = this.form.controls.password.value?.trim() || '';
    const remember = !!this.form.controls.rememberMe.value;

    if (remember) this.auth.setUsername(username); else this.auth.setUsername('');

    try {
      const credentials: LoginCredentialsDTO = { email: username, password } as any;
      const authResp = await firstValueFrom(this.apiAuth.loginUser(credentials));
      if (authResp?.token) this.auth.setToken(authResp.token);
      const me = await this.userSession.ensureLoaded(true);
      const userId = (me?.id ?? '').toString();
      if (!userId) {
        this.errorOpen.set(true);
        return;
      }
      await this.router.navigateByUrl(this.postLoginUrl());
    } catch {
      this.errorOpen.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Where to go after a successful login:
   * - advisors: back to the requested page (returnUrl) or their workspace;
   * - customers: customer selection first unless a customer profile is already selected,
   *   since /app screens operate on the selected customer.
   */
  private postLoginUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    // Only same-app absolute paths (no protocol-relative "//host" redirects)
    const safeReturnUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : null;
    if (this.userSession.isAdvisor()) return safeReturnUrl ?? '/app/advisor';
    if (!this.customerSession.customer()) return '/onboarding/disambiguation';
    return safeReturnUrl ?? '/app/home';
  }

  onSocial(provider: 'google' | 'apple') {
    // Placeholder: future implementation with an SSO provider
    this.toast.info(`Social login with ${provider} is not yet available.`);
  }

  async devEnterApp() {
    if (!this.auth.username()) {
      this.auth.setUsername('demo');
    }
    try {
      const me = await this.userSession.ensureLoaded(true);
      const userId = (me?.id ?? '').toString();
      if (!userId) {
        this.errorOpen.set(true);
        return;
      }
      await this.router.navigateByUrl(this.postLoginUrl());
    } catch {
      this.errorOpen.set(true);
    }
  }

  protected showError(control: 'username' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.touched && c.invalid;
  }
}
