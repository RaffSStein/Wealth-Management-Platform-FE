import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {UserSessionService} from '../services/user-session.service';

export const NOT_LINKED_PATH = '/onboarding/not-linked';

/**
 * Requires a token issued for a role assignment (bank + branch). Every bank-owned endpoint rejects a token without
 * a tenant with 401, so a user nobody has linked to a bank and branch yet (e.g. just self-registered) gets the
 * "not linked" page instead of errors, and is never mistaken for an ended session.
 */
export const roleAssignmentGuard: CanActivateFn = () =>
  inject(UserSessionService).activeBranch() ? true : inject(Router).parseUrl(NOT_LINKED_PATH);
