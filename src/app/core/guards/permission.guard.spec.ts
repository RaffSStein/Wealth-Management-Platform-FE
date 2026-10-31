import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter} from '@angular/router';
import {permissionGuard} from './permission.guard';
import {PermissionStore} from '../services/permission-store.service';
import {UserSessionService, WmpRole} from '../services/user-session.service';
import {CustomerSessionService} from '../services/customer-session.service';

describe('permissionGuard', () => {
  let allowed: Set<string>;
  let roles: ReturnType<typeof signal<ReadonlySet<WmpRole>>>;
  const route = (data: object = {}) => ({data}) as unknown as ActivatedRouteSnapshot;
  const state = (url: string) => ({url}) as RouterStateSnapshot;
  const run = (url: string, data?: object) =>
    TestBed.runInInjectionContext(() => permissionGuard(route(data), state(url))) as Promise<boolean | UrlTree>;

  beforeEach(() => {
    allowed = new Set(['ACCOUNT/HOME/VIEW', 'ACCOUNT/INVESTOR_PROFILE/VIEW']);
    roles = signal<ReadonlySet<WmpRole>>(new Set<WmpRole>(['CUSTOMER']));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: PermissionStore, useValue: {
            ensureLoaded: () => Promise.resolve(),
            can: (s: string, f: string, c = 'VIEW') => allowed.has(`${s}/${f}/${c}`)
          }
        },
        {provide: UserSessionService, useValue: {roles}},
        {provide: CustomerSessionService, useValue: {customer: signal({id: 'c1'})}}
      ]
    });
  });

  const serialize = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('allows pages the catalogue lets the user view', async () => {
    expect(await run('/app/investor-profile?x=1')).toBeTrue();
  });

  it('sends other catalogue pages to the home page', async () => {
    expect(serialize(await run('/app/investments/orders'))).toBe('/app/home');
  });

  it('checks the permission code in the route data', async () => {
    const data = {permission: {section: 'ACCOUNT', feature: 'INVESTOR_PROFILE', code: 'EDIT'}};
    expect(serialize(await run('/app/investor-profile/update', data))).toBe('/app/home');
    allowed.add('ACCOUNT/INVESTOR_PROFILE/EDIT');
    expect(await run('/app/investor-profile/update', data)).toBeTrue();
  });

  it('sends admins from customer pages to the admin area, and allows pages outside the catalogue', async () => {
    roles.set(new Set<WmpRole>(['BANK_ADMIN']));
    allowed.clear();
    expect(serialize(await run('/app/home'))).toBe('/app/admin');
    expect(await run('/app/admin/approvals')).toBeTrue();
  });

  it('never redirects the home page to itself', async () => {
    allowed.clear();
    expect(await run('/app/home')).toBeTrue();
  });
});
