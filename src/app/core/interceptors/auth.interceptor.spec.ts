import {TestBed} from '@angular/core/testing';
import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {firstValueFrom} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {SessionExpiryService} from '../services/session-expiry.service';
import {authInterceptor} from './auth.interceptor';

describe('authInterceptor session expiry', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let expiry: jasmine.SpyObj<SessionExpiryService>;

  beforeEach(() => {
    expiry = jasmine.createSpyObj<SessionExpiryService>('SessionExpiryService', ['expire']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {provide: SessionExpiryService, useValue: expiry}
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.setToken('current');
  });

  afterEach(() => {
    backend.verify();
    auth.setToken(null);
  });

  /** Sends a GET, answers it with `status` and returns the request's Authorization header. */
  async function call(url: string, status: number, beforeReply?: () => void, body: object = {}): Promise<string | null> {
    const response = firstValueFrom(http.get(url)).catch(() => undefined);
    const req = backend.expectOne(url);
    beforeReply?.();
    req.flush(body, {status, statusText: 'x'});
    await response;
    return req.request.headers.get('Authorization');
  }

  it('attaches the session token and ends the session on its 401', async () => {
    expect(await call('/customer-service/customer/c1', 401)).toBe('Bearer current');
    expect(expiry.expire).toHaveBeenCalledTimes(1);
  });

  it('ignores a 401 for a token that was already replaced (branch switch)', async () => {
    await call('/customer-service/customer/c1', 401, () => auth.setToken('next'));
    expect(expiry.expire).not.toHaveBeenCalled();
  });

  it('ignores other errors and the login and logout calls', async () => {
    await call('/customer-service/customer/c1', 503);
    await call('/customer-service/customer/c1', 403);
    await call('/user-service/auth/logout', 401);
    // a token without a role assignment: the session is valid, the user just isn't linked to a bank yet
    await call('/customer-service/customer/c1', 401, undefined, {errorCode: 'MISSING_HEADER_TOKEN_FIELD'});
    // an admin action that needs a recent sign-in: re-prompt, don't end the session
    await call('/user-service/admin/memberships', 401, undefined, {errorCode: 'REAUTHENTICATION_REQUIRED'});
    expect(expiry.expire).not.toHaveBeenCalled();
  });
});
