import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ToastService] });
    service = TestBed.inject(ToastService);
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should auto-dismiss a toast after default duration', () => {
    const id = service.info('Hello');
    expect(service.items().length).toBe(1);
    // advance time by 10s
    jasmine.clock().tick(10000);
    expect(service.items().length).toBe(0);
  });

  it('should respect custom duration', () => {
    const id = service.success('Keep longer', 2000);
    expect(service.items().length).toBe(1);
    jasmine.clock().tick(1500);
    expect(service.items().length).toBe(1);
    jasmine.clock().tick(500);
    expect(service.items().length).toBe(0);
  });
});

