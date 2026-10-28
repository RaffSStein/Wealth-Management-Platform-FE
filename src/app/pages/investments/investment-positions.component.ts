import {Component} from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-investment-positions',
  imports: [],
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

