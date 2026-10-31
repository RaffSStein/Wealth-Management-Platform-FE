import {DOCUMENT} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {HttpErrorResponse, provideHttpClient} from '@angular/common/http';
import {of, throwError} from 'rxjs';
import {AuthService as ApiAuthService, UserService} from '../../api/user-service';
import {ToastService} from '../../shared/services/toast.service';
import {AuthService} from './auth.service';
import {testToken} from './branch-membership.spec';
import {BranchSwitchService} from './branch-switch.service';
import {CustomerSessionService} from './customer-session.service';
import {UserSessionService} from './user-session.service';

describe('BranchSwitchService', () => {
  const bankB = {bankCode: 'BANK-B', branchCode: 'BR-07', roles: ['CUSTOMER']};
  let api: jasmine.SpyObj<ApiAuthService>;
  let toast: jasmine.SpyObj<ToastService>;
  let location: jasmine.SpyObj<Location>;
  let auth: AuthService;
  let customerSession: CustomerSessionService;
  let service: BranchSwitchService;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiAuthService>('ApiAuthService', ['switchBranch']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    location = jasmine.createSpyObj<Location>('Location', ['assign']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        {provide: ApiAuthService, useValue: api},
        {provide: ToastService, useValue: toast},
        {provide: UserService, useValue: {getCurrentUser: () => of({id: 'u1'})}},
        {provide: DOCUMENT, useValue: {location}}
      ]
    });
    auth = TestBed.inject(AuthService);
    customerSession = TestBed.inject(CustomerSessionService);
    TestBed.inject(UserSessionService).setProfile({
      id: 'u1',
      userBranchRoles: [
        {bankCode: 'BANK-A', branchCode: 'BR-01', role: 'ADVISOR'},
        {bankCode: 'BANK-B', branchCode: 'BR-07', role: 'CUSTOMER'}
      ]
    });
    auth.setToken(testToken({tenantId: 'BANK-A', branchCode: 'BR-01'}));
    customerSession.setCustomer({id: 'c1'} as any);
    service = TestBed.inject(BranchSwitchService);
  });

  afterEach(() => {
    auth.setToken(null);
    customerSession.setCustomer(null);
    TestBed.inject(UserSessionService).clear();
  });

  it('replaces the token, drops the selected customer and reloads the new workspace', async () => {
    const next = testToken({tenantId: 'BANK-B', branchCode: 'BR-07'});
    (api.switchBranch as jasmine.Spy).and.returnValue(of({token: next}));
    await service.switchTo(bankB);
    expect(api.switchBranch).toHaveBeenCalledWith({branchCode: 'BR-07', bankCode: 'BANK-B'});
    expect(auth.token()).toBe(next);
    expect(customerSession.customer()).toBeNull();
    expect(location.assign).toHaveBeenCalledWith('/onboarding/disambiguation');
  });

  it('keeps the current token and selection when the BE refuses the switch', async () => {
    const current = auth.token();
    (api.switchBranch as jasmine.Spy).and.returnValue(throwError(() => new HttpErrorResponse({status: 403})));
    await service.switchTo(bankB);
    expect(auth.token()).toBe(current);
    expect(customerSession.customer()).not.toBeNull();
    expect(location.assign).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('does nothing for the branch already active', async () => {
    await service.switchTo({bankCode: 'BANK-A', branchCode: 'BR-01', roles: ['ADVISOR']});
    expect(api.switchBranch).not.toHaveBeenCalled();
  });
});
