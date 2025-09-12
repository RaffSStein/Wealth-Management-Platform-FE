import {Component, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FinancialService, FinancialTypeDTO} from '../../api/customer-service';
import {AuthService} from '../../core/services/auth.service';

/**
 * HomeComponent
 * - Displays a simple welcome with the stored username.
 * - Loads and renders the list of financial types from customer-service.
 * - Uses Angular Signals to model loading, error, and data state in a concise, reactive way.
 * - Presentation-only page: no routing logic here.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!--
      View structure
      - Card layout with a welcome message and the current username (if present).
      - Action area with a button to fetch financial types on demand.
      - Conditional error message and conditional list rendering using *ngIf and *ngFor.
    -->
    <section class="home-shell">
      <div class="card">
        <h1>Homepage</h1>
        <p class="subtitle">Accesso completato. Benvenuto{{ username() ? ', ' + username() : '' }}.</p>

        <div class="info">
          <div>
            <span class="label">Username:</span>
            <span class="value">{{ username() || '—' }}</span>
          </div>
        </div>

        <div class="actions">
          <!-- Uses the global .button-secondary style defined in global styles -->
          <button class="button-secondary" (click)="refresh()" [disabled]="loading()">
            {{ loading() ? 'Caricamento…' : 'Carica financial types' }}
          </button>
        </div>

        <ng-container *ngIf="error() as err">
          <p class="error">{{ err }}</p>
        </ng-container>

        <div class="list" *ngIf="financialTypes().length; else empty">
          <h2>Financial types</h2>
          <ul>
            <li *ngFor="let ft of financialTypes()">
              <strong>{{ ft.name || 'N/D' }}</strong>
              <span class="tag">{{ ft.type || '—' }}</span>
              <div class="desc">{{ ft.description || '—' }}</div>
            </li>
          </ul>
        </div>
        <ng-template #empty>
          <p class="muted">Nessun dato caricato.</p>
        </ng-template>
      </div>
    </section>
  `,
  styles: [`
    /* Page-specific styles (layout and typography). Shared control styles live in global stylesheets. */
    .home-shell {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 2rem;
      background: var(--color-bg);
    }

    .card {
      width: 100%;
      max-width: 720px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem 1.5rem;
      box-shadow: var(--shadow);
      display: grid;
      gap: 1rem;
    }

    h1 {
      margin: 0;
      font-size: 1.6rem;
      color: var(--color-heading);
    }

    .subtitle {
      margin: 0;
      color: var(--color-text-muted);
    }

    .info {
      display: grid;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .label {
      color: var(--color-text-muted);
      margin-right: 0.25rem;
    }

    .value {
      font-weight: 600;
      color: var(--color-text);
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .list ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.5rem;
    }

    .list li {
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
    }

    .tag {
      margin-left: 0.5rem;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .desc {
      color: var(--color-text);
      margin-top: 0.25rem;
    }

    .muted {
      color: var(--color-text-muted);
    }

    .error {
      color: var(--color-danger);
      background: color-mix(in oklab, var(--color-danger), white 92%);
      border: 1px solid color-mix(in oklab, var(--color-danger), white 76%);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius);
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

  // Reactive state signals
  loading = signal(false);
  error = signal<string | null>(null);
  username = signal<string | null>(null);
  financialTypes = signal<FinancialTypeDTO[]>([]);

  /**
   * Fetch financial types from backend.
   * Guards against concurrent requests and updates reactive state signals.
   */
  refresh() {
    if (this.loading()) return; // prevent duplicate clicks
    this.loading.set(true);
    this.error.set(null);
    this.financialApi.getAllFinancialTypes().subscribe({
      next: (list) => this.financialTypes.set(list ?? []),
      error: () => this.error.set('Errore nel caricamento dei financial types'),
      complete: () => this.loading.set(false)
    });
  }
}
