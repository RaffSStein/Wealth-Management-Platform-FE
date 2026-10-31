import {DOCUMENT, Injectable, inject} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {AuthService as ApiAuthService} from '../../api/user-service';
import {AuthService} from './auth.service';
import {BranchMembership, sameBranch} from './branch-membership';
import {CustomerSessionService} from './customer-session.service';
import {OnboardingProgressService} from './onboarding-progress.service';
import {ToastService} from '../../shared/services/toast.service';
import {UserSessionService} from './user-session.service';

/**
 * Switches the user's active branch (possibly in another bank): POST /auth/switch-branch issues a new token and
 * revokes the old one, which is replaced, never kept. Everything loaded so far belongs to the previous bank, so
 * the selected customer is dropped and the app reloads from the workspace home of the new branch.
 */
@Injectable({providedIn: 'root'})
export class BranchSwitchService {
  private readonly api = inject(ApiAuthService);
  private readonly auth = inject(AuthService);
  private readonly userSession = inject(UserSessionService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly progress = inject(OnboardingProgressService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  async switchTo(target: BranchMembership): Promise<void> {
    if (sameBranch(target, this.userSession.activeBranch())) return;
    let token: string | undefined;
    try {
      const response = await firstValueFrom(this.api.switchBranch({branchCode: target.branchCode, bankCode: target.bankCode}));
      token = response?.token;
    } catch (e) {
      // 403: not a member there; the current token stays valid
      this.toast.error(e instanceof HttpErrorResponse && e.status === 403
        ? 'You are no longer a member of that branch.'
        : 'Could not switch branch. Please try again.');
      return;
    }
    if (!token) {
      this.toast.error('Could not switch branch. Please try again.');
      return;
    }
    this.auth.setToken(token);
    // Refresh /me so the cached memberships' active flags follow the new token (roles read the token itself)
    await this.userSession.ensureLoaded(true).catch(() => undefined);
    this.customerSession.setCustomer(null);
    this.progress.reset();
    // A full reload drops every in-memory cache, poll and notification of the previous bank
    this.document.location.assign(this.userSession.isAdvisor() ? '/app/advisor' : '/onboarding/disambiguation');
  }
}
