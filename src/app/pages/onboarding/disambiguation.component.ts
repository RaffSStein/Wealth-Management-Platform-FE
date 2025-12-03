import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {CustomerDisambiguationService, DisambiguationItem} from '../../core/services/customer-disambiguation.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {CustomerService, OnboardingService} from '../../api/customer-service';
import {ToastService} from '../../shared/services/toast.service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {OnboardingProgressService, OnboardingStep} from '../../core/services/onboarding-progress.service';
import {firstValueFrom} from 'rxjs';

@Component({
  selector: 'app-customer-disambiguation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="onb-shell onb-shell--disamb">
      <div class="panel">
        <h1 class="title">Customer selection</h1>
        <p class="muted">Select which customer you want to operate as.</p>
        @if (loading) {
          <p class="placeholder">Loading customer profiles…</p>
        }
        @if (!loading && items.length === 0) {
          <p class="placeholder">No customer profiles found for your user. Please contact support.</p>
        }
        @if (!loading && items.length > 0) {
          <ul class="disamb-list" role="list">
            @for (it of items; track (it.customerId || it.id); let i = $index) {
              <li class="disamb-item">
                <div class="card card--3cols">
                  <div class="col col--main">
                    <div class="info">
                      <strong class="name">{{ (it.firstName || '') + ' ' + (it.lastName || '') || (it.name || '') }}</strong>
                      @if (it.status) { <small class="status">Status: {{ it.status }}</small> }
                      <small class="toggle" (click)="toggle(i)" role="button" [attr.aria-expanded]="isExpanded(i)">
                        <span class="material-symbols-outlined icon" aria-hidden="true">expand_more</span>
                        {{ isExpanded(i) ? 'Hide details' : 'Show details' }}
                      </small>
                    </div>
                  </div>
                  <div class="col col--meta">
                    <div class="meta-grid">
                      @if (it.name) {
                        <div class="meta-row">
                          <label>Alias</label>
                          <span>{{ it.name }}</span>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="col col--actions">
                    <button type="button" class="primary" (click)="select(it)">Operate as</button>
                  </div>
                  @if (isExpanded(i)) {
                    <div class="details details--in-card">
                      <div class="grid">
                        @if (it.customerType) { <div><label>Customer type</label><span>{{ it.customerType }}</span></div> }
                        @if (it.customerStatus) { <div><label>Customer status</label><span>{{ it.customerStatus }}</span></div> }
                      </div>
                    </div>
                  }
                </div>
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .onb-shell.onb-shell--disamb {
        margin: 1rem;
      }

      .disamb-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(3, 1fr);
      }

      .disamb-item { display: block; }

      .card {
        background: var(--color-surface);
        width: 100%;
      }

      .card.card--3cols {
        display: grid;
        grid-template-columns: 2fr 1.5fr auto;
        align-items: center;
        gap: .75rem;
        padding: .75rem .9rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
      }

      .info {
        display: grid;
        gap: .15rem;
      }

      .name {
        font-size: .95rem;
      }

      .status {
        font-size: .75rem;
        opacity: .8;
      }

      .toggle {
        display: inline-flex;
        align-items: center;
        gap: .25rem;
        font-size: .75rem;
        color: var(--color-primary);
        cursor: pointer;
        user-select: none;
      }

      .toggle .icon {
        font-size: 18px;
      }

      .meta-grid {
        display: grid;
        gap: .25rem;
      }

      .meta-row label {
        display: block;
        font-size: .7rem;
        color: var(--color-text-muted, var(--color-text));
      }

      .meta-row span {
        display: block;
        font-size: .85rem;
      }

      .col--actions {
        display: flex;
        justify-content: flex-end;
      }

      .details {
        margin: .5rem 0 0;
        padding: .6rem .8rem;
        background: var(--color-surface);
      }

      .details.details--in-card {
        grid-column: 1 / -1;
        margin-top: .5rem;
        padding: .6rem .8rem;
        background: var(--color-surface);
      }

      .details .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: .5rem .75rem;
      }

      .details label {
        display: block;
        font-size: .7rem;
        color: var(--color-text-muted, var(--color-text));
      }

      .details span {
        display: block;
        font-size: .85rem;
      }

      @media (max-width: 1000px) {
        .disamb-list { grid-template-columns: repeat(2, 1fr); }
      }

      @media (max-width: 640px) {
        .disamb-list { grid-template-columns: 1fr; }
      }
    `
  ]
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

  loading = true;
  items: Array<DisambiguationItem & { id?: string; firstName?: string; lastName?: string; customerType?: string; customerStatus?: string }> = [];
  expandedIndex = signal<number | null>(null);

  constructor() {
    const userId = this.userSession.profile()?.id;
    if (!userId) {
      this.loading = false;
      this.toast.error('User profile not loaded.');
      return;
    }
    this.disamb.listByUser(userId).subscribe({
      next: (list) => {
        this.items = (list || []) as any;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.items = [];
        this.toast.error('Unable to load customer list. Please try again later.');
      }
    });
  }

  isExpanded(i: number): boolean {
    return this.expandedIndex() === i;
  }

  toggle(i: number) {
    const curr = this.expandedIndex();
    this.expandedIndex.set(curr === i ? null : i);
  }

  async select(it: DisambiguationItem) {
    try {
      // Precondition: ensure we have a valid customerId or id to avoid sync throws
      const rawId = (it as any)?.customerId ?? (it as any)?.id;
      const customerId = rawId ? String(rawId).trim() : '';
      if (!customerId) {
        this.toast.error('Invalid customer selection. Please refresh and try again.');
        return;
      }
      // Load and cache selected customer
      const customer = await firstValueFrom(this.customerApi.getCustomerById(customerId));
      // Store fetched customer directly in session to avoid a second API call
      this.customerSession.setCustomer(customer as any);
      const status = (customer as any)?.customerStatus as string | undefined;
      if ((status || '').toUpperCase() === 'DRAFT') {
        // Fetch active onboarding and route to the current step if any
        try {
          const active = await firstValueFrom(this.onboardingApi.getActiveOnboarding(customerId));
          const steps = (active?.steps || []) as Array<any>;
          const firstIncomplete = steps.find(s => (s.status || '').toUpperCase() !== 'COMPLETED');
          if (firstIncomplete) {
            const rawStep = (firstIncomplete.step as any);
            const idx: number = typeof rawStep === 'number' ? rawStep : Number.parseInt(String(rawStep), 10);
            const target = Number.isNaN(idx) ? this.progress.firstIncompleteIndex() : idx;
            const path = this.progress.pathFor(target as OnboardingStep);
            await this.router.navigateByUrl(path);
            return;
          }
        } catch {
          // ignore and fallback
        }
        await this.router.navigateByUrl('/onboarding/personal-details');
        return;
      }
      await this.router.navigateByUrl('/app/home');
    } catch {
      this.toast.error('Unable to load selected customer.');
    }
  }
}
