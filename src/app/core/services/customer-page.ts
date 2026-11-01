import {signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {CustomerService, CustomerStatus, CustomerSummaryDTO} from '../../api/customer-service';

/**
 * One server-paged view of GET /customer, the customers the caller can reach (for an advisor: the bank and branch of
 * its token), sorted by name by default. A response that a newer load has overtaken is dropped.
 */
export class CustomerPage {
  readonly rows = signal<CustomerSummaryDTO[]>([]);
  readonly total = signal(0);
  /** Index of the first row, as the table's paginator counts it. */
  readonly first = signal(0);
  readonly loading = signal(false);
  readonly failed = signal(false);

  private latest = 0;

  constructor(
    private readonly api: CustomerService,
    readonly size: number,
    private readonly statuses?: CustomerStatus[]
  ) {}

  async load(first = 0, query?: string): Promise<void> {
    const request = ++this.latest;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = Math.floor(first / this.size);
      const result = await firstValueFrom(this.api.getCustomers(page, this.size, undefined, query || undefined, this.statuses));
      if (request !== this.latest) return;
      this.rows.set(result?.content ?? []);
      this.total.set(result?.page?.totalElements ?? 0);
      this.first.set(first);
    } catch {
      if (request === this.latest) this.failed.set(true);
    } finally {
      if (request === this.latest) this.loading.set(false);
    }
  }
}
