import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-market-indices',
  imports: [CommonModule],
  template: `
    <div class="placeholder"><h1>Indices</h1>
      <p class="muted">(Placeholder) Major indices overview.</p></div>`,
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
export class MarketIndicesComponent {
}

