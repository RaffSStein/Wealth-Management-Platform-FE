import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LoginComponent } from './login.component';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { CustomerSessionService } from '../../core/services/customer-session.service';
import { AuthService as ApiAuthService, UserService } from '../../api/user-service';
import { of, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService as CoreAuthService } from '../../core/services/auth.service';

class MockUserSessionService {
  profile: { id?: string } | null = { id: 'u1' };
  isAdvisor = signal(false);
  isAdmin = signal(false);
  ensureLoaded() { return Promise.resolve(this.profile); }
}
class MockCustomerSessionService { customer = signal<object | null>(null); }
class MockApiAuthService { loginUser() { return of({ token: 't1' }); } }
class MockUserApi {}
class MockToastService { info() {}; success() {}; error() {}; }
class MockCoreAuthService {
  token = '';
  setToken(token: string) { this.token = token; }
  setUsername() {}
  username() { return ''; }
}

describe('LoginComponent', () => {
  let navigateByUrl: jasmine.Spy;
  let userSession: MockUserSessionService;
  let customerSession: MockCustomerSessionService;
  let apiAuth: MockApiAuthService;
  let coreAuth: MockCoreAuthService;
  let queryParams: Record<string, string>;

  beforeEach(async () => {
    userSession = new MockUserSessionService();
    customerSession = new MockCustomerSessionService();
    apiAuth = new MockApiAuthService();
    coreAuth = new MockCoreAuthService();
    queryParams = {};
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        // Real router: the template uses routerLink
        provideRouter([]),
        { provide: ActivatedRoute, useFactory: () => ({ snapshot: { queryParamMap: convertToParamMap(queryParams) } }) },
        { provide: UserSessionService, useValue: userSession },
        { provide: CustomerSessionService, useValue: customerSession },
        { provide: ApiAuthService, useValue: apiAuth },
        { provide: UserService, useClass: MockUserApi },
        { provide: ToastService, useClass: MockToastService },
        { provide: CoreAuthService, useValue: coreAuth }
      ]
    }).compileComponents();
    navigateByUrl = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });

  function createWithCredentials() {
    const comp = TestBed.createComponent(LoginComponent).componentInstance;
    comp.form.controls.username.setValue('user');
    comp.form.controls.password.setValue('pass');
    return comp;
  }

  it('should store the token and send customers to customer selection', async () => {
    const comp = createWithCredentials();
    await comp.onSubmit();
    expect(coreAuth.token).toBe('t1');
    expect(navigateByUrl).toHaveBeenCalledWith('/onboarding/disambiguation');
    expect(comp.errorOpen()).toBeFalse();
  });

  it('should send customers with a selected profile back to the requested page', async () => {
    customerSession.customer.set({ id: 'c1' });
    queryParams = { returnUrl: '/app/investments' };
    const comp = createWithCredentials();
    await comp.onSubmit();
    expect(navigateByUrl).toHaveBeenCalledWith('/app/investments');
  });

  it('should send advisors to their workspace', async () => {
    userSession.isAdvisor.set(true);
    const comp = createWithCredentials();
    await comp.onSubmit();
    expect(navigateByUrl).toHaveBeenCalledWith('/app/advisor');
  });

  it('should ignore unsafe return urls', async () => {
    userSession.isAdvisor.set(true);
    queryParams = { returnUrl: '//evil.example.com' };
    const comp = createWithCredentials();
    await comp.onSubmit();
    expect(navigateByUrl).toHaveBeenCalledWith('/app/advisor');
  });

  it('should open the error dialog when the profile has no id', async () => {
    userSession.profile = {};
    const comp = createWithCredentials();
    await comp.onSubmit();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(comp.errorOpen()).toBeTrue();
  });

  it('should open the error dialog when login fails', async () => {
    spyOn(apiAuth, 'loginUser').and.returnValue(throwError(() => new Error('401')));
    const comp = createWithCredentials();
    await comp.onSubmit();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(comp.errorOpen()).toBeTrue();
    expect(comp.onSubmit.pending()).toBeFalse();
  });

  it('should not submit an invalid form', async () => {
    const loginSpy = spyOn(apiAuth, 'loginUser').and.callThrough();
    const comp = TestBed.createComponent(LoginComponent).componentInstance;
    await comp.onSubmit();
    expect(loginSpy).not.toHaveBeenCalled();
  });
});
