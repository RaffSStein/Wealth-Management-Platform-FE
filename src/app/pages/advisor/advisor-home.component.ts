import {Component, computed, inject, signal} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {Button, ButtonDirective, ButtonLabel} from 'primeng/button';
import {Message} from 'primeng/message';
import {Skeleton} from 'primeng/skeleton';
import {TableLazyLoadEvent, TableModule} from 'primeng/table';
import {Tag} from 'primeng/tag';
import {AdvisorDashboardStatisticsDTO, CustomerService, CustomerSummaryDTO, MifidQuestionnaireConfigDTO, MifidService} from '../../api/customer-service';
import {CustomerPage} from '../../core/services/customer-page';
import {CustomerSelectionService} from '../../core/services/customer-selection.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {profileDisplay, riskBands} from '../../core/services/mifid-questionnaire.service';
import {advisorStats} from '../../core/services/dashboard-stats';
import {PORTFOLIO_DATA} from '../../core/services/portfolio-data';
import {ToastService} from '../../shared/services/toast.service';
import {SampleBadgeComponent} from '../../shared/components/dashboard/sample-badge.component';

interface ProfileBar {
  code: string;
  label: string;
  count: number;
  pct: number;
}

/**
 * Advisor workspace overview (/app/advisor). Client figures are real (the customers of the advisor's active branch);
 * AUM comes from the sample portfolio source until portfolio services exist.
 */
