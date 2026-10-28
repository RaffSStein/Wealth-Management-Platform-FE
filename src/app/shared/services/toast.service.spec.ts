import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let messages: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MessageService] });
    service = TestBed.inject(ToastService);
    messages = TestBed.inject(MessageService);
  });

  it('should forward toasts to PrimeNG with the default duration', () => {
    const add = spyOn(messages, 'add');
    service.info('Hello');
    expect(add).toHaveBeenCalledWith({ severity: 'info', detail: 'Hello', life: 10000 });
  });

  it('should map warning to the PrimeNG "warn" severity and respect custom durations', () => {
    const add = spyOn(messages, 'add');
    service.warning('Careful', 2000);
    expect(add).toHaveBeenCalledWith({ severity: 'warn', detail: 'Careful', life: 2000 });
  });

  it('should clear all toasts', () => {
    const clear = spyOn(messages, 'clear');
    service.clear();
    expect(clear).toHaveBeenCalled();
  });
});
