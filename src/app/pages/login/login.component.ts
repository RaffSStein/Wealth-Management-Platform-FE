import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="auth-shell">
      <div class="card">
        <h1>Accedi</h1>
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="field">
            <label for="username">Username</label>
            <input id="username" type="text" formControlName="username" autocomplete="username" />
            <small class="error" *ngIf="form.controls.username.touched && form.controls.username.invalid">
              Inserisci uno username.
            </small>
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password" />
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
    .auth-shell { min-height: 100dvh; display: grid; place-items: center; padding: 2rem; background: #f7f7f8; }
    .card { width: 100%; max-width: 420px; background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 6px 24px rgba(0,0,0,0.08); }
    h1 { margin: 0 0 1rem; font-size: 1.5rem; }
    form { display: grid; gap: 1rem; }
    .field { display: grid; gap: 0.375rem; }
    label { font-size: 0.875rem; color: #333; }
    input { height: 40px; border: 1px solid #d9d9df; border-radius: 8px; padding: 0 0.75rem; font-size: 0.95rem; }
    input:focus { outline: none; border-color: #7b5cff; box-shadow: 0 0 0 3px rgba(123,92,255,0.15); }
    .error { color: #c43d3d; font-size: 0.8rem; }
    .primary { height: 42px; border: 0; border-radius: 8px; background: #7b5cff; color: #fff; font-weight: 600; cursor: pointer; }
    .primary[disabled] { opacity: 0.65; cursor: not-allowed; }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  loading = signal(false);

  form = this.fb.group({
    username: this.fb.control('', { validators: [Validators.required] }),
    password: this.fb.control('', { validators: [Validators.required] })
  });

  onSubmit() {
    if (this.form.invalid || this.loading()) return;

    const username = this.form.value.username?.trim() || '';
    // Password non usata realmente (login fittizia)

    this.loading.set(true);
    this.userService.setUsername(username);

    // Carica dati base utente e poi naviga alla homepage
    this.userService.loadMe().subscribe({
      next: () => this.router.navigateByUrl('/home'),
      error: () => this.router.navigateByUrl('/home'),
      complete: () => this.loading.set(false)
    });
  }
}

