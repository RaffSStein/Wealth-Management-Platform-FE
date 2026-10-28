import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {UserSessionService, WmpRole} from '../services/user-session.service';

/**
 * Allows the route only for users holding `role` (from /me → userBranchRoles); others go to the customer home.
 * UI-level gate only: the BE enforces roles on every endpoint (@PreAuthorize).
 */
export function roleGuard(role: WmpRole): CanActivateFn {
  return async () => {
    const userSession = inject(UserSessionService);
    const router = inject(Router);
    try {
      await userSession.ensureLoaded();
    } catch {
      return router.createUrlTree(['/auth/sign-in']);
    }
    return userSession.roles().has(role) ? true : router.createUrlTree(['/app/home']);
  };
}
