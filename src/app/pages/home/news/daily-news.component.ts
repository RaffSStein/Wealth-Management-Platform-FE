import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

/**
 * Daily News widget (placeholder)
 */
@Component({
  selector: 'app-daily-news',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card news" aria-labelledby="news-title">
      <h2 id="news-title">Daily News</h2>
      <div class="placeholder">
        <p class="muted">(Placeholder) News will appear here.</p>
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
export class DailyNewsComponent {
}

