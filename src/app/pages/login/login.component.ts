import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {AuthService} from '../../core/services/auth.service';
import {BackButtonComponent} from '../../shared/components/back-button/back-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent],
  template: `
    <section class="auth-shell">
      <div class="card">
        <app-back-button [showLabel]="false" fallback="/" />
        <h1>Login</h1>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="field">
            <label for="username">Username</label>
            <input id="username" type="text" formControlName="username" autocomplete="username"/>
            <small class="error" *ngIf="form.controls.username.touched && form.controls.username.invalid">
              Inserisci uno username.
            </small>
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password"/>
            <small class="error" *ngIf="form.controls.password.touched && form.controls.password.invalid">
              Inserisci una password.
            </small>
          </div>

          <button class="primary" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Accesso in corso…' : 'Login' }}
          </button>
        </form>
      </div>
    </section>
  `,
  styles: [`
    .auth-shell {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 2rem;
      background: var(--color-bg);
    }

    .card {
      width: 100%;
      max-width: 420px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow);
      display: grid;
      gap: 0.75rem;
    }

    h1 {
      margin: 0 0 1rem;
      font-size: 1.5rem;
    }

    form {
      display: grid;
      gap: 1rem;
    }

    .field {
      display: grid;
      gap: 0.375rem;
    }

    label {
      font-size: 0.875rem;
      color: var(--color-text);
    }

    input {
      height: 40px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 0 0.75rem;
      font-size: 0.95rem;
      background: var(--color-surface);
      color: var(--color-text);
    }

    input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: var(--ring);
    }

    .error {
      color: var(--color-danger);
      font-size: 0.8rem;
    }

    .primary {
      height: 42px;
      border: 1px solid var(--color-primary);
      border-radius: var(--radius);
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      font-weight: 600;
      cursor: pointer;
    }

    .primary[disabled] {
      opacity: 0.65;
      cursor: not-allowed;
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  loading = signal(false);

  form = this.fb.group({
    username: this.fb.control('', {validators: [Validators.required]}),
    password: this.fb.control('', {validators: [Validators.required]})
  });

  onSubmit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const username = this.form.controls.username.value?.trim() || '';
    this.auth.setUsername(username);
    // fire-and-forget navigation
    void this.router.navigateByUrl('/home').catch(() => {});
    this.loading.set(false);
  }
}
