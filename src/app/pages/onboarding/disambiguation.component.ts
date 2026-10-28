import {Component, computed, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {Message} from 'primeng/message';
import {TableModule} from 'primeng/table';
import {Tag} from 'primeng/tag';
import {CustomerDTO, CustomerService, OnboardingService} from '../../api/customer-service';
import {CustomerDisambiguationService} from '../../core/services/customer-disambiguation.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {ToastService} from '../../shared/services/toast.service';

type Row = CustomerDTO & { displayName: string };

/**
 * Customer selection: advisors pick the client to act for; customers pick which of their profiles to use.
 * Draft customers resume onboarding at their first incomplete step.
 */
@Component({
  selector: 'app-customer-disambiguation',
  imports: [Button, InputText, Message, TableModule, Tag],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>{{ isAdvisor() ? 'Select a client' : 'Choose a profile' }}</h1>
          <p>{{ isAdvisor()
            ? 'Pick the client you want to work on, or onboard a new one.'
            : 'Choose which customer profile you want to use.' }}</p>
        </div>
        <p-button [label]="isAdvisor() ? 'Onboard new client' : 'Create new profile'" [loading]="startingNew()"
                  (onClick)="startNewCustomerOnboarding()"/>
      </header>

      @if (loadError()) {
        <p-message severity="error">The customer list could not be loaded. Reload the page to try again.</p-message>
      } @else {
        <div class="wmp-panel">
          <label class="search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <span class="wmp-sr-only">Search customers</span>
            <input pInputText type="search" placeholder="Search by name or tax ID" [value]="query()"
                   (input)="query.set($any($event.target).value)"/>
          </label>

          <p-table [value]="filtered()" [loading]="loading()" [paginator]="filtered().length > 10" [rows]="10"
                   [tableStyle]="{'min-width': '40rem'}" dataKey="id">
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
                <td class="name">{{ row.displayName }}</td>
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
              <tr><td colspan="5" class="empty">{{ query() ? 'No customers match your search.' : 'No customer profiles yet.' }}</td></tr>
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
  private readonly disamb = inject(CustomerDisambiguationService);
  private readonly userSession = inject(UserSessionService);
  private readonly toast = inject(ToastService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly customerApi = inject(CustomerService);
  private readonly onboardingApi = inject(OnboardingService);
  private readonly progress = inject(OnboardingProgressService);

  protected readonly isAdvisor = this.userSession.isAdvisor;
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly startingNew = signal(false);
  protected readonly openingId = signal<string | null>(null);
  protected readonly query = signal('');
  private readonly rows = signal<Row[]>([]);

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(r => r.displayName.toLowerCase().includes(q) || (r.taxId ?? '').toLowerCase().includes(q));
  });

  constructor() {
    void this.loadCustomers();
  }

  private async loadCustomers(): Promise<void> {
    const userId = this.userSession.profile()?.id;
    if (!userId) {
      this.loadError.set(true);
      this.loading.set(false);
      return;
    }
    try {
      // The BE returns full customer records for the user
      const list = (await firstValueFrom(this.disamb.listByUser(userId))) as unknown as CustomerDTO[];
      this.rows.set((list ?? []).map(c => ({...c, displayName: this.displayName(c)})));
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private displayName(c: CustomerDTO): string {
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

  async select(row: Row): Promise<void> {
    if (!row.id) return;
    this.openingId.set(row.id);
    try {
      // Fresh record (the list may be stale), cached for the next screens
      const customer = await firstValueFrom(this.customerApi.getCustomerById(row.id));
      this.customerSession.setCustomer(customer);
      if ((customer?.customerStatus || '').toUpperCase() === 'DRAFT') {
        await this.router.navigateByUrl(await this.resumePath(row.id));
        return;
      }
      await this.router.navigateByUrl('/app/home');
    } catch {
      this.toast.error('Unable to open the selected customer.');
    } finally {
      this.openingId.set(null);
    }
  }

  /** First incomplete step of the active onboarding, mapped from the BE step names. */
  private async resumePath(customerId: string): Promise<string> {
    try {
      const active = await firstValueFrom(this.onboardingApi.getActiveOnboarding(customerId));
      const firstIncomplete = (active?.steps ?? []).find(s => (s.status || '').toUpperCase() !== 'COMPLETED');
      const step = this.progress.stepFromBackend(firstIncomplete?.step);
      if (step !== null) return this.progress.pathFor(step);
    } catch {
      // fall back to the first step
    }
    return this.progress.pathFor(OnboardingStep.PersonalDetails);
  }

  async startNewCustomerOnboarding(): Promise<void> {
    if (this.startingNew()) return;
    this.startingNew.set(true);
    try {
      // A brand-new onboarding: reset local progress and drop any previously selected customer
      this.progress.reset();
      this.customerSession.setCustomer(null);
      await this.router.navigateByUrl('/onboarding/personal-details');
    } finally {
      this.startingNew.set(false);
    }
  }
}
