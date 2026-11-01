import {HttpErrorResponse} from '@angular/common/http';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {throwError} from 'rxjs';
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
        {provide: UserSessionService, useValue: {profile: () => ({id: 'u1'})}},
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

  it('shows an error when the existing record can not be loaded', async () => {
    ensureLoaded.and.resolveTo();
    const comp = create();
    await comp.onSubmit();
    expect(open).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(comp['errorMsg']()).toContain('Unable to save');
  });
});
