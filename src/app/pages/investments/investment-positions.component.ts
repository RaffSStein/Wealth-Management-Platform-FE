import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-investment-positions',
  imports: [CommonModule],
  template: `
    <div class="placeholder"><h1>Positions</h1>
      <p class="muted">(Placeholder) Open positions will appear here.</p></div>`,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }`]
})
export class InvestmentPositionsComponent {
}

