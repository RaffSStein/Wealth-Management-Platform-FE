import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';

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
          <div>
            <span class="label">Nome:</span>
            <span class="value">{{ user()?.name || '—' }}</span>
          </div>
          <div>
            <span class="label">Email:</span>
            <span class="value">{{ user()?.email || '—' }}</span>
          </div>
        </div>

        <div class="actions">
          <button class="secondary" (click)="refresh()" [disabled]="loading()">
            {{ loading() ? 'Caricamento…' : 'Ricarica dati /me' }}
          </button>
        </div>
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
  `]
})
export class HomeComponent {
  private readonly userService = inject(UserService);
  loading = signal(false);

  // Signals esposti al template
  username = this.userService.username;
  user = this.userService.user;

  refresh() {
    if (this.loading()) return;
    this.loading.set(true);
    this.userService.loadMe().subscribe({
      next: () => {},
      error: () => {},
      complete: () => this.loading.set(false)
    });
  }
}
