import {Component} from '@angular/core';
import {Tooltip} from 'primeng/tooltip';

/** Marks a card for a feature that isn't built yet (no data, sample or real, behind it). */
@Component({
  selector: 'app-coming-soon-badge',
  imports: [Tooltip],
  template: `
    <span class="badge num" tabindex="0" pTooltip="Available in a future release" tooltipPosition="top">
      COMING SOON
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex; align-items: center; height: 20px; white-space: nowrap; flex: none; padding: 0 .45rem; border-radius: var(--wmp-radius-sm);
      font-size: .65rem; letter-spacing: .06em; color: var(--wmp-text-muted);
      border: 1px solid var(--wmp-border); cursor: help;
    }
  `]
})
export class ComingSoonBadgeComponent {}
