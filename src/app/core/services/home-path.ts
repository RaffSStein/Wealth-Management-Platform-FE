import {WmpRole} from './role-assignment';

export const ADMIN_HOME = '/app/admin';
export const ADVISOR_HOME = '/app/advisor';
export const CUSTOMER_HOME = '/app/home';

/**
 * Landing page for the roles of the active role assignment. Admins work in the admin area (the most privileged
 * role wins, like on the BE); advisors in their workspace unless acting for a client; customers on their home.
 */
export function homePathFor(roles: ReadonlySet<WmpRole>, customerSelected: boolean): string {
  if (roles.has('PLATFORM_ADMIN') || roles.has('BANK_ADMIN')) return ADMIN_HOME;
  return roles.has('ADVISOR') && !customerSelected ? ADVISOR_HOME : CUSTOMER_HOME;
}
