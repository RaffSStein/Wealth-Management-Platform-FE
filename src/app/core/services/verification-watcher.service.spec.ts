import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CustomerDTO, CustomerService } from '../../api/customer-service';
import { AuthService } from './auth.service';
import { CustomerSessionService } from './customer-session.service';
import { NotificationService } from './notification.service';
import { ToastService } from '../../shared/services/toast.service';
import { VERIFICATION_SLOW_AFTER_MS, VerificationWatcherService } from './verification-watcher.service';

describe('VerificationWatcherService', () => {
  let statuses: (string | Error)[];
  let notifications: jasmine.SpyObj<NotificationService>;
  let toast: jasmine.SpyObj<ToastService>;
  let token: string | null;
  let watcher: VerificationWatcherService;

  beforeEach(() => {
    statuses = [];
    token = 'jwt';
    notifications = jasmine.createSpyObj('NotificationService', ['add']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    const api = {
      getCustomerById: (id: string) => {
        const next = statuses.length > 1 ? statuses.shift()! : statuses[0];
        return next instanceof Error
          ? throwError(() => next)
          : of({id, firstName: 'Ada', lastName: 'Rossi', customerStatus: next} as CustomerDTO);
      }
    };
    TestBed.configureTestingModule({
      providers: [
        {provide: CustomerService, useValue: api},
        {provide: AuthService, useValue: {token: () => token}},
        {provide: CustomerSessionService, useValue: {customer: () => null, setCustomer: () => undefined}},
        {provide: NotificationService, useValue: notifications},
        {provide: ToastService, useValue: toast},
        {provide: Router, useValue: {url: '/app/home'}}
      ]
    });
    watcher = TestBed.inject(VerificationWatcherService);
  });

  it('follows a pending verification to its outcome and notifies once', fakeAsync(() => {
    statuses = ['PENDING_VERIFICATION', new Error('blip'), 'ACTIVE'];
    watcher.watch('c1');
    tick();
    expect(watcher.stateFor('c1')).toBe('pending');
    tick(1500);
    expect(watcher.stateFor('c1')).toBe('pending');
    tick(1500);
    expect(watcher.stateFor('c1')).toBe('active');
    expect(notifications.add).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledTimes(1);
  }));

  it('reports a rejection', fakeAsync(() => {
    statuses = ['PENDING_VERIFICATION', 'REJECTED'];
    watcher.watch('c1');
    tick(1500);
    expect(watcher.stateFor('c1')).toBe('rejected');
    expect(toast.error).toHaveBeenCalled();
  }));

  it('does not notify for a customer that was already verified', fakeAsync(() => {
    statuses = ['ACTIVE'];
    watcher.watch('c1');
    tick();
    expect(watcher.stateFor('c1')).toBe('active');
    expect(notifications.add).not.toHaveBeenCalled();
  }));

  it('turns slow after the fast window and keeps checking', fakeAsync(() => {
    statuses = ['PENDING_VERIFICATION'];
    watcher.watch('c1');
    tick(VERIFICATION_SLOW_AFTER_MS + 1500);
    expect(watcher.stateFor('c1')).toBe('slow');
    token = null; // sign out stops the watch
    flush();
  }));

  it('ignores a DRAFT unless it was just submitted', fakeAsync(() => {
    statuses = ['DRAFT'];
    watcher.watch('c1');
    tick();
    expect(watcher.stateFor('c1')).toBeNull();
    watcher.watch('c2', {justSubmitted: true});
    tick();
    expect(watcher.stateFor('c2')).toBe('pending');
    token = null;
    flush();
  }));

  it('checkNow wakes a running watch immediately', fakeAsync(() => {
    statuses = ['PENDING_VERIFICATION', 'ACTIVE'];
    watcher.watch('c1');
    tick();
    watcher.checkNow('c1');
    tick();
    expect(watcher.stateFor('c1')).toBe('active');
  }));
});
