import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {CustomerDTO} from '../../api/customer-service';
import {CustomerSessionService} from './customer-session.service';
import {UserSessionService} from './user-session.service';
import {WorkspaceContextService} from './workspace-context.service';

describe('WorkspaceContextService.exitOnboarding', () => {
  let service: WorkspaceContextService;
  let customerSession: CustomerSessionService;
  let userSession: UserSessionService;
  let router: jasmine.SpyObj<Router>;

  const customer = (customerStatus: string) => ({id: 'c1', firstName: 'Ada', customerStatus} as CustomerDTO);
  const asAdvisor = () => userSession.setProfile({id: 'u1', userBranchRoles: [{role: 'ADVISOR'}]} as any);

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);
    TestBed.configureTestingModule({providers: [{provide: Router, useValue: router}]});
    service = TestBed.inject(WorkspaceContextService);
    customerSession = TestBed.inject(CustomerSessionService);
    userSession = TestBed.inject(UserSessionService);
    userSession.clear();
  });

  afterEach(() => {
    customerSession.setCustomer(null);
    userSession.clear();
  });

  it('keeps an advisor on an onboarded client and goes to the client home', async () => {
    asAdvisor();
    customerSession.setCustomer(customer('ACTIVE'));
    await service.exitOnboarding();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/home');
    expect(customerSession.customer()?.id).toBe('c1');
  });

  it('takes an advisor out of a client that is still onboarding', async () => {
    asAdvisor();
    customerSession.setCustomer(customer('DRAFT'));
    await service.exitOnboarding();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/advisor');
    expect(customerSession.customer()).toBeNull();
  });

  it('sends a customer still onboarding to the profile list', async () => {
    customerSession.setCustomer(customer('DRAFT'));
    await service.exitOnboarding();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding/disambiguation');
  });

  it('sends an onboarded customer home', async () => {
    customerSession.setCustomer(customer('ACTIVE'));
    await service.exitOnboarding();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/home');
  });
});
