import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { membershipGuard } from './membership.guard';
import { ActiveBranch } from '../services/branch-membership';
import { AuthService } from '../services/auth.service';
import { UserSessionService, WmpRole } from '../services/user-session.service';

describe('guards', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;

  let token: ReturnType<typeof signal<string | null>>;
  let roles: ReturnType<typeof signal<ReadonlySet<WmpRole>>>;
  let ensureLoaded: jasmine.Spy;
  let activeBranch: ReturnType<typeof signal<ActiveBranch | null>>;

  beforeEach(() => {
    token = signal<string | null>(null);
    roles = signal<ReadonlySet<WmpRole>>(new Set<WmpRole>(['CUSTOMER']));
    activeBranch = signal<ActiveBranch | null>(null);
    ensureLoaded = jasmine.createSpy('ensureLoaded').and.resolveTo({});
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { token } },
        { provide: UserSessionService, useValue: { roles, ensureLoaded, activeBranch } }
      ]
    });
  });

  const serialize = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  describe('membershipGuard', () => {
    it('allows a token issued for a bank membership', () => {
      activeBranch.set({ bankCode: 'BANK_A', branchCode: 'BR_01' });
      expect(TestBed.runInInjectionContext(() => membershipGuard(route, state('/app/home')))).toBeTrue();
    });

    it('sends a user with no membership to the not-linked page', () => {
      const result = TestBed.runInInjectionContext(() => membershipGuard(route, state('/app/home')));
      expect(serialize(result)).toBe('/onboarding/not-linked');
    });
  });

  describe('authGuard', () => {
    it('allows navigation with a token', () => {
      token.set('t1');
      expect(TestBed.runInInjectionContext(() => authGuard(route, state('/app/home')))).toBeTrue();
    });

    it('redirects to sign-in with the requested url otherwise', () => {
      const result = TestBed.runInInjectionContext(() => authGuard(route, state('/app/home')));
      expect(serialize(result)).toBe('/auth/sign-in?returnUrl=%2Fapp%2Fhome');
    });
  });

  describe('roleGuard', () => {
    it('allows users holding the role', async () => {
      roles.set(new Set<WmpRole>(['ADVISOR']));
      const result = await TestBed.runInInjectionContext(() => roleGuard('ADVISOR')(route, state('/app/advisor')));
      expect(result).toBeTrue();
    });

    it('sends other users to the customer home', async () => {
      const result = await TestBed.runInInjectionContext(() => roleGuard('ADVISOR')(route, state('/app/advisor')));
      expect(serialize(result)).toBe('/app/home');
    });

    it('sends users to sign-in when the profile cannot be loaded', async () => {
      ensureLoaded.and.rejectWith(new Error('401'));
      const result = await TestBed.runInInjectionContext(() => roleGuard('ADVISOR')(route, state('/app/advisor')));
      expect(serialize(result)).toBe('/auth/sign-in');
    });
  });
});
