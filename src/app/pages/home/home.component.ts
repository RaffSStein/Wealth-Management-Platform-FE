import {Component, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FinancialService, FinancialTypeDTO} from '../../api/customer-service';
import {AuthService} from '../../core/services/auth.service';
import {RouterModule} from '@angular/router';

/**
 * Home (Dashboard) Component
 * Layout (inside AppShell): two-column responsive grid with widgets:
 *  - Assets overview (pie chart: cash vs portfolio) + KPIs
 *  - Favorite indexes (placeholder/mock)
 *  - Daily news (placeholder)
 *  - Promotions (placeholder)
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-grid">
      <section class="card assets-overview" aria-labelledby="assets-title">
        <h2 id="assets-title">Assets Overview</h2>
        <div class="kpis">
          <div class="kpi">
            <span class="label">Total</span>
            <span class="value">{{ total() | number:'1.0-0' }} €</span>
          </div>
          <div class="kpi" [class.positive]="gainLoss() >= 0" [class.negative]="gainLoss() < 0">
            <span class="label">Gain/Loss</span>
            <span class="value">{{ gainLoss() >= 0 ? '+' : ''}}{{ gainLoss() | number:'1.0-0' }} €</span>
            <span class="muted small">({{ gainLossPerc() | number:'1.1-2' }}%)</span>
          </div>
          <div class="kpi">
            <span class="label">Available Cash</span>
            <span class="value">{{ cash() | number:'1.0-0' }} €</span>
          </div>
        </div>
        <div class="allocation">
          <div class="donut" role="img" [attr.aria-label]="'Allocation: Portfolio ' + (portfolioPerc() | number:'1.0-0') + ' percent, Cash ' + (cashPerc() | number:'1.0-0') + ' percent'" [style.--portfolio]="portfolioPerc()">
            <div class="center">{{ portfolioPerc() | number:'1.0-0' }}%</div>
          </div>
          <ul class="legend">
            <li><span class="swatch portfolio"></span> Portfolio ({{ portfolioValue() | number:'1.0-0' }} €)</li>
            <li><span class="swatch cash"></span> Cash ({{ cash() | number:'1.0-0' }} €)</li>
          </ul>
        </div>
      </section>

      <!-- Favorite Indexes -->
      <section class="card indexes" aria-labelledby="indexes-title">
        <h2 id="indexes-title">Favorite Indexes</h2>
        <ul class="indices-list">
          <li *ngFor="let idx of favoriteIndexes()">
            <span class="name">{{ idx.name }}</span>
            <span class="val" [class.positive]="idx.change >= 0" [class.negative]="idx.change < 0">
              {{ idx.value | number:'1.2-2' }}
              <span class="delta">{{ idx.change >= 0 ? '+' : ''}}{{ idx.change | number:'1.2-2' }}%</span>
            </span>
          </li>
        </ul>
        <p *ngIf="!favoriteIndexes().length" class="muted">No indexes configured.</p>
      </section>

      <!-- Daily News -->
      <section class="card news" aria-labelledby="news-title">
        <h2 id="news-title">Daily News</h2>
        <div class="placeholder">
          <p class="muted">(Placeholder) News will appear here.</p>
        </div>
      </section>

      <!-- Promotions -->
      <section class="card promotions" aria-labelledby="promotions-title">
        <h2 id="promotions-title">Promotions</h2>
        <div class="placeholder">
          <p class="muted">(Placeholder) Promotions will appear here.</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 1.25rem 1.5rem 2rem;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
      align-items: start;
    }

    @media (max-width: 980px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem 1.1rem;
      display: grid;
      gap: .75rem;
      box-shadow: var(--shadow);
    }

    h2 {
      margin: 0;
      font-size: 1.05rem;
      color: var(--color-heading);
      letter-spacing: .5px;
    }

    /* KPIs */
    .kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .kpi {
      display: flex;
      flex-direction: column;
      font-size: .85rem;
    }

    .kpi .label {
      color: var(--color-text-muted);
    }

    .kpi .value {
      font-weight: 600;
      font-size: .95rem;
    }

    .kpi.positive .value, .positive {
      color: #1a7f37;
    }

    .kpi.negative .value, .negative {
      color: var(--color-danger);
    }

    .small {
      font-size: .7rem;
    }

    /* Allocation donut chart */
    .allocation {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .donut {
      --size: 180px;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      position: relative;
      background: conic-gradient(
        var(--color-primary) 0 calc(var(--portfolio) * 1%),
        var(--color-secondary) calc(var(--portfolio) * 1%) 100%
      );
      box-shadow: var(--shadow);
      display: grid;
      place-items: center;
      font-size: .8rem;
      font-weight: 600;
      color: var(--color-heading);
    }

    .donut::after {
      content: "";
      position: absolute;
      inset: 14%;
      background: var(--color-surface);
      border-radius: 50%;
      box-shadow: inset 0 0 0 1px var(--color-border);
    }

    .donut .center {
      position: relative;
      z-index: 1;
    }

    /* Reuse legend styles */
    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: .35rem;
      font-size: .75rem;
    }

    .legend li {
      display: flex;
      align-items: center;
      gap: .4rem;
    }

    .swatch {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      display: inline-block;
      border: 1px solid var(--color-border);
    }

    .swatch.portfolio {
      background: var(--color-primary);
    }

    .swatch.cash {
      background: var(--color-secondary);
    }

    /* Index list */
    .indices-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: .5rem;
    }

    .indices-list li {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: .85rem;
    }

    .indices-list .name {
      font-weight: 500;
    }

    .indices-list .val {
      display: flex;
      gap: .35rem;
      align-items: baseline;
    }

    .delta {
      font-size: .65rem;
      padding: .15rem .35rem;
      border-radius: 999px;
      background: var(--color-surface-alt);
    }

    /* Placeholder areas */
    .placeholder {
      min-height: 110px;
      display: grid;
      place-items: center;
      border: 2px dashed var(--color-border);
      border-radius: var(--radius);
    }

    .muted {
      color: var(--color-text-muted);
    }
  `]
})
export class HomeComponent {
  constructor(
    private readonly financialApi: FinancialService,
    private readonly auth: AuthService
  ) {
    this.username.set(this.auth.username());
  }

  // User
  username = signal<string | null>(null);

  // (Legacy) API financial types (currently unused in UI, retained for future use)
  loading = signal(false);
  error = signal<string | null>(null);
  financialTypes = signal<FinancialTypeDTO[]>([]);

  // Static mock data (replace with API when ready)
  cash = signal(15000);
  portfolioValue = signal(35000);
  gainLoss = signal(1200);
  gainLossPerc = computed(() => this.gainLoss() / (this.total() - this.gainLoss()) * 100);
  total = computed(() => this.cash() + this.portfolioValue());
  portfolioPerc = computed(() => this.portfolioValue() / this.total() * 100);
  cashPerc = computed(() => this.cash() / this.total() * 100);

  favoriteIndexes = signal<{name: string; value: number; change: number}[]>([
    {name: 'FTSE MIB', value: 34450.12, change: 0.52},
    {name: 'S&P 500', value: 5834.21, change: -0.18},
    {name: 'EUR/USD', value: 1.0842, change: 0.07}
  ]);

  refresh() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.financialApi.getAllFinancialTypes().subscribe({
      next: (list) => this.financialTypes.set(list ?? []),
      error: () => this.error.set('Error loading financial types'),
      complete: () => this.loading.set(false)
    });
  }
}
