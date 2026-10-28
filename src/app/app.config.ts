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
// UI library + theme
import {providePrimeNG} from 'primeng/config';
import {LedgerPreset} from './theme/ledger.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    providePrimeNG({
      theme: {
        preset: LedgerPreset,
        options: {
          darkModeSelector: '.wmp-dark',
          // PrimeNG styles go in their own layer, above our global resets and legacy element styles
          // (order declared in styles.scss), so unlayered/legacy rules never override components.
          cssLayer: {name: 'primeng', order: 'wmp-reset, wmp-legacy, primeng'}
        }
      }
    }),
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
