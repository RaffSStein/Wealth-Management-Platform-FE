import {Component} from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-transactions',
  imports: [],
  template: `
    <div class="placeholder">
      <h1>Transactions</h1>
      <p class="muted">(Placeholder) Account and securities transaction history.</p>
    </div>
  `,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }`]
})
export class TransactionsComponent {
}


