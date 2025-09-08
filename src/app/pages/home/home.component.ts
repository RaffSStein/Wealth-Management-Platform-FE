import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
// Sostituisco il client usato: da user-service a customer-service (financial types)
import { FinancialService, FinancialTypeDTO } from '../../api/customer-service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
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
          <button class="secondary" (click)="refresh()" [disabled]="loading()">
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
    .home-shell { min-height: 100dvh; display: grid; place-items: center; padding: 2rem; background: #f7f7f8; }
    .card { width: 100%; max-width: 720px; background: #fff; border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 6px 24px rgba(0,0,0,0.08); display: grid; gap: 1rem; }
    h1 { margin: 0; font-size: 1.6rem; }
    .subtitle { margin: 0; color: #555; }
    .info { display: grid; gap: 0.5rem; padding: 0.75rem; background: #fafafa; border: 1px solid #eee; border-radius: 8px; }
    .label { color: #666; margin-right: 0.25rem; }
    .value { font-weight: 600; color: #222; }
    .actions { display: flex; gap: 0.5rem; }
    .secondary { height: 38px; border: 1px solid #d9d9df; border-radius: 8px; background: #fff; color: #333; padding: 0 0.75rem; cursor: pointer; }
    .secondary[disabled] { opacity: 0.65; cursor: not-allowed; }
    .list ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
    .list li { padding: 0.75rem; border: 1px solid #eee; border-radius: 8px; background: #fafafa; }
    .tag { margin-left: 0.5rem; font-size: 0.8rem; color: #555; }
    .desc { color: #444; margin-top: 0.25rem; }
    .muted { color: #777; }
    .error { color: #b42318; background: #fee4e2; border: 1px solid #fecdca; padding: 0.5rem 0.75rem; border-radius: 8px; }
  `]
})
export class HomeComponent {
  private readonly financialApi = inject(FinancialService);
  private readonly auth = inject(AuthService);

  loading = signal(false);
  error = signal<string | null>(null);

  username = signal<string | null>(this.auth.username());
  financialTypes = signal<FinancialTypeDTO[]>([]);

  refresh() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.financialApi.getAllFinancialTypes().subscribe({
      next: (list) => this.financialTypes.set(list ?? []),
      error: (e) => this.error.set('Errore nel caricamento dei financial types'),
      complete: () => this.loading.set(false)
    });
  }
}
