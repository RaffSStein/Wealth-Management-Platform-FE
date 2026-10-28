import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  // Matches ToastService.fadeDurationMs: a toast is marked `closing` first, then removed after the fade
  const FADE_MS = 300;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ToastService] });
    service = TestBed.inject(ToastService);
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should auto-dismiss a toast after default duration', () => {
    service.info('Hello');
    expect(service.items().length).toBe(1);
    // default duration is 10s, then the fade-out
    jasmine.clock().tick(10000);
    expect(service.items()[0].closing).toBeTrue();
    jasmine.clock().tick(FADE_MS);
    expect(service.items().length).toBe(0);
  });

  it('should respect custom duration', () => {
    service.success('Keep longer', 2000);
    expect(service.items().length).toBe(1);
    jasmine.clock().tick(1500);
    expect(service.items()[0].closing).toBeFalse();
    jasmine.clock().tick(500);
    expect(service.items()[0].closing).toBeTrue();
    jasmine.clock().tick(FADE_MS);
    expect(service.items().length).toBe(0);
  });
});
