import {Component, inject, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {CommonModule, Location} from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {AuthService as ApiAuthService, RegisterRequestDTO} from '../../api/user-service';
import {ToastService} from '../../shared/services/toast.service';

@Component({
  selector: 'app-onboarding-start',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="card form-card form-card--md narrow-form">
        <a routerLink="/" class="back-link" aria-label="Back to home">&larr; home</a>
        <header class="headline">
          <h1 class="greeting">Welcome</h1>
          <p class="subtitle">Create your account to get started</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="wm-form vertical">
          <div class="field">
            <label for="firstName">First name *</label>
            <input id="firstName" type="text" formControlName="firstName" autocomplete="given-name"/>
            @if (showError('firstName')) {
              <small class="error">Required field</small>
            }
          </div>

          <div class="field">
            <label for="lastName">Last name *</label>
            <input id="lastName" type="text" formControlName="lastName" autocomplete="family-name"/>
            @if (showError('lastName')) {
              <small class="error">Required field</small>
            }
          </div>

          <div class="field">
            <label for="email">Email *</label>
            <input id="email" type="email" formControlName="email" autocomplete="email"/>
            @if (showError('email')) {
              <small class="error">Invalid email</small>
            }
          </div>

          <div class="field">
            <label for="phoneNumber">Phone *</label>
            <input id="phoneNumber" type="tel" formControlName="phoneNumber" autocomplete="tel"/>
            @if (showError('phoneNumber')) {
              <small class="error">Required</small>
            }
          </div>

          <div class="actions-row">
            <button type="button"
                    class="btn btn--secondary actions-row__prev"
                    (click)="goBack()"
                    [disabled]="loading()">
              Back
            </button>

            <button type="button"
                    class="btn btn--ghost actions-row__reset"
                    (click)="resetForm()"
                    [disabled]="loading()">
              Reset
            </button>

            <button class="primary btn--lg register-submit actions-row__next"
                    type="submit" [disabled]="loading()">
              {{ loading() ? 'Signing up…' : 'Create account' }}
            </button>
          </div>
        </form>

        <p class="signin-hint">Already have an account? <a routerLink="/auth/sign-in">Sign in</a></p>
      </div>
    </section>
  `,
  styles: [`
    .narrow-form {
      max-width: 520px;
      margin-inline: auto;
    }

    .wm-form.vertical .field {
      display: flex;
      flex-direction: column;
    }

    .wm-form.vertical .field + .field {
      margin-top: .6rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
      border: 0;
    }

    .actions-row {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: flex-end;
      gap: .75rem;
      margin-top: .9rem;
    }

    .actions-row__next {
    }

    .btn.btn--secondary,
    .btn.btn--ghost {
      background-color: #ffffff;
      color: inherit;
    }

    .btn.btn--secondary:hover,
    .btn.btn--ghost:hover {
      background-color: #f5f5f5;
    }
  `]
})
export class OnboardingStartComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly apiAuth = inject(ApiAuthService);
  private readonly toast = inject(ToastService);

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

  resetForm() {
    this.form.reset();
  }

  goBack() {
    this.location.back();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value as any;
    const payload: RegisterRequestDTO = {
      email: (value.email || '').trim(),
      firstName: (value.firstName || '').trim(),
      lastName: (value.lastName || '').trim(),
      phoneNumber: (value.phoneNumber || '').trim()
    } as any;

    this.loading.set(true);

    this.apiAuth.registerUser(payload).subscribe({
      next: () => {
        this.router.navigate(['auth/sign-in'], {
          state: {
            registrationSucceeded: true,
            registeredEmail: payload.email
          }
        }).finally(() => {
          this.loading.set(false);
        });
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Registration failed. Please try again later.', 5000);
        this.loading.set(false);
      }
    });
  }
}
