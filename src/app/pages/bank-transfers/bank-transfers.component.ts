import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-bank-transfers',
  imports: [CommonModule],
  template: `
    <div class="placeholder">
      <h1>Bank Transfers</h1>
      <p class="muted">(Placeholder) Functionality to initiate bank transfers will appear here.</p>
    </div>
  `,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }`]
})
export class BankTransfersComponent {
}

