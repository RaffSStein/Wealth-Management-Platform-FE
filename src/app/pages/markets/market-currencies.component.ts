import {Component} from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-market-currencies',
  imports: [],
  template: `
    <div class="placeholder"><h1>Currencies</h1>
      <p class="muted">(Placeholder) FX rates and moves.</p></div>`,
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
export class MarketCurrenciesComponent {
}

