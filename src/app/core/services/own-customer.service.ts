import {Injectable, inject, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {CustomerDTO, CustomerService} from '../../api/customer-service';
import {CustomerSessionService} from './customer-session.service';
import {UserSessionService} from './user-session.service';

export type OwnCustomerLoad = 'idle' | 'loaded' | 'failed';

// Most advanced first: a user with several records in a bank (older data) works on the one that got furthest
const STATUS_ORDER = ['ACTIVE', 'PENDING_VERIFICATION', 'DRAFT', 'REJECTED', 'CLOSED'];

/** The record a customer user works on: DELETED ones never count. Null when the user has none in this bank yet. */
export function pickOwnCustomer(customers: readonly CustomerDTO[]): CustomerDTO | null {
  const rank = (c: CustomerDTO) => STATUS_ORDER.indexOf(c.customerStatus ?? '');
  return customers
    .filter(c => rank(c) >= 0)
    .reduce<CustomerDTO | null>((best, c) => !best || rank(c) < rank(best) ? c : best, null);
}

/**
 * Customer users have exactly one working customer: their own, set automatically. Only advisors choose a customer
 * (customer selection), so a customer never sees a list and never holds somebody else's record.
 */
@Injectable({providedIn: 'root'})
export class OwnCustomerService {
  private readonly api = inject(CustomerService);
  private readonly userSession = inject(UserSessionService);
  private readonly customerSession = inject(CustomerSessionService);

  private readonly _load = signal<OwnCustomerLoad>('idle');
  /** `failed`: unknown whether the user has a customer, which is not the same as having none. */
  readonly load = this._load.asReadonly();

  async ensureLoaded(): Promise<void> {
    if (this.userSession.isAdvisor() || this.userSession.isAdmin()) return;
    try {
      const userId = (await this.userSession.ensureLoaded())?.id;
      if (!userId) throw new Error('no user');
      if (this.customerSession.customer()?.userId !== userId) {
        this.customerSession.setCustomer(pickOwnCustomer(await firstValueFrom(this.api.getCustomersByUserId(userId))));
      }
      this._load.set('loaded');
    } catch {
      this.customerSession.setCustomer(null);
      this._load.set('failed');
    }
  }
}
