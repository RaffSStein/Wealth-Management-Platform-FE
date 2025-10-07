import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
@Component({
  standalone: true,
  selector: 'app-assets',
  imports: [CommonModule],
  template: `
    <div class="placeholder">
      <h1>Assets Overview</h1>
      <p class="muted">(Placeholder) Detailed aggregated assets view will appear here.</p>
    </div>
  `,
  styles: [`.placeholder{padding:2rem;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);}`]
})
export class AssetsComponent {}
