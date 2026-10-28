import { TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { Router, provideRouter } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { AuthService as ApiAuthService, UserService } from '../../api/user-service';
import { of, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService as CoreAuthService } from '../../core/services/auth.service';

class MockUserSessionService {
  profile: { id?: string } | null = { id: 'u1' };
  ensureLoaded() { return Promise.resolve(this.profile); }
}
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
  let apiAuth: MockApiAuthService;
  let coreAuth: MockCoreAuthService;

  beforeEach(async () => {
    userSession = new MockUserSessionService();
    apiAuth = new MockApiAuthService();
    coreAuth = new MockCoreAuthService();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        // Real router: the template uses routerLink, which needs ActivatedRoute
        provideRouter([]),
        { provide: UserSessionService, useValue: userSession },
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

  it('should store the token and navigate to customer disambiguation on success', async () => {
    const comp = createWithCredentials();
    await comp.onSubmit();
    expect(coreAuth.token).toBe('t1');
    expect(navigateByUrl).toHaveBeenCalledWith('/onboarding/disambiguation');
    expect(comp.errorOpen()).toBeFalse();
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
    expect(comp.loading()).toBeFalse();
  });

  it('should not submit an invalid form', async () => {
    const loginSpy = spyOn(apiAuth, 'loginUser').and.callThrough();
    const comp = TestBed.createComponent(LoginComponent).componentInstance;
    await comp.onSubmit();
    expect(loginSpy).not.toHaveBeenCalled();
  });
});
