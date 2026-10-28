import {Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, signal, viewChild} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {AreaSeries, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle, createChart} from 'lightweight-charts';
import {ThemeService} from '../../../core/services/theme.service';
import {ValuePoint} from '../../../core/services/portfolio-data';

/** Resolves a --wmp-* token to a concrete colour (the chart draws on canvas, which can't read CSS variables). */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** #rrggbb + alpha -> rgba() (canvas has no color-mix). */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/*
 * TradingView Lightweight Charts™
 * Copyright (c) 2025 TradingView, Inc. https://www.tradingview.com/
 * Attribution notice required by the library licence. The on-chart logo is disabled; the licence's visible
 * link to tradingview.com is the credit line rendered under the chart instead.
 */

/**
 * Single-series portfolio value area chart (lightweight-charts) with a crosshair tooltip.
 * Colours come from the theme tokens and are re-applied when the theme changes.
 */
@Component({
  selector: 'app-value-chart',
  imports: [DecimalPipe],
  template: `
    <div class="chart" #host role="img" [attr.aria-label]="ariaLabel()">
      @if (hover(); as h) {
        <div class="tip" [style.left.px]="h.x" aria-hidden="true">
          <span class="tip__date">{{ h.date }}</span>
          <span class="num">€{{ h.value | number:'1.0-0' }}</span>
        </div>
      }
    </div>
    <p class="credit">Chart by <a href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView</a></p>
  `,
  styles: [`
    :host { display: block; }
    .chart { position: relative; height: 240px; }
    .tip {
      position: absolute; top: 4px; z-index: 2; transform: translateX(-50%); pointer-events: none;
      display: grid; gap: 2px; padding: .35rem .6rem; white-space: nowrap; font-size: .8rem;
      background: var(--wmp-surface-raised); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-md);
      color: var(--wmp-text);
    }
    .tip__date { color: var(--wmp-text-muted); font-size: .75rem; }
    .credit { margin: .25rem 0 0; text-align: right; font-size: .7rem; color: var(--wmp-text-muted); }
    .credit a { color: inherit; text-decoration: underline; }
  `]
})
export class ValueChartComponent {
  readonly data = input.required<ValuePoint[]>();
  readonly ariaLabel = input('Portfolio value over time');

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly theme = inject(ThemeService);
  private chart: IChartApi | null = null;
  private series: ISeriesApi<'Area'> | null = null;
  protected readonly hover = signal<{ x: number; date: string; value: number } | null>(null);

  constructor() {
    afterNextRender(() => {
      this.chart = createChart(this.host().nativeElement, {
        autoSize: true,
        layout: {attributionLogo: false},
        handleScroll: false,
        handleScale: false,
        crosshair: {mode: CrosshairMode.Magnet},
        rightPriceScale: {borderVisible: false},
        timeScale: {borderVisible: false},
        // Fixed locale: the UI is English, whatever the browser locale
        localization: {locale: 'en-GB', priceFormatter: (v: number) => '€' + Math.round(v).toLocaleString('en-IE')}
      });
      this.series = this.chart.addSeries(AreaSeries, {lineWidth: 2, priceLineVisible: false, lastValueVisible: true});
      this.chart.subscribeCrosshairMove(param => {
        const point = this.series ? param.seriesData.get(this.series) : undefined;
        if (!param.point || !param.time || !point || !('value' in point)) {
          this.hover.set(null);
          return;
        }
        this.hover.set({x: param.point.x, date: String(param.time), value: Number(point.value)});
      });
      this.applyTheme();
      this.series.setData(this.data().map(p => ({time: p.date, value: p.value})));
      this.chart.timeScale().fitContent();
    });

    // Data and theme changes after the first render
    effect(() => {
      const points = this.data();
      if (!this.series || !this.chart) return;
      this.series.setData(points.map(p => ({time: p.date, value: p.value})));
      this.chart.timeScale().fitContent();
    });
    effect(() => {
      this.theme.theme();
      // Wait one frame so the html class (and the CSS variables) are switched before reading them
      requestAnimationFrame(() => this.applyTheme());
    });

    inject(DestroyRef).onDestroy(() => {
      this.chart?.remove();
      this.chart = null;
      this.series = null;
    });
  }

  private applyTheme(): void {
    if (!this.chart || !this.series) return;
    const primary = token('--wmp-primary');
    const text = token('--wmp-text-muted');
    const grid = token('--wmp-border');
    this.chart.applyOptions({
      layout: {
        background: {type: ColorType.Solid, color: 'transparent'},
        textColor: text,
        fontFamily: token('--wmp-font-mono') || 'monospace',
        fontSize: 11
      },
      grid: {vertLines: {visible: false}, horzLines: {color: withAlpha(grid, 0.6), style: LineStyle.Solid}},
      crosshair: {
        vertLine: {color: text, labelBackgroundColor: token('--wmp-surface-raised')},
        horzLine: {color: text, labelBackgroundColor: token('--wmp-surface-raised')}
      }
    });
    this.series.applyOptions({lineColor: primary, topColor: withAlpha(primary, 0.28), bottomColor: withAlpha(primary, 0)});
  }
}
