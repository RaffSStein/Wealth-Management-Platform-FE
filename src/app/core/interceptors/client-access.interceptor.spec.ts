import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {WorkspaceContextService} from '../services/workspace-context.service';
import {ToastService} from '../../shared/services/toast.service';
import {clientAccessInterceptor} from './client-access.interceptor';

describe('clientAccessInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  let workspace: {actingAsClient: jasmine.Spy; clientId: jasmine.Spy; exitClient: jasmine.Spy};

  const fail = (url: string, status = 404) => {
    http.get(url).subscribe({error: () => undefined});
    backend.expectOne(url).flush({}, {status, statusText: 'x'});
  };

  beforeEach(() => {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['warning']);
    workspace = {
      actingAsClient: jasmine.createSpy().and.returnValue(true),
      clientId: jasmine.createSpy().and.returnValue('c1'),
      exitClient: jasmine.createSpy().and.resolveTo()
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([clientAccessInterceptor])),
        provideHttpClientTesting(),
        {provide: WorkspaceContextService, useValue: workspace},
        {provide: ToastService, useValue: toast}
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('leaves the client when its record answers 404', () => {
    fail('/customer-service/customer/c1');
    expect(workspace.exitClient).toHaveBeenCalledTimes(1);
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  it('leaves the client when a save on its record answers 404', () => {
    fail('/customer-service/customer/c1/goals');
    expect(workspace.exitClient).toHaveBeenCalledTimes(1);
  });

  it('keeps the client when a resource under it answers 404', () => {
    fail('/customer-service/customer/c1/mifid/current');
    fail('/customer-service/customer/c1/mifid/7');
    expect(workspace.exitClient).not.toHaveBeenCalled();
  });

  it('keeps the selection when another customer answers 404', () => {
    fail('/customer-service/customer/c2');
    expect(workspace.exitClient).not.toHaveBeenCalled();
  });

  it('keeps the selection on other errors', () => {
    fail('/customer-service/customer/c1', 403);
    fail('/customer-service/customer/c1', 500);
    expect(workspace.exitClient).not.toHaveBeenCalled();
  });

  it('does nothing when not acting for a client', () => {
    workspace.actingAsClient.and.returnValue(false);
    fail('/customer-service/customer/c1');
    expect(workspace.exitClient).not.toHaveBeenCalled();
  });
});
