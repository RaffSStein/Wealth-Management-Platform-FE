import {Component} from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-tax-credits',
  imports: [],
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

