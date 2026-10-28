import {Component, computed, input} from '@angular/core';
import {DecimalPipe} from '@angular/common';

export interface AllocationItem {
  label: string;
  pct: number;
}

/**
 * Stacked allocation bar with legend. Slots use the categorical --wmp-chart-1..4 tokens in the INPUT order
 * (validated palette): colour follows the entity, never its rank, so callers pass a stable order. More than 4 items
 * fold into "Other". Every segment is also labelled in the legend,
 * so identity is never colour-only.
 */
@Component({
  selector: 'app-allocation-bar',
  imports: [DecimalPipe],
  template: `
    <div class="bar" role="img" [attr.aria-label]="ariaLabel()">
      @for (s of slices(); track s.label) {
        <span class="seg" [style.width.%]="s.pct" [style.background]="s.color" [attr.title]="s.label + ' ' + (s.pct | number:'1.0-1') + '%'"></span>
      }
    </div>
    <ul class="legend">
      @for (s of slices(); track s.label) {
        <li><span class="swatch" [style.background]="s.color" aria-hidden="true"></span>
          <span class="label">{{ s.label }}</span><span class="num">{{ s.pct | number:'1.0-1' }}%</span></li>
      }
    </ul>
  `,
  styles: [`
    :host { display: grid; gap: .9rem; }
    .bar { display: flex; gap: 2px; height: 12px; }
    .seg { min-width: 2px; }
    .seg:first-child { border-radius: 4px 0 0 4px; }
    .seg:last-child { border-radius: 0 4px 4px 0; }
    .legend { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; font-size: .85rem; }
    .legend li { display: flex; align-items: center; gap: .5rem; }
    .swatch { width: 10px; height: 10px; border-radius: 2px; flex: none; }
    .label { flex: 1; color: var(--wmp-text-muted); }
  `]
})
export class AllocationBarComponent {
  readonly items = input.required<AllocationItem[]>();
  readonly ariaLabel = input('Asset allocation');

  protected readonly slices = computed(() => {
    const items = this.items();
    const visible = items.length > 4 ? [...items.slice(0, 3), {label: 'Other', pct: items.slice(3).reduce((s, i) => s + i.pct, 0)}] : items;
    return visible.map((s, i) => ({...s, color: `var(--wmp-chart-${i + 1})`}));
  });
}
