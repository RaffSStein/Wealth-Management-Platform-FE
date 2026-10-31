import { TestBed } from '@angular/core/testing';
import { UserSessionService } from './user-session.service';
import { UserService, UserDTO } from '../../api/user-service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { testToken } from './role-assignment.spec';

class MockUserApi {
  getCurrentUser() { return of({ id: 'u1', email: 'user@example.com' } as UserDTO); }
}

describe('UserSessionService', () => {
  let service: UserSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserSessionService,
        provideHttpClient(),
        { provide: UserService, useClass: MockUserApi }
      ]
    });
    service = TestBed.inject(UserSessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('hasAccount should return false when profile is null', () => {
    service.clear();
    expect(service.hasAccount()).toBeFalse();
  });

  it('hasAccount should return false when accountId missing', async () => {
    await service.ensureLoaded(true);
    expect(service.hasAccount()).toBeFalse();
  });

  it('hasAccount should return true when accountId is present and non-empty', () => {
    service.setProfile({ id: 'u1', email: 'user@example.com', accountId: 'acc123' } as any);
    expect(service.hasAccount()).toBeTrue();
  });

  it('getAccountId should return undefined when missing and value when present', () => {
    service.setProfile({ id: 'u2' } as any);
    expect(service.getAccountId()).toBeUndefined();
    service.setProfile({ id: 'u2', accountId: 'A1' } as any);
    expect(service.getAccountId()).toBe('A1');
  });

  describe('roles', () => {
    const profile = {
      id: 'u1',
      userBranchRoles: [
        { bankCode: 'BANK-A', branchCode: 'BR-01', role: 'ADVISOR' },
        { bankCode: 'BANK-B', branchCode: 'BR-01', role: 'CUSTOMER' }
      ]
    } as UserDTO;
    let auth: AuthService;

    beforeEach(() => {
      auth = TestBed.inject(AuthService);
      service.setProfile(profile);
    });

    afterEach(() => {
      auth.setToken(null);
      service.clear();
    });

    it('come only from the role assignment the token is issued for', () => {
      auth.setToken(testToken({ tenantId: 'BANK-B', branchCode: 'BR-01' }));
      expect(service.activeBranch()).toEqual({ bankCode: 'BANK-B', branchCode: 'BR-01', roles: [] });
      expect(service.isAdvisor()).toBeFalse();
      auth.setToken(testToken({ tenantId: 'BANK-A', branchCode: 'BR-01' }));
      expect(service.isAdvisor()).toBeTrue();
      expect(service.roleAssignments().length).toBe(2);
    });

    it('prefer the roles claim of the token', () => {
      auth.setToken(testToken({ tenantId: 'BANK-B', branchCode: 'BR-01', roles: ['BANK_ADMIN'] }));
      expect(service.isBankAdmin()).toBeTrue();
      expect(service.isAdmin()).toBeTrue();
      expect(service.isAdvisor()).toBeFalse();
    });

    it('are CUSTOMER only for a token without a role assignment', () => {
      auth.setToken(testToken({ sub: 'u1', roles: ['CUSTOMER'] }));
      expect([...service.roles()]).toEqual(['CUSTOMER']);
    });
  });
});
