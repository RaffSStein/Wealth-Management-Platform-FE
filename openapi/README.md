# OpenAPI specs (BE → FE)

Metti qui i file YAML forniti dal backend per generare modelli e client Angular tipizzati.

Esempi di nomi file attesi dagli script npm:
- customer-service.yaml
- document-service.yaml

Comandi utili (dal root del progetto):
- npm install   # installa dipendenze, incluso il generatore
- npm run openapi:gen:customer   # genera client per customer-service.yaml
- npm run openapi:gen:document   # genera client per document-service.yaml
- npm run openapi:gen:all        # genera tutti

Output generato:
- src/app/api/customer-service
- src/app/api/document-service

Dopo la generazione, configura i BASE_PATH in app.config.ts coerenti con il proxy:

import { provideHttpClient } from '@angular/common/http';
import { BASE_PATH as CUSTOMER_BASE_PATH } from './api/customer-service';
import { BASE_PATH as DOCUMENT_BASE_PATH } from './api/document-service';

export const appConfig = {
  providers: [
    provideHttpClient(),
    { provide: CUSTOMER_BASE_PATH, useValue: '/customer-service' },
    { provide: DOCUMENT_BASE_PATH, useValue: '/document-service' },
  ]
};

Uso in un component (esempio):

import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CustomerService, CustomerDTO } from '../api/customer-service';

@Component({ selector: 'demo', template: '' })
export class DemoComponent {
  private customerApi = inject(CustomerService);

  async createCustomer() {
    const payload: CustomerDTO = {
      // compila i campi richiesti dal tuo schema CustomerDTO
    };
    const res = await firstValueFrom(
      this.customerApi.initCustomer({ body: payload }) // operationId: initCustomer
    );
    console.log(res);
  }
}

Note:
- Assicurati che proxy.conf.js mappi /customer-service e /document-service verso i backend locali.
- Rigenera i client ogni volta che gli YAML cambiano.

