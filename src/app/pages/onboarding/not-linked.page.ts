import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {Button} from 'primeng/button';
import {AuthService} from '../../core/services/auth.service';
import {busyAction} from '../../core/services/busy-action';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {AuthLayoutComponent} from '../../shared/components/auth-layout/auth-layout.component';

/**
 * Shown to a signed-in user with no role assignment: their token can't reach any bank data yet. A bank (admin flow)
 * or the customer onboarding links them to a branch; a new sign-in then issues a token for it.
 */
@Component({
  selector: 'app-not-linked',
  imports: [AuthLayoutComponent, Button],
  template: `
    <app-auth-layout headline="Almost ready." lead="Your account exists, but it isn't linked to a bank yet.">
      <div class="state" role="status">
        <span class="material-symbols-outlined" aria-hidden="true">account_balance</span>
        <h2>Your account isn't linked to a bank yet</h2>
        <p>Your bank or advisor links your account to a branch. Once they have, sign in again to see your accounts
          and continue onboarding.</p>
        <p-button label="Sign out" [loading]="signOut.pending()" [fluid]="true" (onClick)="signOut()"/>
      </div>
    </app-auth-layout>
  `,
  styles: [`
    .state { display: grid; gap: .75rem; }
    .state h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .state p { margin: 0; color: var(--wmp-text-muted); line-height: 1.6; }
    .state .material-symbols-outlined { font-size: 36px; color: var(--wmp-primary); }
  `]
})
export class NotLinkedPage {
  private readonly auth = inject(AuthService);
  private readonly userSession = inject(UserSessionService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly router = inject(Router);

  protected readonly signOut = busyAction(async () => {
    await this.auth.logout();
    this.userSession.clear();
    this.customerSession.setCustomer(null);
    await this.router.navigateByUrl('/auth/sign-in');
  });
}
