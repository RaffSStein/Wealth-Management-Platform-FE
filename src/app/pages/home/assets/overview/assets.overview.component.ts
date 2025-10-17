import {Component, ElementRef, ViewChild, computed, signal} from '@angular/core';
import {CommonModule} from '@angular/common';

/**
 * Assets Overview widget (standalone)
 * - Contains KPIs and allocation donut with interactive tooltip and legend
 * - Self-contained styles to preserve appearance
 */
@Component({
  selector: 'app-assets-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card assets-overview" aria-labelledby="assets-title">
      <h2 id="assets-title">Assets Overview</h2>
      <div class="kpis">
        <div class="kpi">
          <span class="label">Total</span>
          <span class="value">{{ total() | number:'1.0-0' }} €</span>
        </div>
        <div class="kpi" [class.positive]="gainLoss() >= 0" [class.negative]="gainLoss() < 0">
          <span class="label">Gain/Loss</span>
          <span class="value">{{ gainLoss() >= 0 ? '+' : '' }}{{ gainLoss() | number:'1.0-0' }} €</span>
          <span class="muted small">({{ gainLossPerc() | number:'1.1-2' }}%)</span>
        </div>
        <div class="kpi">
          <span class="label">Available Cash</span>
          <span class="value">{{ segmentValue('cash') | number:'1.0-0' }} €</span>
        </div>
      </div>
      <div class="allocation">
        <div class="donut-wrapper" #donutWrapper (mouseleave)="clearHover()">
          <svg viewBox="0 0 42 42" class="donut-svg" role="img" aria-label="Asset allocation interactive donut">
            <title>Asset Allocation</title>
            <circle class="ring" cx="21" cy="21" r="15.915"/>
            @for (seg of segmentsWithLayout(); track segTrack($index, seg)) {
              <circle
                class="segment"
                [class.dimmed]="hovered() && hovered()!==seg.key"
                [attr.data-key]="seg.key"
                cx="21" cy="21" r="15.915"
                [attr.stroke-dasharray]="(donutReady()? seg.percent : 0) + ' ' + (100 - (donutReady()? seg.percent : 0))"
                [attr.stroke-dashoffset]="-25 - seg.start"
                [attr.stroke]="seg.color"
                (mouseenter)="hover(seg.key)"
                (focus)="hover(seg.key)"
                (mousemove)="onSegmentMove($event)"
                tabindex="0"
                role="listitem"
                [attr.aria-label]="seg.label + ' ' + (seg.percent | number:'1.0-0') + ' percent, value ' + (seg.value | number:'1.0-0') + ' euro'"
              />
            }
            <g class="center-group" aria-hidden="true">
              <text x="21" y="18" text-anchor="middle" class="center-label__small">Account</text>
              <text x="21" y="23.5" text-anchor="middle" class="center-label__acct">{{ accountNumberShort() }}</text>
            </g>
          </svg>
          @if (hovered(); as hk) {
            <div class="tooltip" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()" role="tooltip">
              <div class="tooltip__inner">
                <strong>{{ segmentLabel(hk) }}</strong>
                <div class="line">Value: {{ segmentValue(hk) | number:'1.0-0' }} €</div>
                <div class="line">Percent: {{ segmentPercent(hk) | number:'1.0-0' }}%</div>
              </div>
            </div>
          }
        </div>
        <div class="legend-boxes" (mouseleave)="clearHover()">
          @for (seg of segments(); track segTrack($index, seg)) {
            <div class="legend-box" (mouseenter)="hover(seg.key, true)" (focus)="hover(seg.key, true)" tabindex="0"
                 [attr.aria-label]="'Show '+seg.label+' details'" [class.is-active]="hovered()===seg.key">
              <span class="color" [style.background]="seg.color" [style.border-color]="seg.color"></span>
              <span class="lbl">{{ seg.label }}</span>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Card container and headings to preserve look */
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem 1.1rem;
      display: grid;
      gap: .75rem;
      box-shadow: var(--shadow);
    }

    h2 {
      margin: 0;
      font-size: 1.05rem;
      color: var(--color-heading);
      letter-spacing: .5px;
    }

    /* KPIs */
    .kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .kpi {
      display: flex;
      flex-direction: column;
      font-size: .85rem;
    }

    .kpi .label {
      color: var(--color-text-muted);
    }

    .kpi .value {
      font-weight: 600;
      font-size: .95rem;
    }

    .kpi.positive .value, .positive {
      color: #1a7f37;
    }

    .kpi.negative .value, .negative {
      color: var(--color-danger);
    }

    .small {
      font-size: .7rem;
    }

    /* Allocation donut chart */
    .allocation {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .donut-wrapper {
      position: relative;
      width: 200px;
      height: 200px;
    }

    .donut-svg {
      width: 100%;
      height: 100%;
    }

    .ring {
      fill: none;
      stroke: var(--color-border);
      stroke-width: 3;
      opacity: .35;
    }

    .segment {
      fill: none;
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dasharray .8s ease-out, opacity .25s ease;
    }

    .segment.portfolio {
      stroke: var(--color-primary);
    }

    .segment.cash {
      stroke: var(--color-secondary);
    }

    .segment.dimmed {
      opacity: .35;
    }

    .center-group {
      pointer-events: none;
    }

    .center-label__small {
      font-size: 2.4px;
      font-weight: 400;
      letter-spacing: .6px;
      text-transform: uppercase;
      fill: var(--color-text-muted);
    }

    .center-label__acct {
      font-size: 5px;
      font-weight: 600;
      fill: var(--color-heading);
    }

    /* Legend boxes */
    .legend-boxes {
      display: flex;
      flex-direction: column;
      gap: .55rem;
    }

    .legend-box {
      display: flex;
      align-items: center;
      gap: .55rem;
      font-size: .7rem;
      cursor: pointer;
      user-select: none;
      padding: .4rem .55rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface-alt);
      transition: background .2s ease, border-color .2s ease;
    }

    .legend-box:hover, .legend-box.is-active {
      background: var(--color-surface);
      border-color: var(--color-primary);
    }

    .legend-box:focus {
      outline: none;
      box-shadow: var(--ring);
    }

    .legend-box .color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid var(--color-border);
      display: inline-block;
    }

    .legend-box .color.portfolio {
      background: var(--color-primary);
    }

    .legend-box .color.cash {
      background: var(--color-secondary);
    }

    .legend-box .lbl {
      font-weight: 500;
      letter-spacing: .3px;
    }

    /* Tooltip */
    .tooltip {
      position: absolute;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 20;
    }

    .tooltip__inner {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      padding: .45rem .6rem;
      border-radius: 6px;
      box-shadow: var(--shadow);
      font-size: .65rem;
      display: grid;
      gap: .15rem;
      min-width: 120px;
    }

    .tooltip__inner strong {
      font-size: .7rem;
    }

    .tooltip__inner:after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      width: 10px;
      height: 8px;
      background: inherit;
      clip-path: polygon(50% 100%, 0 0, 100% 0);
      border-left: 1px solid var(--color-border);
      border-right: 1px solid var(--color-border);
      border-bottom: 1px solid var(--color-border);
    }
  `]
})
export class AssetsOverviewComponent {
  @ViewChild('donutWrapper') donutWrapper?: ElementRef<HTMLElement>;

  // Segment model
  private readonly baseSegments = signal<ReadonlyArray<{ key: string; label: string; value: number; color: string }>>([
    {key: 'portfolio', label: 'Portfolio', value: 35000, color: 'var(--color-primary)'},
    {key: 'cash', label: 'Cash', value: 15000, color: 'var(--color-secondary)'}
  ]);
  segments = computed(() => this.baseSegments());
  total = computed(() => this.segments().reduce((s, a) => s + a.value, 0));
  // Percent layout (ensure sum=100 adjusting last)
  segmentsWithLayout = computed(() => {
    const segs = this.segments();
    let cumulative = 0;
    const result: { key: string; label: string; value: number; color: string; percent: number; start: number }[] = [];
    let i = 0;
    for (const s of segs) {
      const raw = this.total() > 0 ? (s.value / this.total()) * 100 : 0;
      const pct = i === segs.length - 1 ? Math.max(0, 100 - result.reduce((x, r) => x + r.percent, 0)) : raw;
      result.push({...s, percent: pct, start: cumulative});
      cumulative += pct;
      i++;
    }
    return result;
  });
  segmentLabel = (k: string) => this.segments().find(s => s.key === k)?.label || k;
  segmentValue = (k: string) => this.segments().find(s => s.key === k)?.value || 0;
  segmentPercent = (k: string) => this.segmentsWithLayout().find(s => s.key === k)?.percent || 0;
  segTrack = (_: any, s: any) => s.key;

  // Account number mock
  private readonly fullAccountNumber = signal(this.generateAccountNumber());
  accountNumberShort = computed(() => this.fullAccountNumber().slice(-5));

  private generateAccountNumber(): string {
    // Pseudo IBAN-like placeholder (not real IBAN validation)
    const rand = (n: number) => Array.from({length: n}, () => Math.floor(Math.random() * 10)).join('');
    return 'IT60X' + rand(10) + rand(10); // simplified
  }

  // Existing gain/loss signals reuse total()
  gainLoss = signal(1200);
  gainLossPerc = computed(() => this.gainLoss() / (this.total() - this.gainLoss()) * 100);

  hovered = signal<string | null>(null);
  donutReady = signal(false);

  constructor() {
    // Delay to animate donut segments
    setTimeout(() => this.donutReady.set(true), 20);
  }

  hover(k: string, fromLegend = false) {
    this.hovered.set(k);
    if (fromLegend) this.computeTooltipMidpoint();
  }

  onSegmentMove(ev: MouseEvent) {
    if (!this.hovered()) return;
    const rect = this.donutWrapper?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    this.setTooltipClamped(x, y, rect.width, rect.height);
  }

  clearHover() {
    this.hovered.set(null);
  }

  private readonly donutSize = 200; // px reference for midpoint calc
  private readonly radius = 200 / 2 * 0.62;
  tooltipX = signal(100);
  tooltipY = signal(100);

  private computeTooltipMidpoint() {
    const key = this.hovered();
    if (!key) return;
    const seg = this.segmentsWithLayout().find(s => s.key === key);
    if (!seg) return;
    const mid = seg.start + seg.percent / 2; // percent
    const angleDeg = -90 + mid * 3.6;
    const rad = angleDeg * Math.PI / 180;
    const cx = this.donutSize / 2;
    const cy = this.donutSize / 2;
    const x = cx + this.radius * Math.cos(rad);
    const y = cy + this.radius * Math.sin(rad);
    this.setTooltipClamped(x, y, this.donutSize, this.donutSize);
  }

  private setTooltipClamped(x: number, y: number, w: number, h: number) {
    const m = 10; // margin
    const clampedX = Math.min(w - m, Math.max(m, x));
    const clampedY = Math.min(h - m, Math.max(m, y));
    this.tooltipX.set(clampedX);
    this.tooltipY.set(clampedY);
  }
}

