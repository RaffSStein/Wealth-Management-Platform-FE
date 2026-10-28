import {Component, computed, inject, signal} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {Message} from 'primeng/message';
import {SelectButton} from 'primeng/selectbutton';
import {Skeleton} from 'primeng/skeleton';
import {TableModule} from 'primeng/table';
import {FormsModule} from '@angular/forms';
import {CustomerDTO, CustomerService, MifidQuestionnaireConfigDTO, MifidService} from '../../api/customer-service';
import {CustomerSessionService} from '../../core/services/customer-session.service';
import {UserSessionService} from '../../core/services/user-session.service';
import {riskBands} from '../../core/services/mifid-questionnaire.service';
import {financialSnapshot, goalHorizon} from '../../core/services/dashboard-stats';
import {AllocationSlice, PORTFOLIO_DATA, PortfolioSummary, Position, Quote, ValuePoint, ValueRange} from '../../core/services/portfolio-data';
import {ValueChartComponent} from '../../shared/components/dashboard/value-chart.component';
import {AllocationBarComponent} from '../../shared/components/dashboard/allocation-bar.component';
import {SampleBadgeComponent} from '../../shared/components/dashboard/sample-badge.component';

/**
 * Customer home dashboard. Real data: investor profile, goals and financial snapshot (customer-service).
 * Portfolio, positions, allocation and watchlist come from PORTFOLIO_DATA (sample until the BE exists).
 */
