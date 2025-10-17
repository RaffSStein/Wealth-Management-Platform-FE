import {Component, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FavoriteIndexesComponent} from './favorite-indexes/favorite-indexes.component';
import {AssetsOverviewComponent} from './assets/overview/assets.overview.component';
import {DailyNewsComponent} from './news/daily-news.component';
import {PromotionsComponent} from './promotions/promotions.component';

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
  imports: [CommonModule, FavoriteIndexesComponent, AssetsOverviewComponent, DailyNewsComponent, PromotionsComponent],
  template: `
    <div class="dashboard-grid">
      <app-assets-overview />

      <!-- Favorite Indexes -->
      <app-favorite-indexes [indexes]="favoriteIndexes()" />

      <!-- Daily News -->
      <app-daily-news />

      <!-- Promotions -->
      <app-promotions />
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
  `]
})
export class HomeComponent {
  // Favorite indexes data preserved and passed to child component
  favoriteIndexes = signal([
    { name: 'FTSE MIB', value: 34450.12, change: 0.52 },
    { name: 'S&P 500', value: 5834.21, change: -0.18 },
    { name: 'EUR/USD', value: 1.0842, change: 0.07 },
    { name: 'NASDAQ 100', value: 18520.45, change: 0.36 },
    { name: 'DAX', value: 18240.11, change: -0.22 },
    { name: 'NIKKEI 225', value: 39210.88, change: 0.15 },
    { name: 'BTC/USD', value: 64250.73, change: 1.25 }
  ]);
}
