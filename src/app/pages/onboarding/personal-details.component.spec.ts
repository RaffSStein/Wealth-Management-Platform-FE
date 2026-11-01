import {HttpErrorResponse} from '@angular/common/http';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {UserService} from '../../api/user-service';
import {CustomerDTO, CustomerService} from '../../api/customer-service';
import {CustomerSelectionService} from '../../core/services/customer-selection.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {OnboardingFormStateService} from '../../core/services/onboarding-form-state.service';
import {OnboardingProgressService} from '../../core/services/onboarding-progress.service';
import {OwnCustomerService} from '../../core/services/own-customer.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {WorkspaceContextService} from '../../core/services/workspace-context.service';
import {ToastService} from '../../shared/services/toast.service';
import {PersonalDetailsComponent} from './personal-details.component';

describe('PersonalDetailsComponent, advisor with a new client', () => {
  const VALID = {taxId: 'T1', firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01', phoneNumber: '+39 1',
    email: 'Client@Bank.com', emailConfirm: 'client@bank.com'};
  let customer: ReturnType<typeof signal<CustomerDTO | null>>;
  let initCustomer: jasmine.Spy;
  let lookup: jasmine.Spy;

  function create(): PersonalDetailsComponent {
    const comp = TestBed.createComponent(PersonalDetailsComponent).componentInstance;
    comp.form.patchValue(VALID);
    return comp;
  }

  beforeEach(() => {
    customer = signal<CustomerDTO | null>(null);
    initCustomer = jasmine.createSpy().and.callFake(() => of({id: 'c1', customerStatus: 'DRAFT'} as CustomerDTO));
    lookup = jasmine.createSpy().and.returnValue(of({firstName: 'Ada', lastName: 'Rossi'}));
    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: {navigateByUrl: jasmine.createSpy().and.resolveTo(true)}},
        {provide: CustomerService, useValue: {initCustomer}},
        {provide: UserService, useValue: {lookupUserByEmail: lookup}},
        {provide: CustomerSessionService, useValue: {customer, setCustomer: (c: CustomerDTO | null) => customer.set(c)}},
        {provide: UserSessionService, useValue: {isAdvisor: () => true, profile: () => ({id: 'adv', email: 'me@bank.com'})}},
        {provide: OnboardingFormStateService, useValue: {load: () => null, save: () => undefined, clear: () => undefined}},
        {provide: OnboardingProgressService, useValue: {pathFor: () => '/next', markPersonalDetailsSubmitted: () => undefined}},
        {provide: WorkspaceContextService, useValue: {}},
        {provide: ToastService, useValue: {info: () => undefined, success: () => undefined}},
        {provide: OwnCustomerService, useValue: {ensureLoaded: () => Promise.resolve()}},
        {provide: CustomerSelectionService, useValue: {open: () => Promise.resolve()}}
      ]
    });
    TestBed.overrideComponent(PersonalDetailsComponent, {set: {template: '', imports: []}});
  });

  it('requires the phone and matching addresses', async () => {
    const comp = create();
    comp.form.patchValue({phoneNumber: ''});
    await comp.onSubmit();
    comp.form.patchValue({phoneNumber: '+39 1', emailConfirm: 'other@bank.com'});
    await comp.onSubmit();
    expect(lookup).not.toHaveBeenCalled();
    expect(initCustomer).not.toHaveBeenCalled();
  });

  it('shows the check first, then sends the email and no userId', async () => {
    const comp = create();
    await comp.onSubmit();
    expect(lookup).toHaveBeenCalledWith('client@bank.com');
    expect(comp['emailCheck']()).toEqual(jasmine.objectContaining({outcome: 'found', name: 'Ada Rossi'}));
    expect(initCustomer).not.toHaveBeenCalled();

    await comp.onSubmit();
    const dto = initCustomer.calls.mostRecent().args[0];
    expect(dto.email).toBe('Client@Bank.com');
    expect(dto.phoneNumber).toBe('+39 1');
    expect('userId' in dto).toBeFalse();
  });

  it('forgets the check when the address changes', async () => {
    const comp = create();
    await comp['checkEmail']();
    comp.form.patchValue({email: 'new@bank.com', emailConfirm: 'new@bank.com'});
    expect(comp['emailCheck']()).toBeNull();
  });

  it('tells apart no client from a check that failed, and lets both continue', async () => {
    lookup.and.returnValue(throwError(() => new HttpErrorResponse({status: 404})));
    const comp = create();
    await comp['checkEmail']();
    expect(comp['emailCheck']()?.outcome).toBe('not-found');

    comp.form.patchValue({email: 'b@bank.com', emailConfirm: 'b@bank.com'});
    lookup.and.returnValue(throwError(() => new HttpErrorResponse({status: 503})));
    await comp['checkEmail']();
    expect(comp['emailCheck']()?.outcome).toBe('unavailable');
    await comp.onSubmit();
    expect(initCustomer).toHaveBeenCalled();
  });

  it('refuses the advisor\'s own email without asking the BE', async () => {
    const comp = create();
    comp.form.patchValue({email: 'ME@bank.com', emailConfirm: 'me@bank.com'});
    await comp.onSubmit();
    await comp.onSubmit();
    expect(lookup).not.toHaveBeenCalled();
    expect(initCustomer).not.toHaveBeenCalled();
  });

  it('shows a conflict inline, with no resume', async () => {
    initCustomer.and.returnValue(throwError(() => new HttpErrorResponse({status: 409, error: {errorCode: 'CUSTOMER_ALREADY_EXISTS'}})));
    const comp = create();
    await comp['checkEmail']();
    await comp.onSubmit();
    expect(comp['errorMsg']()).toContain('already belongs to a client');
  });
});