@Component({
  selector: 'app-home',
  imports: [DecimalPipe, FormsModule, RouterLink, Message, SelectButton, Skeleton, TableModule, ValueChartComponent,
    AllocationBarComponent, SampleBadgeComponent],
  template: `
    <div class="dash">
      <header class="head">
        <div>
          <p class="muted">{{ today }}</p>
          <h1>{{ greeting() }}</h1>
        </div>
      </header>

      @if (summary(); as s) {
        <section class="kpis" aria-label="Portfolio summary">
          <div class="kpi"><span class="kpi__label">Total assets <app-sample-badge/></span><span class="kpi__value num">€{{ s.total | number:'1.2-2' }}</span></div>
          <div class="kpi"><span class="kpi__label">Day P/L</span>
            <span class="kpi__value num" [class.gain]="s.dayPl >= 0" [class.loss]="s.dayPl < 0">{{ s.dayPl >= 0 ? '+' : '−' }}€{{ abs(s.dayPl) | number:'1.2-2' }}</span></div>
          <div class="kpi"><span class="kpi__label">YTD return</span>
            <span class="kpi__value num" [class.gain]="s.ytdPct >= 0" [class.loss]="s.ytdPct < 0">{{ s.ytdPct >= 0 ? '+' : '−' }}{{ abs(s.ytdPct) | number:'1.2-2' }}%</span></div>
          <div class="kpi"><span class="kpi__label">Available cash</span><span class="kpi__value num">€{{ s.cash | number:'1.2-2' }}</span></div>
        </section>
      } @else {
        <p-skeleton height="88px"/>
      }

      <div class="row">
        <section class="card card--wide">
          <header class="card__head">
            <h2>Portfolio value <app-sample-badge/></h2>
            <p-selectbutton [options]="ranges" [ngModel]="range()" (ngModelChange)="setRange($event)" [allowEmpty]="false"
                            ariaLabelledBy="range-label" size="small"/>
            <span id="range-label" class="wmp-sr-only">Time range</span>
          </header>
          @if (history().length) {
            <app-value-chart [data]="history()" [ariaLabel]="'Portfolio value, last ' + range()"/>
          } @else {
            <p-skeleton height="240px"/>
          }
        </section>

        <section class="card">
          <header class="card__head"><h2>Investor profile</h2></header>
          @if (loadingCustomer()) {
            <p-skeleton height="120px"/>
          } @else if (profile(); as p) {
            <p class="profile__label">{{ profileLabel() }}</p>
            @if (p.score != null) { <p class="muted">MiFID score <span class="num">{{ p.score }}</span></p> }
            <a routerLink="/onboarding/mifid-questionnaire" class="link">Review questionnaire →</a>
          } @else {
            <p class="muted">No investor profile yet.</p>
            <a routerLink="/onboarding/mifid-questionnaire" class="link">Complete the MiFID questionnaire →</a>
          }
        </section>
      </div>

      <div class="row">
        <section class="card card--wide">
          <header class="card__head">
            <h2>Top positions <app-sample-badge/></h2>
            <a routerLink="/app/investments/positions" class="link">All positions →</a>
          </header>
          <div class="table-wrap">
            <p-table [value]="positions()" [tableStyle]="{'min-width': '36rem'}">
              <ng-template #header>
                <tr><th>Instrument</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Value</th><th class="r">P/L</th></tr>
              </ng-template>
              <ng-template #body let-p>
                <tr>
                  <td>{{ p.name }}<div class="num muted small">{{ p.isin }}</div></td>
                  <td class="num r">{{ p.qty | number }}</td>
                  <td class="num r">{{ p.price | number:'1.2-2' }}</td>
                  <td class="num r">{{ p.value | number:'1.2-2' }}</td>
                  <td class="num r" [class.gain]="p.plPct >= 0" [class.loss]="p.plPct < 0">{{ p.plPct >= 0 ? '+' : '−' }}{{ abs(p.plPct) | number:'1.1-1' }}%</td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </section>

        <section class="card">
          <header class="card__head"><h2>Allocation <app-sample-badge/></h2></header>
          @if (allocation().length) {
            <app-allocation-bar [items]="allocation()"/>
          }
        </section>
      </div>

      <div class="row">
        <section class="card">
          <header class="card__head">
            <h2>Goals</h2>
            <a routerLink="/onboarding/investment-goals" class="link">Edit</a>
          </header>
          @if (loadingCustomer()) {
            <p-skeleton height="80px"/>
          } @else if (goals().length) {
            <ul class="goals">
              @for (g of goals(); track $index) {
                <li>
                  <span class="goals__name">{{ g.goalType.description || g.goalType.name }}</span>
                  <span class="num">€{{ g.targetAmount | number:'1.0-0' }}</span>
                  <span class="chip">{{ horizon(g) }}</span>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">No goals yet. <a routerLink="/onboarding/investment-goals">Add your first goal →</a></p>
          }
        </section>

        <section class="card">
          <header class="card__head"><h2>Financial snapshot</h2></header>
          @if (customerError()) {
            <p-message severity="error">Customer data could not be loaded.</p-message>
          } @else {
            <dl class="dl">
              <div><dt>Annual income</dt><dd class="num">€{{ snapshot().income | number:'1.0-0' }}</dd></div>
              <div><dt>Declared investments</dt><dd class="num">€{{ snapshot().investments | number:'1.0-0' }}</dd></div>
              <div><dt>Expenses</dt><dd class="num">€{{ snapshot().expenses | number:'1.0-0' }}</dd></div>
            </dl>
          }
        </section>

        <section class="card">
          <header class="card__head"><h2>Watchlist <app-sample-badge/></h2></header>
          <ul class="quotes">
            @for (q of watchlist(); track q.name) {
              <li><span>{{ q.name }}</span><span class="num">{{ q.value | number:'1.2-2' }}</span>
                <span class="num q__chg" [class.gain]="q.changePct >= 0" [class.loss]="q.changePct < 0">{{ q.changePct >= 0 ? '+' : '−' }}{{ abs(q.changePct) | number:'1.2-2' }}%</span></li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dash { padding: 1.5rem; display: grid; gap: 1rem; max-width: 1440px; }
    .head h1 { margin: .15rem 0 0; font-size: 1.6rem; font-weight: 600; }
    .muted { margin: 0; color: var(--wmp-text-muted); font-size: .85rem; }
    .small { font-size: .75rem; }
    .kpis {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px;
      background: var(--wmp-border); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg); overflow: hidden;
    }
    .kpi { background: var(--wmp-surface); padding: 1rem 1.25rem; display: grid; gap: .35rem; }
    .kpi__label { display: flex; align-items: center; gap: .5rem; font-size: .8rem; color: var(--wmp-text-muted); }
    .kpi__value { font-size: 1.5rem; font-weight: 500; }
    .row { display: flex; flex-wrap: wrap; gap: 1rem; }
    .card {
      flex: 1 1 300px; min-width: 0; background: var(--wmp-surface); border: 1px solid var(--wmp-border);
      border-radius: var(--wmp-radius-lg); padding: 1rem 1.25rem; display: grid; gap: .75rem; align-content: start;
    }
    .card--wide { flex: 999 1 560px; }
    .card__head { display: flex; justify-content: space-between; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .card__head h2 { margin: 0; font-size: .95rem; font-weight: 600; display: flex; align-items: center; gap: .5rem; }
    .link { font-size: .85rem; }
    .table-wrap { overflow-x: auto; }
    .r { text-align: right; }
    .profile__label { margin: 0; font-size: 1.4rem; font-weight: 600; color: var(--wmp-primary); }
    .goals, .quotes { list-style: none; margin: 0; padding: 0; display: grid; }
    .goals li, .quotes li { display: flex; align-items: center; gap: .75rem; padding: .6rem 0; border-top: 1px solid var(--wmp-border); font-size: .9rem; }
    .goals li:first-child, .quotes li:first-child { border-top: 0; }
    .goals__name, .quotes li > span:first-child { flex: 1; }
    .chip { font-size: .75rem; padding: .15rem .5rem; border-radius: var(--wmp-radius-sm); background: var(--wmp-surface-raised); color: var(--wmp-text-muted); }
    .q__chg { width: 4.5rem; text-align: right; }
    .dl { margin: 0; display: grid; gap: .6rem; }
    .dl div { display: flex; justify-content: space-between; gap: 1rem; font-size: .9rem; }
    .dl dt { color: var(--wmp-text-muted); }
    .dl dd { margin: 0; }
    @media (max-width: 599.98px) { .dash { padding: 1rem; } }
  `]
})
export class HomeComponent {
  private readonly data = inject(PORTFOLIO_DATA);
  private readonly customerApi = inject(CustomerService);
  private readonly mifidApi = inject(MifidService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly userSession = inject(UserSessionService);

  protected readonly ranges: ValueRange[] = ['1M', '3M', '1Y', 'MAX'];
  protected readonly range = signal<ValueRange>('1Y');
  protected readonly today = new Date().toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});

  protected readonly summary = signal<PortfolioSummary | null>(null);
  protected readonly history = signal<ValuePoint[]>([]);
  protected readonly positions = signal<Position[]>([]);
  protected readonly allocation = signal<AllocationSlice[]>([]);
  protected readonly watchlist = signal<Quote[]>([]);

  private readonly customer = signal<CustomerDTO | null>(this.customerSession.customer());
  private readonly config = signal<MifidQuestionnaireConfigDTO | null>(null);
  protected readonly loadingCustomer = signal(true);
  protected readonly customerError = signal(false);

  protected readonly greeting = computed(() => {
    const c = this.customer();
    const name = c?.firstName || this.userSession.profile()?.firstName;
    return name ? `Hello, ${name}` : 'Hello';
  });
  protected readonly profile = computed(() => {
    const p = this.customer()?.riskProfile;
    return p?.profile && p.profile.toUpperCase() !== 'UNDEFINED' ? p : null;
  });
  protected readonly profileLabel = computed(() => {
    const code = this.profile()?.profile ?? '';
    const band = riskBands(this.config()).find(b => b.profileCode === code);
    return band?.profileLabel ?? (code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' '));
  });
  protected readonly goals = computed(() => this.customer()?.customerGoals ?? []);
  protected readonly snapshot = computed(() => financialSnapshot(this.customer()?.customerFinancials));
  protected readonly horizon = goalHorizon;
  protected readonly abs = Math.abs;

  private readonly customerId = this.customerSession.customer()?.id ?? 'self';

  constructor() {
    void this.loadPortfolio();
    void this.loadCustomer();
  }

  protected setRange(range: ValueRange): void {
    this.range.set(range);
    void firstValueFrom(this.data.getValueHistory(this.customerId, range)).then(h => this.history.set(h));
  }

  private async loadPortfolio(): Promise<void> {
    const id = this.customerId;
    const [summary, history, positions, allocation, watchlist] = await Promise.all([
      firstValueFrom(this.data.getSummary(id)),
      firstValueFrom(this.data.getValueHistory(id, this.range())),
      firstValueFrom(this.data.getPositions(id)),
      firstValueFrom(this.data.getAllocation(id)),
      firstValueFrom(this.data.getWatchlist())
    ]);
    this.summary.set(summary);
    this.history.set(history);
    this.positions.set(positions);
    this.allocation.set(allocation);
    this.watchlist.set(watchlist);
  }

  private async loadCustomer(): Promise<void> {
    const id = this.customerSession.customer()?.id;
    try {
      if (id) {
        const fresh = await firstValueFrom(this.customerApi.getCustomerById(id));
        this.customer.set(fresh);
        this.customerSession.setCustomer(fresh);
      }
    } catch {
      this.customerError.set(true);
    } finally {
      this.loadingCustomer.set(false);
    }
    try {
      this.config.set(await firstValueFrom(this.mifidApi.getLatestValidMifidQuestionnaireConfig()));
    } catch {
      // labels fall back to the profile code
    }
  }
}
