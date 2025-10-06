import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {RegistrationStateService} from '../../core/services/registration-state.service';

@Component({
  selector: 'app-registration-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="card form-card form-card--md narrow-form" role="alert" aria-live="polite">
        <header class="headline">
          <h1 class="greeting">Registration Completed!</h1>
          <p class="subtitle">Almost there!</p>
        </header>
        <p class="message">
          Thank you for registering!
          @if (email()) {
            <span>Please check <strong>{{ email() }}</strong> to validate your account before logging in.</span>
          } @else {
            <span>Please check your email inbox to validate your account before logging in.</span>
          }
        </p>
        <p class="helper">Didn't receive the email? It can take a couple of minutes or end up in your spam folder.</p>
        <div class="actions-col">
          <a routerLink="/auth/sign-in" class="primary btn--lg">Go to login</a>
          <button type="button" class="button-secondary btn--lg" (click)="goHome()">Continue to home anyway</button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .narrow-form {
      max-width: 520px;
      margin-inline: auto;
    }

    .message {
      font-size: .9rem;
      line-height: 1.4;
      margin-top: .25rem;
      margin-bottom: .25rem;
    }

    .helper {
      font-size: .70rem;
      opacity: .75;
      margin-top: .10rem;
    }

    .actions-col {
      display: flex;
      flex-direction: column;
      gap: .65rem;
      margin-top: 1.5rem;
    }

    .actions-col a, .actions-col button {
      width: 100%;
    }
  `]
})
export class RegistrationSuccessComponent {
  private readonly router = inject(Router);
  private readonly registrationState = inject(RegistrationStateService);
  email = signal<string | null>(null);

  constructor() {
    // no URL exposure
    const consumed = this.registrationState.consumeEmail();
    this.email.set(consumed);
  }

  goHome() {
    void this.router.navigateByUrl('/home');
  }
}
