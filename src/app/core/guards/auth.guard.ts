import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from '../services/auth.service';

/**
 * Requires an authenticated session (bearer token present); otherwise redirects to sign-in,
 * keeping the requested URL so login can send the user back.
 * Token validity is enforced by the BE (401 → handled by the interceptor/login flow).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).token()) return true;
  return inject(Router).createUrlTree(['/auth/sign-in'], {queryParams: {returnUrl: state.url}});
};
