import {Component} from '@angular/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  template: `
    <section class="auth-shell placeholder">
      <div class="card">
        <h1>Forgot password</h1>
        <p>This page will allow users to recover their password. (Placeholder)</p>
      </div>
    </section>
  `,
  styles: [`
    .auth-shell { min-height: 100dvh; display: grid; place-items: center; padding: 2rem; }
    .card { max-width: 520px; width: 100%; border: 1px solid var(--color-border); background: var(--color-surface); padding: 1.5rem; border-radius: var(--radius); display: grid; gap: 0.75rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    p { margin: 0; font-size: 0.875rem; opacity: 0.8; }
  `]
})
export class ForgotPasswordComponent {}
