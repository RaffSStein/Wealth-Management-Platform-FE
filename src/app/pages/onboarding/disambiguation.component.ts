import {Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {Subject, debounceTime} from 'rxjs';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {TableLazyLoadEvent, TableModule} from 'primeng/table';
import {Tag} from 'primeng/tag';
import {CustomerService, CustomerSummaryDTO} from '../../api/customer-service';
import {CustomerSelectionService} from '../../core/services/customer-selection.service';
import {CustomerPage} from '../../core/services/customer-page';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {OnboardingProgressService} from '../../core/services/onboarding-progress.service';
import {busyAction} from '../../core/services/busy-action';
import {OnboardingFormStateService} from '../../core/services/onboarding-form-state.service';
import {ToastService} from '../../shared/services/toast.service';

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;

/**
 * Customer selection, for advisors only (roleGuard): they pick the client to act for, or onboard a new one.
 * The list holds the customers of the advisor's active branch, paged and searched by the BE.
 * Draft customers resume onboarding at their first incomplete step.
 */
@Component({
  selector: 'app-customer-disambiguation',
  imports: [Button, InputText, Message, TableModule, Tag],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>Select a client</h1>
          <p>Pick the client you want to work on, or onboard a new one.</p>
        </div>
        <p-button label="Onboard new client" [loading]="startNewCustomerOnboarding.pending()"
                  (onClick)="startNewCustomerOnboarding()"/>
      </header>

      @if (clients.failed()) {
        <p-message severity="error">The client list could not be loaded. Reload the page to try again.</p-message>
      } @else {
        <div class="wmp-panel">
          <label class="search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <span class="wmp-sr-only">Search clients</span>
            <input pInputText type="search" placeholder="Search by name or tax ID" [value]="query()"
                   (input)="search($any($event.target).value)"/>
          </label>

          <p-table [value]="clients.rows()" [lazy]="true" (onLazyLoad)="page($event)" [loading]="clients.loading()"
                   [paginator]="clients.total() > clients.size" [rows]="clients.size" [totalRecords]="clients.total()"
                   [first]="clients.first()" [tableStyle]="{'min-width': '40rem'}" dataKey="id">
            <ng-template #header>
              <tr>
                <th>Name</th>
                <th>Tax ID</th>
                <th>Type</th>
                <th>Status</th>
                <th><span class="wmp-sr-only">Actions</span></th>
              </tr>
            </ng-template>
            <ng-template #body let-row>
              <tr>
                <td class="name">{{ displayName(row) }}</td>
                <td class="num">{{ row.taxId }}</td>
                <td class="muted">{{ typeLabel(row.customerType) }}</td>
                <td><p-tag [value]="statusLabel(row.customerStatus)" [severity]="statusSeverity(row.customerStatus)"/></td>
                <td class="actions">
                  <p-button [label]="row.customerStatus === 'DRAFT' ? 'Continue onboarding' : 'Open'" size="small"
                            [outlined]="true" [loading]="openingId() === row.id" (onClick)="select(row)"/>
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="5" class="empty">{{ query() ? 'No clients match your search.' : 'No clients yet.' }}</td></tr>
            </ng-template>
          </p-table>
        </div>
      }
    </section>
  `,
  styles: [`
    .page { padding: 1.5rem; display: grid; gap: 1.25rem; max-width: 1200px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
    .head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; }
    .head p { margin: .35rem 0 0; color: var(--wmp-text-muted); }
    .search { position: relative; display: flex; align-items: center; max-width: 24rem; color: var(--wmp-text-muted); }
    .search .material-symbols-outlined { position: absolute; left: .65rem; font-size: 18px; pointer-events: none; }
    .search input { width: 100%; padding-left: 2.1rem; }
    .name { font-weight: 500; }
    .muted { color: var(--wmp-text-muted); }
    .actions { text-align: right; }
    .empty { text-align: center; color: var(--wmp-text-muted); padding: 2rem 1rem; }
  `]
})
export class CustomerDisambiguationComponent {
  private readonly router = inject(Router);
  private readonly customerApi = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly selection = inject(CustomerSelectionService);
  private readonly progress = inject(OnboardingProgressService);
  private readonly formState = inject(OnboardingFormStateService);

  protected readonly clients = new CustomerPage(this.customerApi, PAGE_SIZE);
  protected readonly openingId = signal<string | null>(null);
  protected readonly query = signal('');
  private readonly searches = new Subject<void>();

  constructor() {
    this.searches.pipe(debounceTime(SEARCH_DELAY_MS), takeUntilDestroyed()).subscribe(() => void this.clients.load(0, this.term()));
    void this.clients.load();
  }

  private term(): string {
    return this.query().trim();
  }

  protected search(value: string): void {
    this.query.set(value);
    this.searches.next();
  }

  protected page(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    if (first !== this.clients.first()) void this.clients.load(first, this.term());
  }

  protected displayName(c: CustomerSummaryDTO): string {
    const person = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
    return person || c.companyName || 'Unnamed customer';
  }

  protected typeLabel(type?: string): string {
    return type ? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ') : '—';
  }

  protected statusLabel(status?: string): string {
    return status === 'DRAFT' ? 'Onboarding' : this.typeLabel(status);
  }

  protected statusSeverity(status?: string): 'success' | 'warn' | 'info' | 'secondary' | 'danger' {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'DRAFT': return 'warn';
      case 'PENDING_VERIFICATION': return 'info';
      case 'REJECTED': return 'danger';
      default: return 'secondary';
    }
  }

  async select(row: CustomerSummaryDTO): Promise<void> {
    // One customer at a time: ignore clicks on other rows while one is opening
    if (!row.id || this.openingId()) return;
    this.openingId.set(row.id);
    try {
      await this.selection.open(row.id);
    } catch {
      this.toast.error('Unable to open the selected client.');
    } finally {
      this.openingId.set(null);
    }
  }

  readonly startNewCustomerOnboarding = busyAction(async () => {
    // A brand-new onboarding: reset local progress and drop any previously selected customer
    this.progress.reset();
    this.customerSession.setCustomer(null);
    // Start from a blank form, not the draft of a previous new-customer attempt
    this.formState.clear('personal-details');
    await this.router.navigateByUrl('/onboarding/personal-details');
  });
}
