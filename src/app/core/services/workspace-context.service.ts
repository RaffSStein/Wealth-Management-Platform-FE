import {Injectable, computed, inject} from '@angular/core';
import {Router} from '@angular/router';
import {UserSessionService} from './user-session.service';
import {CustomerSessionService} from './customer-session.service';
import {homePathFor} from './home-path';

/**
 * WorkspaceContextService
 * Answers "whose workspace is the user in?":
 * - customers always work on their own (selected) customer profile;
 * - advisors work in the Advisor workspace, or "act as" a client once one is selected
 *   (customer selection sets CustomerSessionService.customer).
 */
@Injectable({providedIn: 'root'})
export class WorkspaceContextService {
  private readonly router = inject(Router);
  private readonly userSession = inject(UserSessionService);
  private readonly customerSession = inject(CustomerSessionService);

  readonly isAdvisor = this.userSession.isAdvisor;
  readonly actingAsClient = computed(() => this.isAdvisor() && !!this.customerSession.customer());

  /** Display name of the client the advisor is acting for (company name for legal entities). */
  readonly clientName = computed(() => {
    const c = this.customerSession.customer();
    if (!c) return '';
    const person = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
    return person || c.companyName || c.taxId;
  });
  readonly clientId = computed(() => this.customerSession.customer()?.id ?? '');

  /** Landing page for the current user/context. */
  readonly homePath = computed(() => homePathFor(this.userSession.roles(), !!this.customerSession.customer()));

  /**
   * Leave the onboarding flow; it can be resumed later from the customer list (CustomerSelectionService.open).
   * Advisors leave the client context and go back to their workspace; customers go to their profile list.
   * An already onboarded customer (a step opened from the dashboard, e.g. goals) stays selected and goes home.
   */
  async exitOnboarding(): Promise<void> {
    if (this.customerSession.customer()?.customerStatus === 'ACTIVE') {
      await this.router.navigateByUrl('/app/home');
      return;
    }
    if (this.isAdvisor()) {
      await this.exitClient();
      return;
    }
    await this.router.navigateByUrl('/onboarding/disambiguation');
  }

  /** Leave the client context and go back to the Advisor workspace. */
  async exitClient(): Promise<void> {
    this.customerSession.setCustomer(null);
    await this.router.navigateByUrl('/app/advisor');
  }
}