describe('PersonalDetailsComponent, customer that already has a record', () => {
  const conflict = () => throwError(() => new HttpErrorResponse({status: 409}));
  let customer: ReturnType<typeof signal<CustomerDTO | null>>;
  let open: jasmine.Spy;
  let ensureLoaded: jasmine.Spy;
  let navigateByUrl: jasmine.Spy;

  function create(): PersonalDetailsComponent {
    const comp = TestBed.createComponent(PersonalDetailsComponent).componentInstance;
    comp.form.patchValue({taxId: 'T1', firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01'});
    return comp;
  }

  beforeEach(() => {
    customer = signal<CustomerDTO | null>(null);
    open = jasmine.createSpy().and.resolveTo();
    ensureLoaded = jasmine.createSpy().and.callFake(async () => customer.set({id: 'own'} as CustomerDTO));
    navigateByUrl = jasmine.createSpy().and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        {provide: Router, useValue: {navigateByUrl}},
        {provide: CustomerService, useValue: {initCustomer: conflict}},
        {provide: CustomerSessionService, useValue: {customer, setCustomer: (c: CustomerDTO | null) => customer.set(c)}},
        {provide: UserSessionService, useValue: {isAdvisor: () => false, profile: () => ({id: 'u1'})}},
        {provide: UserService, useValue: {}},
        {provide: OnboardingFormStateService, useValue: {load: () => null, save: () => undefined, clear: () => undefined}},
        {provide: OnboardingProgressService, useValue: {pathFor: () => '/next', markPersonalDetailsSubmitted: () => undefined}},
        {provide: WorkspaceContextService, useValue: {}},
        {provide: ToastService, useValue: {info: () => undefined, success: () => undefined}},
        {provide: OwnCustomerService, useValue: {ensureLoaded}},
        {provide: CustomerSelectionService, useValue: {open}}
      ]
    });
    TestBed.overrideComponent(PersonalDetailsComponent, {set: {template: '', imports: []}});
  });

  it('continues from the existing record on 409, without moving on to the next step', async () => {
    await create().onSubmit();
    expect(ensureLoaded).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith('own');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('resumes a record an advisor already took further, returned by init', async () => {
    TestBed.overrideProvider(CustomerService, {useValue: {initCustomer: () => of({id: 'linked', customerStatus: 'ACTIVE'} as CustomerDTO)}});
    await create().onSubmit();
    expect(open).toHaveBeenCalledWith('linked');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('shows an error when the existing record can not be loaded', async () => {
    ensureLoaded.and.resolveTo();
    const comp = create();
    await comp.onSubmit();
    expect(open).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(comp['errorMsg']()).toContain('Unable to save');
  });
});
