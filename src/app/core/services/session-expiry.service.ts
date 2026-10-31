import {DOCUMENT, Injectable, inject} from '@angular/core';
import {AuthService} from './auth.service';
import {CustomerSessionService} from './customer-session.service';
import {UserSessionService} from './user-session.service';

/** Query flag the sign-in page reads to explain why the user is there. */
export const SESSION_EXPIRED_PARAM = 'expired';

/**
 * Ends a session the BE no longer accepts (expired, or revoked by a logout or branch switch elsewhere).
 * Clears the token and the cached user and customer, then reloads the sign-in page so nothing of the previous
 * session stays in memory (polls, notifications). The remembered email is kept. Runs once: later 401s of the
 * same session find no token and are ignored.
 */
@Injectable({providedIn: 'root'})
export class SessionExpiryService {
  private readonly auth = inject(AuthService);
  private readonly userSession = inject(UserSessionService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly document = inject(DOCUMENT);

  expire(): void {
    if (!this.auth.token()) return;
    this.auth.setToken(null);
    this.userSession.clear();
    this.customerSession.setCustomer(null);

    const {pathname, search} = this.document.location;
    const here = pathname + search;
    const params = new URLSearchParams({[SESSION_EXPIRED_PARAM]: '1'});
    if (pathname.startsWith('/app') || pathname.startsWith('/onboarding')) params.set('returnUrl', here);
    this.document.location.assign(`/auth/sign-in?${params}`);
  }
}
