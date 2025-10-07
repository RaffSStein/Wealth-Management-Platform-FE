import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-investments',
  imports: [CommonModule],
  template: `
    <div class="placeholder">
      <h1>Investments</h1>
      <p class="muted">(Placeholder) Investment portfolio will be displayed here.</p>
    </div>
  `,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }`]
})
export class InvestmentsComponent {
}
