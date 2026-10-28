import {Component} from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-investment-allocation',
  imports: [],
  template: `
    <div class="placeholder"><h1>Allocation</h1>
      <p class="muted">(Placeholder) Asset allocation breakdown.</p></div>`,
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
export class InvestmentAllocationComponent {
}

