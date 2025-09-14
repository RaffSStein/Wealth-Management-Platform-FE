import {Component, inject, OnInit, signal, computed} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {OnboardingProgressService} from '../../core/services/onboarding-progress.service';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import {UserService} from '../../api/user-service';
import {AuthService} from '../../core/services/auth.service';

// Validator for matching passwords
function matchPassword(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('password')?.value;
  const rep = group.get('confirmPassword')?.value;
  if (!pwd || !rep) return null;
  return pwd === rep ? null : {passwordMismatch: true};
}

@Component({
  selector: 'app-onboarding-start',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="card form-card form-card--md">
        <a routerLink="/" class="back-link" aria-label="Back to home">&larr; home</a>
        <header class="headline">
          <h1 class="greeting">Sign up</h1>
          <p class="subtitle">Create a new account to start the onboarding</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wm-form">
          <div class="two-cols">
            <div class="field">
              <label for="firstName">First name *</label>
              <input id="firstName" type="text" formControlName="firstName" autocomplete="given-name"/>
              @if (submitted() && form.controls.firstName.invalid) {
                <small class="error">Required field</small>
              }
            </div>
            <div class="field">
              <label for="lastName">Last name *</label>
              <input id="lastName" type="text" formControlName="lastName" autocomplete="family-name"/>
              @if (submitted() && form.controls.lastName.invalid) {
                <small class="error">Required field</small>
              }
            </div>
          </div>

          <div class="field">
            <label for="email">Email *</label>
            <input id="email" type="email" formControlName="email" autocomplete="email"/>
            @if (submitted() && form.controls.email.invalid) {
              <small class="error">Invalid email</small>
            }
          </div>

          <div class="field">
            <label for="role">Role *</label>
            <select id="role" formControlName="role">
              <option value="customer">Customer</option>
              <option value="advisor">Advisor</option>
            </select>
            @if (submitted() && form.controls.role.invalid) {
              <small class="error">Select a role</small>
            }
          </div>

          @if (showCompanyId()) {
            <div class="field">
              <label for="companyId">Company ID *</label>
              <input id="companyId" type="text" formControlName="companyId" placeholder="Company UUID"/>
              <small class="hint">Required for operator role</small>
              @if (submitted() && form.controls.companyId.invalid) {
                <small class="error">Required for operator</small>
              }
            </div>
          }

          <div formGroupName="passwords" class="two-cols">
            <div class="field">
              <label for="password">Password *</label>
              <input id="password" type="password" formControlName="password" autocomplete="new-password"/>
              @if (submitted() && passwords.controls.password.invalid) {
                <small class="error">Minimum 8 characters</small>
              }
            </div>
            <div class="field">
              <label for="confirmPassword">Confirm *</label>
              <input id="confirmPassword" type="password" formControlName="confirmPassword"
                     autocomplete="new-password"/>
              @if (submitted() && passwords.errors?.passwordMismatch) {
                <small class="error">Passwords do not match</small>
              }
            </div>
          </div>

          <button class="primary btn--lg" type="submit"
                  [disabled]="loading()">{{ loading() ? 'Signing up…' : 'Create account' }}
          </button>
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
        </form>

        <p class="signin-hint">Already have an account? <a routerLink="/auth/sign-in">Sign in</a></p>
      </div>
    </section>
  `,
  styles: [`

    .two-cols {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .error {
      color: var(--color-danger, #c0392b);
      font-size: 0.65rem;
    }

    .hint {
      font-size: 0.6rem;
      opacity: .7;
    }

    .form-error {
      margin: 0;
      font-size: 0.7rem;
      color: var(--color-danger, #c0392b);
    }

    .signin-hint {
      margin: 0.4rem 0 0;
      font-size: 0.7rem;
      text-align: center;
    }

    .signin-hint a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 600;
    }

    .signin-hint a:hover {
      text-decoration: underline;
    }

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

    .back-link {
      font-size: 0.6rem;
      text-decoration: none;
      color: var(--color-primary);
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  `]
})
export class OnboardingStartComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly progress: OnboardingProgressService = inject(OnboardingProgressService);

  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  form = this.fb.group({
    firstName: this.fb.control('', {validators: [Validators.required]}),
    lastName: this.fb.control('', {validators: [Validators.required]}),
    email: this.fb.control('', {validators: [Validators.required, Validators.email]}),
    role: this.fb.control<'customer' | 'advisor'>('customer', {validators: [Validators.required]}),
    companyId: this.fb.control('', {validators: []}),
    passwords: this.fb.group({
      password: this.fb.control('', {validators: [Validators.required, Validators.minLength(8)]}),
      confirmPassword: this.fb.control('', {validators: [Validators.required]})
    }, {validators: [matchPassword]})
  });

  passwords = this.form.controls.passwords as any;

  showCompanyId = computed(() => this.form.controls.role.value === 'advisor');

  ngOnInit(): void {
    // no automatic redirect: the page now shows the sign up form
  }

  private buildUsername(first: string, last: string): string {
    const base = `${first}.${last}`.toLowerCase().replace(/\s+/g, '.');
    return base.replace(/[^a-z0-9._-]/g, '');
  }

  onSubmit() {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;

    const v = this.form.value;
    const first = v.firstName?.trim() || '';
    const last = v.lastName?.trim() || '';
    const email = v.email?.trim() || '';
    const role = v.role || 'customer';
    const companyId = this.showCompanyId() ? (v.companyId?.trim() || '') : 'public-company';

    if (this.showCompanyId() && !companyId) {
      this.error.set('Company ID required for operator role');
      return;
    }

    const username = this.buildUsername(first, last);
    const mappedRole = role === 'advisor' ? 'ADVISOR' : 'CUSTOMER';

    this.loading.set(true);
    this.userService.createUser({
      username,
      email,
      companyId,
      roles: [mappedRole]
    }).subscribe({
      next: () => {
        this.auth.setUsername(username);
        // Start onboarding flow -> first step
        const target = this.progress.pathFor(0 as any);
        void this.router.navigateByUrl(target).catch(() => {
        });
      },
      error: (err) => {
        console.error(err);
        this.error.set('Sign up failed. Please try again later.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }
}
