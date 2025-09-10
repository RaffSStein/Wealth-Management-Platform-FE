import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialService, FinancialTypeDTO } from '../../api/customer-service';
import { AuthService } from '../../core/services/auth.service';

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
    .home-shell { min-height: 100dvh; display: grid; place-items: center; padding: 2rem; background: #f7f7f8; }
    .card { width: 100%; max-width: 720px; background: #fff; border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 6px 24px rgba(0,0,0,0.08); display: grid; gap: 1rem; }
    h1 { margin: 0; font-size: 1.6rem; }
    .subtitle { margin: 0; color: #555; }
    .info { display: grid; gap: 0.5rem; padding: 0.75rem; background: #fafafa; border: 1px solid #eee; border-radius: 8px; }
    .label { color: #666; margin-right: 0.25rem; }
    .value { font-weight: 600; color: #222; }
    .actions { display: flex; gap: 0.5rem; }
    .list ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
    .list li { padding: 0.75rem; border: 1px solid #eee; border-radius: 8px; background: #fafafa; }
    .tag { margin-left: 0.5rem; font-size: 0.8rem; color: #555; }
    .desc { color: #444; margin-top: 0.25rem; }
    .muted { color: #777; }
    .error { color: #b42318; background: #fee4e2; border: 1px solid #fecdca; padding: 0.5rem 0.75rem; border-radius: 8px; }
  `]
})
export class HomeComponent {
  /**
   * API client generated from OpenAPI (customer-service)
   * - Exposes typed methods to call backend endpoints (e.g., getAllFinancialTypes).
   * - Provided via DI; an HTTP interceptor can attach Authorization headers globally.
   */
  private readonly financialApi = inject(FinancialService);

  /**
   * Authentication/identity utility
   * - Provides the stored username used for display and future requests.
   */
  private readonly auth = inject(AuthService);

  /**
   * Loading flag for the fetch action (true while a request is in flight).
   */
  loading = signal(false);

  /**
   * Error message to render on screen when the last request failed.
   * - null means no error to show.
   */
  error = signal<string | null>(null);

  /**
   * Logged-in username (if available). Read from AuthService once at component creation.
   */
  username = signal<string | null>(this.auth.username());

  /**
   * Financial types returned by the backend.
   * - The DTO type is generated from OpenAPI for full type safety.
   */
  financialTypes = signal<FinancialTypeDTO[]>([]);

  /**
   * Triggers loading of financial types from the backend.
   * Guarded against double-clicks while an existing request is pending.
   * Updates the three state signals: loading, error, and financialTypes.
   */
  refresh() {
    if (this.loading()) return; // Prevent concurrent requests
    this.loading.set(true);
    this.error.set(null);

    this.financialApi.getAllFinancialTypes().subscribe({
      next: (list) => this.financialTypes.set(list ?? []), // Normalize null/undefined to [] for the UI
      error: () => this.error.set('Errore nel caricamento dei financial types'), // Localized user-friendly message
      complete: () => this.loading.set(false)
    });
  }
}
