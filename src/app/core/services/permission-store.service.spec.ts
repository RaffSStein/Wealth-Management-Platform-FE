import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of, throwError} from 'rxjs';
import {PermissionsService, UserPermissionDTO} from '../../api/profiler-service';
import {PermissionStore} from './permission-store.service';
import {UserSessionService, WmpRole} from './user-session.service';
import {TokenAssignment} from './role-assignment';

describe('PermissionStore', () => {
  const catalogue: UserPermissionDTO = {
    sectionPermissions: [{
      sectionCode: 'ACCOUNT',
      featurePermissions: [
        {featureCode: 'HOME', permissions: [{permissionCode: 'VIEW'}]},
        {featureCode: 'INVESTOR_PROFILE', permissions: [{permissionCode: 'VIEW'}, {permissionCode: 'EDIT'}]}
      ]
    }]
  };
  let api: jasmine.SpyObj<PermissionsService>;
  let activeBranch: ReturnType<typeof signal<TokenAssignment | null>>;
  let roles: ReturnType<typeof signal<ReadonlySet<WmpRole>>>;
  let store: PermissionStore;

  beforeEach(() => {
    sessionStorage.removeItem('wm.user.permissions');
    api = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['getUserSitemapByClaims']);
    api.getUserSitemapByClaims.and.returnValue(of(catalogue) as any);
    activeBranch = signal<TokenAssignment | null>({bankCode: 'BANK_A', branchCode: 'BR_01', roles: ['CUSTOMER']});
    roles = signal<ReadonlySet<WmpRole>>(new Set<WmpRole>(['CUSTOMER']));
    TestBed.configureTestingModule({
      providers: [
        {provide: PermissionsService, useValue: api},
        {provide: UserSessionService, useValue: {activeBranch, roles}}
      ]
    });
    store = TestBed.inject(PermissionStore);
  });

  afterEach(() => sessionStorage.removeItem('wm.user.permissions'));

  it('allows everything until the catalogue is known', () => {
    expect(store.status()).toBe('loading');
    expect(store.can('ACCOUNT', 'ASSETS')).toBeTrue();
    expect(store.navigationCheck()).toBeUndefined();
  });

  it('checks features and permission codes once loaded', async () => {
    await store.ensureLoaded();
    expect(store.status()).toBe('ready');
    expect(store.can('ACCOUNT', 'HOME')).toBeTrue();
    expect(store.can('ACCOUNT', 'INVESTOR_PROFILE', 'EDIT')).toBeTrue();
    expect(store.can('ACCOUNT', 'HOME', 'EDIT')).toBeFalse();
    expect(store.can('ACCOUNT', 'ASSETS')).toBeFalse();
    expect(store.navigationCheck()!('ACCOUNT', 'HOME')).toBeTrue();
  });

  it('fetches once per bank and roles, again after a branch switch', async () => {
    await Promise.all([store.ensureLoaded(), store.ensureLoaded()]);
    await store.ensureLoaded();
    expect(api.getUserSitemapByClaims).toHaveBeenCalledTimes(1);
    activeBranch.set({bankCode: 'BANK_B', branchCode: 'BR_09', roles: ['ADVISOR']});
    roles.set(new Set<WmpRole>(['ADVISOR']));
    expect(store.status()).toBe('loading');
    await store.ensureLoaded();
    expect(api.getUserSitemapByClaims).toHaveBeenCalledTimes(2);
  });

  it('falls back to allowing everything when the catalogue cannot be loaded', async () => {
    api.getUserSitemapByClaims.and.returnValue(throwError(() => new Error('503')));
    await store.ensureLoaded();
    expect(store.status()).toBe('unavailable');
    expect(store.can('ACCOUNT', 'ASSETS')).toBeTrue();
  });
});
