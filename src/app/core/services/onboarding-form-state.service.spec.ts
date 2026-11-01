import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {CustomerDTO} from '../../api/customer-service';
import {ActiveBranch} from './role-assignment';
import {CustomerSessionService} from './customer-session.service';
import {OnboardingFormStateService} from './onboarding-form-state.service';
import {UserSessionService} from './user-session.service';

describe('OnboardingFormStateService', () => {
  const branch = signal<ActiveBranch | null>({bankCode: 'BANK_A', branchCode: 'BR_01'});
  const customer = signal<CustomerDTO | null>(null);
  let state: OnboardingFormStateService;

  beforeEach(() => {
    sessionStorage.clear();
    branch.set({bankCode: 'BANK_A', branchCode: 'BR_01'});
    customer.set(null);
    TestBed.configureTestingModule({
      providers: [
        {provide: CustomerSessionService, useValue: {customer}},
        {provide: UserSessionService, useValue: {activeBranch: branch}}
      ]
    });
    state = TestBed.inject(OnboardingFormStateService);
  });

  afterEach(() => sessionStorage.clear());

  it('keeps a new customer draft in its branch', () => {
    state.save('personal-details', {taxId: 'A'});
    expect(state.load('personal-details')).toEqual({taxId: 'A'});

    branch.set({bankCode: 'BANK_A', branchCode: 'BR_02'});
    expect(state.load('personal-details')).toBeNull();

    branch.set({bankCode: 'BANK_A', branchCode: 'BR_01'});
    expect(state.load('personal-details')).toEqual({taxId: 'A'});
  });

  it('keeps a customer draft apart from the new customer draft', () => {
    state.save('personal-details', {taxId: 'new'});
    customer.set({id: 'c1'} as CustomerDTO);
    expect(state.load('personal-details')).toBeNull();
    state.save('personal-details', {taxId: 'c1'});
    state.clear('personal-details');
    expect(state.load('personal-details')).toBeNull();

    customer.set(null);
    expect(state.load('personal-details')).toEqual({taxId: 'new'});
  });
});
