import {inject} from '@angular/core';
import {CanActivateChildFn, Router} from '@angular/router';
import {featureOf} from '../../layout/navigation';
import {CustomerSessionService} from '../services/customer-session.service';
import {homePathFor} from '../services/home-path';
import {PermissionCode, PermissionStore} from '../services/permission-store.service';
import {UserSessionService} from '../services/user-session.service';

/** Route data for a page that needs more than viewing its catalogue feature. */
export interface RoutePermission {
  section: string;
  feature: string;
  code?: PermissionCode;
}

/**
 * Keeps `/app` pages the active role assignment may not view out of reach (a typed URL as well as the menu):
 * `data.permission`, else the page's navigation item (`featureOf`), is checked against the BE catalogue. Denied
 * pages lead to the user's home. Pages outside the catalogue (admin area) and an unknown catalogue are allowed:
 * the BE checks every call anyway.
 */
export const permissionGuard: CanActivateChildFn = async (route, state) => {
  const store = inject(PermissionStore);
  const userSession = inject(UserSessionService);
  const customerSession = inject(CustomerSessionService);
  const router = inject(Router);

  const path = state.url.split(/[?#]/)[0];
  const required: RoutePermission | null = route.data['permission'] ?? featureOf(path);
  if (!required) return true;
  await store.ensureLoaded();
  if (store.can(required.section, required.feature, required.code)) return true;
  const home = homePathFor(userSession.roles(), !!customerSession.customer());
  return home === path ? true : router.parseUrl(home);
};
