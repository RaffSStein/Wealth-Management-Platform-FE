import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-tax-credits',
  imports: [CommonModule],
  template: `
    <div class="placeholder">
      <h1>Tax Credits</h1>
      <p class="muted">(Placeholder) Fiscal credits / carry-forward losses details.</p>
    </div>
  `,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }`]
})
export class TaxCreditsComponent {
}

