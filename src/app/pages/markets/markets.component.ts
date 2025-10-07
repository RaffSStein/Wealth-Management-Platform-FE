import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-markets',
  imports: [CommonModule],
  template: `
    <div class="placeholder">
      <h1>News / Markets</h1>
      <p class="muted">(Placeholder) Market data and news feed will appear here.</p>
    </div>
  `,
  styles: [`.placeholder {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }`]
})
export class MarketsComponent {
}
