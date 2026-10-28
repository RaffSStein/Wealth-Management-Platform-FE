import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService as ApiAuthService } from '../../api/user-service';

describe('ForgotPasswordComponent', () => {
  let api: { requestPasswordReset: jasmine.Spy };

  beforeEach(async () => {
    api = { requestPasswordReset: jasmine.createSpy('requestPasswordReset').and.returnValue(of({})) };
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideRouter([]), { provide: ApiAuthService, useValue: api }]
    }).compileComponents();
  });

  function submitWith(email: string) {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const comp = fixture.componentInstance;
    (comp as any).form.controls.email.setValue(email);
    return { fixture, comp, done: comp.onSubmit() };
  }

  it('requests a reset and shows the neutral confirmation', async () => {
    const { comp, done } = submitWith('user@example.com');
    await done;
    expect(api.requestPasswordReset).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect((comp as any).sentTo()).toBe('user@example.com');
  });

  it('shows the same confirmation when the request fails (no account enumeration)', async () => {
    api.requestPasswordReset.and.returnValue(throwError(() => new Error('404')));
    const { comp, done } = submitWith('unknown@example.com');
    await done;
    expect((comp as any).sentTo()).toBe('unknown@example.com');
  });

  it('does not call the API with an invalid email', async () => {
    const { done } = submitWith('not-an-email');
    await done;
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
  });
});
