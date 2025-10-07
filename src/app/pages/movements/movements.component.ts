import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

/**
 * DEPRECATED: This legacy component (MovementsComponent) was replaced by TransactionsComponent (path: /app/transactions).
 * It is kept temporarily for backward compatibility and should be removed once old references are cleaned up.
 */
@Component({
  standalone: true,
  selector: 'app-movements-legacy',
  imports: [CommonModule],
  template: `
    <div class="placeholder">
      <h1>Transactions (Legacy Placeholder)</h1>
      <p class="muted">(Deprecated) Use the new Transactions section instead.</p>
    </div>
  `,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }`]
})
export class MovementsComponent {
}
