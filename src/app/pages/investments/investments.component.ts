import {Component} from '@angular/core';


@Component({
  standalone: true,
  selector: 'app-investments',
  imports: [],
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
