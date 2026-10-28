import {Component} from '@angular/core';
import {Tooltip} from 'primeng/tooltip';

/** Marks a card whose figures are illustrative (no portfolio/market BE services yet). */
@Component({
  selector: 'app-sample-badge',
  imports: [Tooltip],
  template: `
    <span class="badge num" tabindex="0" pTooltip="Illustrative values until portfolio services are live" tooltipPosition="top">
      SAMPLE DATA
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex; align-items: center; height: 20px; white-space: nowrap; flex: none; padding: 0 .45rem; border-radius: var(--wmp-radius-sm);
      font-size: .65rem; letter-spacing: .06em; color: var(--wmp-warning);
      border: 1px solid color-mix(in srgb, var(--wmp-warning), transparent 55%); cursor: help;
    }
  `]
})
export class SampleBadgeComponent {}
