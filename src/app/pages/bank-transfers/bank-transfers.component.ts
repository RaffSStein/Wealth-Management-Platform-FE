import {Component} from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-bank-transfers',
  imports: [],
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

