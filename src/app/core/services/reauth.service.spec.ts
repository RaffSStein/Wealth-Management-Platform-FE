import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {AuthService as ApiAuthService} from '../../api/user-service';
import {AuthService} from './auth.service';
import {ReauthService} from './reauth.service';
import {UserSessionService} from './user-session.service';

describe('ReauthService', () => {
  const reauthRequired = new HttpErrorResponse({status: 401, error: {errorCode: 'REAUTHENTICATION_REQUIRED'}});
  let api: jasmine.SpyObj<ApiAuthService>;
  let auth: jasmine.SpyObj<AuthService>;
  let service: ReauthService;
  let order: string[];

  beforeEach(() => {
    order = [];
    api = jasmine.createSpyObj<ApiAuthService>('ApiAuthService', ['loginUser']);
    api.loginUser.and.returnValue(of({token: 'fresh'}) as any);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['revokeCurrentToken', 'setToken', 'username']);
    auth.revokeCurrentToken.and.callFake(async () => void order.push('revoke'));
    auth.setToken.and.callFake(() => void order.push('replace'));
    TestBed.configureTestingModule({
      providers: [
        {provide: ApiAuthService, useValue: api},
        {provide: AuthService, useValue: auth},
        {
          provide: UserSessionService, useValue: {
            profile: signal({email: 'admin@bank.test'}),
            activeBranch: signal({bankCode: 'BANK_A', branchCode: 'BR_01', roles: ['BANK_ADMIN']})
          }
        }
      ]
    });
    service = TestBed.inject(ReauthService);
  });

  it('runs the call without prompting when it succeeds', async () => {
    expect(await service.run(async () => 'done')).toBe('done');
    expect(service.open()).toBeFalse();
  });

  it('lets other errors through', async () => {
    const forbidden = new HttpErrorResponse({status: 403});
    await expectAsync(service.run(() => Promise.reject(forbidden))).toBeRejectedWith(forbidden);
    expect(service.open()).toBeFalse();
  });

  it('asks for the password, signs in on the same branch and retries once', async () => {
    let calls = 0;
    const result = service.run(async () => {
      if (++calls === 1) throw reauthRequired;
      return 'approved';
    });
    await Promise.resolve();
    expect(service.open()).toBeTrue();
    expect(service.email()).toBe('admin@bank.test');

    await service.confirm('secret');
    expect(await result).toBe('approved');
    expect(calls).toBe(2);
    expect(api.loginUser).toHaveBeenCalledWith({email: 'admin@bank.test', password: 'secret', bankCode: 'BANK_A', branchCode: 'BR_01'});
    // the old token is revoked while it is still the one sent, then replaced
    expect(order).toEqual(['revoke', 'replace']);
    expect(auth.setToken).toHaveBeenCalledWith('fresh');
    expect(service.open()).toBeFalse();
  });

  it('keeps the prompt open on a wrong password', async () => {
    void service.run(() => Promise.reject(reauthRequired));
    await Promise.resolve();
    api.loginUser.and.returnValue(throwError(() => new HttpErrorResponse({status: 401})));
    await service.confirm('wrong');
    expect(service.open()).toBeTrue();
    expect(service.error()).toBe("That password isn't right.");
    expect(auth.setToken).not.toHaveBeenCalled();
  });

  it('abandons the action on cancel', async () => {
    const call = jasmine.createSpy('call').and.rejectWith(reauthRequired);
    const result = service.run(call);
    await Promise.resolve();
    service.cancel();
    expect(await result).toBeUndefined();
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('shares one prompt between calls that need it at the same time', async () => {
    const a = service.run(() => Promise.reject(reauthRequired)).catch(() => 'a');
    const b = service.run(() => Promise.reject(reauthRequired)).catch(() => 'b');
    await Promise.resolve();
    await Promise.resolve();
    await service.confirm('secret');
    await Promise.all([a, b]);
    expect(api.loginUser).toHaveBeenCalledTimes(1);
  });
});