@Component({
  selector: 'app-advisor-home',
  imports: [DecimalPipe, RouterLink, Button, ButtonDirective, ButtonLabel, Message, Skeleton, TableModule, Tag, SampleBadgeComponent],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <p class="muted">Advisor workspace</p>
          <h1>{{ greeting() }}</h1>
        </div>
        <a pButton routerLink="/onboarding/disambiguation"><span pButtonLabel>Select a client</span></a>
      </header>

      @if (error()) {
        <p-message severity="error">Your client list could not be loaded. Reload the page to try again.</p-message>
      } @else if (loading()) {
        <p-skeleton height="88px"/>
        <p-skeleton height="240px"/>
      } @else {
        <section class="kpis" aria-label="Workspace summary">
          <a class="kpi" routerLink="/app/advisor/clients"><span class="kpi__label">Clients</span><span class="kpi__value num">{{ stats().total }}</span></a>
          <div class="kpi"><span class="kpi__label">Active</span><span class="kpi__value num">{{ stats().active }}</span></div>
          <div class="kpi"><span class="kpi__label">Onboarding in progress</span><span class="kpi__value num">{{ stats().onboarding }}</span></div>
          <div class="kpi"><span class="kpi__label">Pending verification</span><span class="kpi__value num">{{ stats().pendingVerification }}</span></div>
          <div class="kpi"><span class="kpi__label">Assets under management <app-sample-badge/></span><span class="kpi__value num">€{{ aum() | number:'1.0-0' }}</span></div>
        </section>

        <div class="row">
          <section class="card">
            <header class="card__head"><h2>Risk profiles</h2><span class="muted">{{ profiledCount() }} of {{ stats().total }} profiled</span></header>
            @if (profileBars().length) {
              <ul class="bars">
                @for (b of profileBars(); track b.code) {
                  <li>
                    <span class="bars__label">{{ b.label }}</span>
                    <span class="bars__track"><span class="bars__fill" [style.width.%]="b.pct"></span></span>
                    <span class="num bars__count">{{ b.count }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">No client has completed the MiFID questionnaire yet.</p>
            }
          </section>

          <section class="card card--wide">
            <header class="card__head"><h2>Onboarding in progress</h2></header>
            @if (drafts.rows().length) {
              <div class="table-wrap">
                <p-table [value]="drafts.rows()" [lazy]="true" (onLazyLoad)="page(drafts, $event)" [rows]="drafts.size"
                         [totalRecords]="drafts.total()" [first]="drafts.first()" [loading]="drafts.loading()"
                         [paginator]="drafts.total() > drafts.size" [tableStyle]="{'min-width': '28rem'}">
                  <ng-template #header><tr><th>Client</th><th>Tax ID</th><th><span class="wmp-sr-only">Actions</span></th></tr></ng-template>
                  <ng-template #body let-c>
                    <tr>
                      <td>{{ name(c) }}</td>
                      <td class="num">{{ c.taxId }}</td>
                      <td class="r"><p-button label="Continue onboarding" size="small" [outlined]="true"
                                              [loading]="openingId() === c.id" (onClick)="open(c)"/></td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            } @else {
              <p class="muted">No onboarding in progress.</p>
            }
          </section>
        </div>

        <section class="card">
          <header class="card__head"><h2>Clients</h2><a routerLink="/onboarding/disambiguation" class="link">All clients →</a></header>
          <div class="table-wrap">
            <p-table [value]="clients.rows()" [lazy]="true" (onLazyLoad)="page(clients, $event)" [rows]="clients.size"
                     [totalRecords]="clients.total()" [first]="clients.first()" [loading]="clients.loading()"
                     [paginator]="clients.total() > clients.size" [tableStyle]="{'min-width': '36rem'}">
              <ng-template #header><tr><th>Client</th><th>Tax ID</th><th>Profile</th><th>Status</th><th><span class="wmp-sr-only">Actions</span></th></tr></ng-template>
              <ng-template #body let-c>
                <tr>
                  <td>{{ name(c) }}</td>
                  <td class="num">{{ c.taxId }}</td>
                  <td class="muted">{{ profileLabel(c.riskProfile?.profile) }}</td>
                  <td><p-tag [value]="statusLabel(c.customerStatus)" [severity]="c.customerStatus === 'ACTIVE' ? 'success' : 'info'"/></td>
                  <td class="r"><p-button label="Open" size="small" [outlined]="true" [loading]="openingId() === c.id" (onClick)="open(c)"/></td>
                </tr>
              </ng-template>
              <ng-template #emptymessage><tr><td colspan="5" class="muted">No onboarded clients yet.</td></tr></ng-template>
            </p-table>
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    .page { padding: 1.5rem; display: grid; gap: 1rem; max-width: 1440px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
    h1 { margin: .15rem 0 0; font-size: 1.6rem; font-weight: 600; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .85rem; }
    .kpis {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1px;
      background: var(--wmp-border); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg); overflow: hidden;
    }
    .kpi { background: var(--wmp-surface); padding: 1rem 1.25rem; display: grid; gap: .35rem; color: var(--wmp-text); text-decoration: none; }
    a.kpi:hover { background: var(--wmp-surface-raised); text-decoration: none; }
    .kpi__label { display: flex; align-items: center; gap: .5rem; font-size: .8rem; color: var(--wmp-text-muted); }
    .kpi__value { font-size: 1.5rem; font-weight: 500; }
    .row { display: flex; flex-wrap: wrap; gap: 1rem; }
    .card {
      flex: 1 1 300px; min-width: 0; background: var(--wmp-surface); border: 1px solid var(--wmp-border);
      border-radius: var(--wmp-radius-lg); padding: 1rem 1.25rem; display: grid; gap: .75rem; align-content: start;
    }
    .card--wide { flex: 999 1 480px; }
    .card__head { display: flex; justify-content: space-between; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .card__head h2 { margin: 0; font-size: .95rem; font-weight: 600; }
    .link { font-size: .85rem; }
    .table-wrap { overflow-x: auto; }
    .r { text-align: right; }
    .bars { list-style: none; margin: 0; padding: 0; display: grid; gap: .65rem; }
    .bars li { display: grid; grid-template-columns: minmax(8rem, 1fr) 2fr 2rem; align-items: center; gap: .75rem; font-size: .85rem; }
    .bars__label { color: var(--wmp-text-muted); }
    .bars__track { height: 8px; border-radius: 4px; background: var(--wmp-surface-raised); overflow: hidden; }
    .bars__fill { display: block; height: 100%; border-radius: 4px; background: var(--wmp-chart-1); }
    .bars__count { text-align: right; }
  `]
})
export class AdvisorHomeComponent {
  private readonly userSession = inject(UserSessionService);
  private readonly customerApi = inject(CustomerService);
  private readonly selection = inject(CustomerSelectionService);
  private readonly mifidApi = inject(MifidService);
  private readonly data = inject(PORTFOLIO_DATA);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly openingId = signal<string | null>(null);
  protected readonly drafts = new CustomerPage(this.customerApi, 5, ['DRAFT']);
  protected readonly clients = new CustomerPage(this.customerApi, 8, ['PENDING_VERIFICATION', 'ACTIVE', 'REJECTED', 'CLOSED']);
  private readonly statistics = signal<AdvisorDashboardStatisticsDTO | null>(null);
  private readonly config = signal<MifidQuestionnaireConfigDTO | null>(null);
  protected readonly aum = signal(0);

  protected readonly greeting = computed(() => {
    const first = this.userSession.profile()?.firstName;
    return first ? `Hello, ${first}` : 'Hello';
  });
  protected readonly stats = computed(() => advisorStats(this.statistics()));
  protected readonly profiledCount = computed(() => Object.values(this.stats().byProfile).reduce((s, n) => s + n, 0));

  /** One bar per configured band (in score order), plus any profile code outside the config. */
  protected readonly profileBars = computed<ProfileBar[]>(() => {
    const counts = this.stats().byProfile;
    const max = Math.max(1, ...Object.values(counts));
    const bands = riskBands(this.config());
    // Profiles may be stored as code or as configured label
    const known = new Set(bands.flatMap(b => [b.profileCode, b.profileLabel]));
    const bars = bands.map(b => ({code: b.profileCode ?? '', label: b.profileLabel ?? b.profileCode ?? '', count: (counts[b.profileCode ?? ''] ?? 0) + (counts[b.profileLabel ?? ''] ?? 0)}));
    for (const key of Object.keys(counts)) if (!known.has(key)) bars.push({code: key, label: key, count: counts[key]});
    return bars.filter(b => b.count > 0 || bands.length > 0).map(b => ({...b, pct: (b.count / max) * 100}));
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [statistics] = await Promise.all([
        firstValueFrom(this.customerApi.getAdvisorDashboardStatistics()),
        this.drafts.load(),
        this.clients.load()
      ]);
      if (this.drafts.failed() || this.clients.failed()) throw new Error('client list not loaded');
      this.statistics.set(statistics);
      const stats = this.stats();
      this.aum.set(await firstValueFrom(this.data.getBookTotal(stats.total - stats.onboarding)));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
    try {
      this.config.set(await firstValueFrom(this.mifidApi.getLatestValidMifidQuestionnaireConfig()));
    } catch {
      // bars fall back to profile codes
    }
  }

  protected page(list: CustomerPage, event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    if (first !== list.first()) void list.load(first);
  }

  protected name(c: CustomerSummaryDTO): string {
    return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.companyName || 'Unnamed client';
  }

  protected profileLabel(profile?: string): string {
    return profileDisplay(this.config(), profile) || '—';
  }

  protected statusLabel(status?: string): string {
    return status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ') : '—';
  }

  protected async open(c: CustomerSummaryDTO): Promise<void> {
    // One client at a time: ignore clicks on other rows while one is opening
    if (!c.id || this.openingId()) return;
    this.openingId.set(c.id);
    try {
      await this.selection.open(c.id);
    } catch {
      this.toast.error('Unable to open the selected client.');
    } finally {
      this.openingId.set(null);
    }
  }
}
