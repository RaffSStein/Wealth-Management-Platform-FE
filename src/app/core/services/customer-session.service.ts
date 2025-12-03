import {Injectable, computed, signal, inject} from '@angular/core';
import {CustomerService, CustomerDTO} from '../../api/customer-service';
import {firstValueFrom} from 'rxjs';

@Injectable({providedIn: 'root'})
export class CustomerSessionService {
  private static readonly STORAGE_KEY = 'wm.customer.profile';

  private readonly api = inject(CustomerService);

  private readonly _customer = signal<CustomerDTO | null>(this.readFromSession());
  readonly customer = computed(() => this._customer());

  async ensureLoadedByCustomerId(customerId: string, forceReload = false): Promise<CustomerDTO | null> {
    const cached = this._customer();
    if (cached && !forceReload) return cached;
    try {
      const dto = await firstValueFrom(this.api.getCustomerById(customerId));
      this.setCustomer(dto ?? null);
      return dto ?? null;
    } catch {
      this.setCustomer(null);
      return null;
    }
  }

  setCustomer(value: CustomerDTO | null) {
    this._customer.set(value);
    try {
      if (value) sessionStorage.setItem(CustomerSessionService.STORAGE_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(CustomerSessionService.STORAGE_KEY);
    } catch {}
  }

  private readFromSession(): CustomerDTO | null {
    try {
      const raw = sessionStorage.getItem(CustomerSessionService.STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CustomerDTO) : null;
    } catch { return null; }
  }
}
