import { TestBed } from '@angular/core/testing';
import { UserSessionService } from './user-session.service';
import { UserService, UserDTO } from '../../api/user-service';
import { of } from 'rxjs';

class MockUserApi {
  getCurrentUser() { return of({ id: 'u1', email: 'user@example.com' } as UserDTO); }
}

describe('UserSessionService', () => {
  let service: UserSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserSessionService,
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
});

