import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { LOADING_MIN_VISIBLE_MS, LOADING_SHOW_DELAY_MS, LoadingIndicatorService } from './loading-indicator.service';
import { loadingInterceptor } from '../interceptors/loading.interceptor';
import { BACKGROUND_REQUEST } from '../interceptors/loading.context';

describe('LoadingIndicatorService', () => {
  let service: LoadingIndicatorService;
  let events: Subject<unknown>;
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    events = new Subject();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events } },
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(LoadingIndicatorService);
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('stays hidden for actions faster than the show delay', fakeAsync(() => {
    events.next(new NavigationStart(1, '/a'));
    tick(LOADING_SHOW_DELAY_MS - 1);
    events.next(new NavigationEnd(1, '/a', '/a'));
    tick(LOADING_MIN_VISIBLE_MS);
    expect(service.visible()).toBeFalse();
  }));

  it('shows during a slow navigation and keeps the minimum visible time', fakeAsync(() => {
    events.next(new NavigationStart(1, '/a'));
    tick(LOADING_SHOW_DELAY_MS);
    expect(service.visible()).toBeTrue();
    events.next(new NavigationEnd(1, '/a', '/a'));
    tick(LOADING_MIN_VISIBLE_MS - 1);
    expect(service.visible()).toBeTrue();
    tick(1);
    expect(service.visible()).toBeFalse();
  }));

  it('tracks foreground requests until they settle, including errors', fakeAsync(() => {
    http.get('/customer-service/a').subscribe({ error: () => undefined });
    http.get('/customer-service/b').subscribe();
    expect(service.busy()).toBeTrue();
    backend.expectOne('/customer-service/a').flush('x', { status: 500, statusText: 'Error' });
    expect(service.busy()).toBeTrue();
    backend.expectOne('/customer-service/b').flush({});
    expect(service.busy()).toBeFalse();
    tick(LOADING_MIN_VISIBLE_MS);
  }));

  it('ignores background requests', () => {
    http.get('/customer-service/poll', { context: new HttpContext().set(BACKGROUND_REQUEST, true) }).subscribe();
    expect(service.busy()).toBeFalse();
    backend.expectOne('/customer-service/poll').flush({});
  });
});
