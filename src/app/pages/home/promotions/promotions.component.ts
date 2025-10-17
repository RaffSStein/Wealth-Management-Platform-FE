import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

/**
 * Promotions widget (placeholder)
 */
@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card promotions" aria-labelledby="promotions-title">
      <h2 id="promotions-title">Promotions</h2>
      <div class="placeholder">
        <p class="muted">(Placeholder) Promotions will appear here.</p>
      </div>
    </section>
  `,
  styles: [`
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

    .muted {
      color: var(--color-text-muted);
    }
  `]
})
export class PromotionsComponent {
}

