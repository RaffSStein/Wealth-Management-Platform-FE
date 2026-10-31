import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {UserSessionService, WmpRole} from '../services/user-session.service';
import {homePathFor} from '../services/home-path';
import {CustomerSessionService} from '../services/customer-session.service';

/**
 * Allows the route only for users holding one of `roles` in the active role assignment; others go to their own
 * home. UI-level gate only: the BE enforces roles on every endpoint (@PreAuthorize).
 */
export function roleGuard(...roles: WmpRole[]): CanActivateFn {
  return async () => {
    const userSession = inject(UserSessionService);
    const router = inject(Router);
    const customerSession = inject(CustomerSessionService);
    try {
      await userSession.ensureLoaded();
    } catch {
      return router.createUrlTree(['/auth/sign-in']);
    }
    const held = userSession.roles();
    return roles.some(r => held.has(r)) ? true : router.parseUrl(homePathFor(held, !!customerSession.customer()));
  };
}
