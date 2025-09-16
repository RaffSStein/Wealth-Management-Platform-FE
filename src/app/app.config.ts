import {ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {provideHttpClient, withInterceptors, withFetch} from '@angular/common/http';
// BE services
import {provideApi as provideUserApi} from './api/user-service';
import {provideApi as provideCustomerApi} from './api/customer-service';
import {provideApi as provideDocumentApi} from './api/document-service';
import {provideApi as provideBankApi} from './api/bank-service';
// interceptor which adds auth token to requests
import {authInterceptor} from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    provideUserApi('/user-service'),
    provideCustomerApi('/customer-service'),
    provideDocumentApi('/document-service'),
    provideBankApi('/bank-service')
  ]
};
