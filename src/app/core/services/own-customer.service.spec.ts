import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {CustomerDTO, CustomerService} from '../../api/customer-service';
import {CustomerSessionService} from './customer-session.service';
import {OwnCustomerService, pickOwnCustomer} from './own-customer.service';
import {UserSessionService} from './user-session.service';

const record = (id: string, customerStatus: string, userId = 'u1') => ({id, customerStatus, userId}) as unknown as CustomerDTO;

describe('pickOwnCustomer', () => {
  it('prefers the record that got furthest, and ignores deleted ones', () => {
    expect(pickOwnCustomer([record('a', 'DRAFT'), record('b', 'ACTIVE')])?.id).toBe('b');
    expect(pickOwnCustomer([record('a', 'REJECTED'), record('b', 'DRAFT')])?.id).toBe('b');
    expect(pickOwnCustomer([record('a', 'DELETED')])).toBeNull();
    expect(pickOwnCustomer([])).toBeNull();
  });
});

describe('OwnCustomerService', () => {
  let api: {getCustomersByUserId: jasmine.Spy};
  let session: {customer: ReturnType<typeof signal<CustomerDTO | null>>; setCustomer: (c: CustomerDTO | null) => void};
  let isAdvisor: ReturnType<typeof signal<boolean>>;
  let service: OwnCustomerService;

  beforeEach(() => {
    api = {getCustomersByUserId: jasmine.createSpy().and.returnValue(of([record('c1', 'ACTIVE')]))};
    const customer = signal<CustomerDTO | null>(null);
    session = {customer, setCustomer: c => customer.set(c)};
    isAdvisor = signal(false);
    TestBed.configureTestingModule({
      providers: [
        {provide: CustomerService, useValue: api},
        {provide: CustomerSessionService, useValue: session},
        {provide: UserSessionService, useValue: {isAdvisor, isAdmin: signal(false), ensureLoaded: () => Promise.resolve({id: 'u1'})}}
      ]
    });
    service = TestBed.inject(OwnCustomerService);
  });

  it('selects the customer of a customer user', async () => {
    await service.ensureLoaded();
    expect(api.getCustomersByUserId).toHaveBeenCalledWith('u1');
    expect(session.customer()?.id).toBe('c1');
    expect(service.load()).toBe('loaded');
  });

  it('keeps the record already selected when it is the user\'s own', async () => {
    session.setCustomer(record('c9', 'DRAFT'));
    await service.ensureLoaded();
    expect(api.getCustomersByUserId).not.toHaveBeenCalled();
    expect(session.customer()?.id).toBe('c9');
  });

  it('replaces a record that belongs to somebody else', async () => {
    session.setCustomer(record('other', 'ACTIVE', 'u2'));
    await service.ensureLoaded();
    expect(session.customer()?.id).toBe('c1');
  });

  it('leaves no customer when the user has none yet', async () => {
    api.getCustomersByUserId.and.returnValue(of([]));
    await service.ensureLoaded();
    expect(session.customer()).toBeNull();
    expect(service.load()).toBe('loaded');
  });

  it('reports a failed load instead of treating it as no customer', async () => {
    api.getCustomersByUserId.and.returnValue(throwError(() => new Error('down')));
    await service.ensureLoaded();
    expect(session.customer()).toBeNull();
    expect(service.load()).toBe('failed');
  });

  it('never touches the working customer of an advisor', async () => {
    isAdvisor.set(true);
    session.setCustomer(record('client', 'ACTIVE', 'u2'));
    await service.ensureLoaded();
    expect(api.getCustomersByUserId).not.toHaveBeenCalled();
    expect(session.customer()?.id).toBe('client');
  });
});
