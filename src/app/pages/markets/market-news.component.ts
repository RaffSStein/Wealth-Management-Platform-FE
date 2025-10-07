import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-market-news',
  imports: [CommonModule],
  template: `
    <div class="placeholder"><h1>Market News</h1>
      <p class="muted">(Placeholder) Latest market news feed.</p></div>`,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }

  .muted {
    color: var(--color-text-muted);
  }`]
})
export class MarketNewsComponent {
}

