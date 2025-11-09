import {Component, inject, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {AuthService as CoreAuthService} from '../../core/services/auth.service';
import {AuthService as ApiAuthService, LoginCredentialsDTO} from '../../api/user-service';
import {UserSessionService} from '../../core/services/user-session.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="card form-card form-card--sm">
        <a routerLink="/" class="back-link" aria-label="Back to home page">&larr; back to home page</a>

        <header class="headline">
          <h1 class="greeting">{{ greeting() }}</h1>
          <p class="subtitle">Glad to see you! Please enter your details</p>
        </header>

        <div class="social-row">
          <button type="button" class="social google" (click)="onSocial('google')">Continue with Google</button>
          <button type="button" class="social apple" (click)="onSocial('apple')">Continue with Apple</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wm-form">
          <div class="field">
            <label for="username">Username <span class="req" aria-hidden="true">*</span></label>
            <input id="username" type="text" formControlName="username" autocomplete="username" required/>
            @if (form.controls.username.touched && form.controls.username.invalid) {
              <small class="error">Please enter a username.</small>
            }
          </div>

          <div class="field">
            <label for="password">Password <span class="req" aria-hidden="true">*</span></label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password" required/>
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <small class="error">Please enter a password.</small>
            }
          </div>

          <div class="field">
            <label for="bankCode">Bank Code <span class="req" aria-hidden="true">*</span></label>
            <input id="bankCode" type="text" formControlName="bankCode" autocomplete="off" required/>
            @if (form.controls.bankCode.touched && form.controls.bankCode.invalid) {
              <small class="error">Please enter a bank code.</small>
            }
          </div>

          <div class="form-extras">
            <label class="remember">
              <input type="checkbox" formControlName="rememberMe"/>
              <span>Remember me</span>
            </label>
            <a routerLink="/auth/forgot-password" class="forgot">Forgot password?</a>
          </div>

          <button class="primary btn--lg" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in…' : 'Login' }}
          </button>
        </form>
        <div class="dev-shortcut">
          <button type="button" class="shortcut-btn" (click)="devEnterApp()" aria-label="Developer shortcut: go to app">
            Enter App (dev shortcut)
          </button>
        </div>
        <p class="signup-hint">Not a customer yet? <a routerLink="/onboarding/start">Start building your portfolio
          now</a></p>
      </div>

      <!-- Error modal shown when /me fails -->
      @if (errorOpen()) {
        <div class="modal-backdrop" role="presentation"></div>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-error-title">
          <div class="modal__content">
            <h2 id="login-error-title">Login error</h2>
            <p>An error occurred while retrieving your user information. Please go back to login and try again.</p>
            <div class="modal__actions">
              <button type="button" class="primary" (click)="goBackToLogin()">Back to login</button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    /* Specific styles (shared basics moved to global _forms.scss) */
    .headline {
      display: grid;
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }

    .greeting {
      margin: 0;
      font-size: 1.75rem;
      line-height: 1.2;
    }

    .subtitle {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-muted, var(--color-text));
      opacity: 0.8;
    }

    .social-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin: 0.25rem 0 0.75rem;
    }

    .social {
      height: 40px;
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt, var(--color-surface));
      border-radius: var(--radius);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 0.5rem;
      color: var(--color-text);
    }

    .social:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: var(--ring);
    }

    .form-extras {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: -0.25rem;
    }

    .remember {
      display: inline-flex;
      gap: 0.4rem;
      align-items: center;
      font-size: 0.75rem;
      user-select: none;
    }

    .remember input {
      width: 14px;
      height: 14px;
      margin: 0;
    }

    .forgot {
      font-size: 0.75rem;
      text-decoration: none;
      color: var(--color-primary);
    }

    .forgot:hover {
      text-decoration: underline;
    }

    .req {
      color: var(--color-danger);
    }

    .signup-hint {
      margin: 0.75rem 0 0;
      text-align: center;
      font-size: 0.75rem;
    }

    .signup-hint a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }

    .signup-hint a:hover {
      text-decoration: underline;
    }

    .back-link {
      display: inline-block;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-decoration: none;
      color: var(--color-primary);
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    .dev-shortcut {
      margin-top: .75rem;
      text-align: center;
    }

    .shortcut-btn {
      background: var(--color-surface-alt);
      border: 1px dashed var(--color-border);
      color: var(--color-text);
      padding: .55rem 1rem;
      font-size: .7rem;
      border-radius: var(--radius);
      cursor: pointer;
    }

    .shortcut-btn:hover {
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      border-style: solid;
    }

    /* Lightweight modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, .3);
      z-index: 50;
    }

    .modal {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      z-index: 60;
    }

    .modal__content {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 1rem 1.25rem;
      max-width: 420px;
    }

    .modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: .5rem;
      margin-top: .75rem;
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(CoreAuthService);
  private readonly apiAuth = inject(ApiAuthService);
  private readonly userSession = inject(UserSessionService);

  loading = signal(false);
  errorOpen = signal(false);

  greeting = computed(() => {
    const u = this.auth.username();
    if (u) return `Welcome back, ${u}`;
    return 'Welcome to Wealth Management Platform';
  });

  form = this.fb.group({
    username: this.fb.control('', {validators: [Validators.required]}),
    password: this.fb.control('', {validators: [Validators.required]}),
    rememberMe: this.fb.control(true),
    bankCode: this.fb.control('', {validators: [Validators.required]})
  });

  async onSubmit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const username = this.form.controls.username.value?.trim() || '';
    const password = this.form.controls.password.value?.trim() || '';
    const bankCode = this.form.controls.bankCode.value?.trim() || '';
    const remember = !!this.form.controls.rememberMe.value;

    if (remember) this.auth.setUsername(username); else this.auth.setUsername('');

    try {
      const credentials: LoginCredentialsDTO = { email: username, password, bankCode };
      const authResp = await firstValueFrom(this.apiAuth.loginUser(credentials));
      if (authResp?.token) this.auth.setToken(authResp.token);
      await this.userSession.ensureLoaded(true);
      await this.router.navigateByUrl('/app/home');
    } catch {
      this.errorOpen.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  onSocial(provider: 'google' | 'apple') {
    // Placeholder: future implementation with an SSO provider
    console.log('Social login not yet implemented:', provider);
  }

  async devEnterApp() {
    if (!this.auth.username()) {
      this.auth.setUsername('demo');
    }
    try {
      await this.userSession.ensureLoaded(true);
      await this.router.navigateByUrl('/app/home');
    } catch {
      this.errorOpen.set(true);
    }
  }

  goBackToLogin() {
    // Close modal and ensure we are on the login route
    this.errorOpen.set(false);
    void this.router.navigateByUrl('/auth/sign-in').catch(() => {
    });
  }
}
