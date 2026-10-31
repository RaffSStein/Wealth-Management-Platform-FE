import {HttpErrorResponse} from '@angular/common/http';
import {WmpRole, parseRole} from './role-assignment';

/**
 * What the active role may assign and revoke, mirroring the BE rules (profiler-service, BE doc
 * `security/roles-and-permissions.md`, sections 4 and 7). UI only: the BE re-checks every call and answers 403.
 * Nobody acts on themselves; PLATFORM_ADMIN is never assigned (bootstrap only).
 */
export function assignableRoles(caller: ReadonlySet<WmpRole>): WmpRole[] {
  if (caller.has('PLATFORM_ADMIN')) return ['BANK_ADMIN'];
  if (caller.has('BANK_ADMIN')) return ['CUSTOMER', 'ADVISOR'];
  if (caller.has('ADVISOR')) return ['CUSTOMER'];
  return [];
}

/** Whether the caller may revoke an assignment with this role (bank and branch scope is the BE's). */
export function canRevoke(caller: ReadonlySet<WmpRole>, role: string | undefined): boolean {
  const target = parseRole(role);
  if (!target) return false;
  if (caller.has('PLATFORM_ADMIN')) return target === 'BANK_ADMIN';
  if (caller.has('BANK_ADMIN')) return target === 'CUSTOMER' || target === 'ADVISOR';
  if (caller.has('ADVISOR')) return target === 'CUSTOMER';
  return false;
}

/** Staff roles need a second admin: assigning them creates a request instead of the assignment. */
export const needsApproval = (role: WmpRole): boolean => role === 'ADVISOR' || role === 'BANK_ADMIN';

/** User-facing message for a failed assign or revoke (BE error codes of POST/DELETE /role-assignments). */
export function roleAssignmentErrorMessage(e: unknown): string {
  const status = e instanceof HttpErrorResponse ? e.status : 0;
  switch (status) {
    case 400:
      return "That branch isn't active, or a detail is missing. Check the branch and try again.";
    case 403:
      return "You can't do this here: check the role, the bank and the branch.";
    case 404:
      return "That branch doesn't exist in this bank, or the person or role is no longer there.";
    case 409:
      return 'They already have this role there, or a request for it is waiting for approval.';
    case 503:
      return 'Nothing was changed: a service is unavailable. Try again in a moment.';
    default:
      return "The change couldn't be saved. Try again in a moment.";
  }
}
