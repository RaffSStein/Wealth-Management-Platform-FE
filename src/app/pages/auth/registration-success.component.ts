import {Component, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ButtonDirective, ButtonLabel} from 'primeng/button';
import {RegistrationStateService} from '../../core/services/registration-state.service';
import {AuthLayoutComponent} from '../../shared/components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-registration-success',
  imports: [RouterLink, AuthLayoutComponent, ButtonDirective, ButtonLabel],
  template: `
    <app-auth-layout headline="Almost there." lead="Activate your account from the email we just sent, then sign in to complete your investor profile.">
      <div class="state" role="status" aria-live="polite">
        <span class="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>
        <h2>Check your email</h2>
        <p>
          @if (email()) {
            We sent an activation link to <strong>{{ email() }}</strong>. Open it to set your password.
          } @else {
            We sent an activation link to your email address. Open it to set your password.
          }
        </p>
        <p class="hint">Didn't get it? It can take a couple of minutes, or end up in your spam folder.</p>
        <a pButton routerLink="/auth/sign-in" [fluid]="true"><span pButtonLabel>Go to sign in</span></a>
        <a routerLink="/" class="home">Back to home</a>
      </div>
    </app-auth-layout>
  `,
  styles: [`
    .state { display: grid; gap: .75rem; }
    .state h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .state p { margin: 0; color: var(--wmp-text-muted); line-height: 1.6; }
    .state .material-symbols-outlined { font-size: 36px; color: var(--wmp-primary); }
    .hint { font-size: .85rem; }
    .home { justify-self: center; font-size: .9rem; }
  `]
})
export class RegistrationSuccessComponent {
  private readonly registrationState = inject(RegistrationStateService);
  // Read once from session storage and cleared: the email never appears in the URL
  protected readonly email = signal<string | null>(this.registrationState.consumeEmail());
}
