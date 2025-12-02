import { TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { Router } from '@angular/router';
import { UserSessionService } from '../../core/services/user-session.service';
import { AuthService as ApiAuthService, UserService } from '../../api/user-service';
import { of } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService as CoreAuthService } from '../../core/services/auth.service';

class MockRouter {
  navigateByUrlCalls: string[] = [];
  navigateByUrl(url: string) { this.navigateByUrlCalls.push(url); return Promise.resolve(true); }
  currentNavigation() { return null; }
}
class MockUserSessionService {
  ensureLoaded() { return Promise.resolve({}); }
  hasAccountValue = false;
  hasAccount() { return this.hasAccountValue; }
}
class MockApiAuthService { loginUser() { return of({ token: 't1' }); } }
class MockUserApi {}
class MockToastService { info() {}; success() {}; error() {}; }
class MockCoreAuthService { setToken() {}; setUsername() {}; username() { return ''; } }

describe('LoginComponent', () => {
  let router: MockRouter;
  let userSession: MockUserSessionService;

  beforeEach(async () => {
    router = new MockRouter();
    userSession = new MockUserSessionService();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: UserSessionService, useValue: userSession },
        { provide: ApiAuthService, useClass: MockApiAuthService },
        { provide: UserService, useClass: MockUserApi },
        { provide: ToastService, useClass: MockToastService },
        { provide: CoreAuthService, useClass: MockCoreAuthService }
      ]
    }).compileComponents();
  });

  it('should navigate to onboarding when account absent', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    userSession.hasAccountValue = false;
    comp.form.controls.username.setValue('user');
    comp.form.controls.password.setValue('pass');
    comp.form.controls.bankCode.setValue('bank');
    await comp.onSubmit();
    expect(router.navigateByUrlCalls.pop()).toBe('/onboarding/personal-details');
  });

  it('should navigate to home when account present', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    userSession.hasAccountValue = true;
    comp.form.controls.username.setValue('user');
    comp.form.controls.password.setValue('pass');
    comp.form.controls.bankCode.setValue('bank');
    await comp.onSubmit();
    expect(router.navigateByUrlCalls.pop()).toBe('/app/home');
  });
});

