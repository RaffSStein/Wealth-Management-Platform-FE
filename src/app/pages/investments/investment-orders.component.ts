import {Component} from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-investment-orders',
  imports: [],
  template: `
    <div class="placeholder"><h1>Orders</h1>
      <p class="muted">(Placeholder) Orders history and status will appear here.</p></div>`,
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
export class InvestmentOrdersComponent {
}

