import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-securities-transfer',
  imports: [CommonModule],
  template: `
    <div class="placeholder">
      <h1>Securities Transfer</h1>
      <p class="muted">(Placeholder) Operations to transfer securities between accounts.</p>
    </div>
  `,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }`]
})
export class SecuritiesTransferComponent {
}

