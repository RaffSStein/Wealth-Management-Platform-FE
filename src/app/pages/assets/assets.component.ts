import {Component} from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-assets',
  imports: [],
  template: `
    <div class="placeholder">
      <h1>Assets Overview</h1>
      <p class="muted">(Placeholder) Detailed aggregated assets view will appear here.</p>
    </div>
  `,
  styles: [`.placeholder{padding:2rem;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);}`]
})
export class AssetsComponent {}
