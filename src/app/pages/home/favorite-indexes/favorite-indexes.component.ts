import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';

export interface FavoriteIndex {
  name: string;
  value: number;
  change: number;
}

@Component({
  selector: 'app-favorite-indexes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card indexes" aria-labelledby="indexes-title">
      <header class="card-header">
        <h2 id="indexes-title">Favorite Indexes</h2>
        <button type="button" class="icon-btn settings" (click)="goToIndices()" aria-label="Open indices page">
          <span class="material-symbols-outlined" aria-hidden="true">settings</span>
        </button>
      </header>

      <div class="box-row" role="list" aria-label="Favorite indexes list">
        @for (idx of pageItems(); track idx.name) {
          <div class="idx-wrap" role="listitem">
            <button type="button" class="idx-box"
                    (click)="openIndex(idx)" [attr.aria-label]="'Open ' + idx.name">
              <span class="name">{{ idx.name }}</span>
              <span class="val" [class.positive]="idx.change >= 0" [class.negative]="idx.change < 0">
                {{ idx.value | number:'1.2-2' }}
              </span>
              <span class="delta" [class.positive]="idx.change >= 0" [class.negative]="idx.change < 0"
                    [attr.aria-label]="(idx.change >= 0 ? 'Up ' : 'Down ') + (idx.change | number:'1.2-2') + '%'">
                <span class="arrow" aria-hidden="true">{{ idx.change >= 0 ? '▲' : '▼' }}</span>
                {{ idx.change >= 0 ? '+' : '' }}{{ idx.change | number:'1.2-2' }}%
              </span>
            </button>
          </div>
        }
      </div>

      @if (totalPages > 1) {
        <div class="pager" role="tablist" aria-label="Indexes pages">
          @for (_ of pageArray(); track $index; let i = $index) {
            <button type="button" class="dot" role="tab"
                    [class.active]="i === page" [attr.aria-selected]="i === page"
                    (click)="goToPage(i)" [attr.aria-label]="'Go to page ' + (i+1)"></button>
          }
        </div>
      }

      <button type="button" class="icon-btn play" (click)="toggleAuto()"
              [attr.aria-pressed]="autoPlay" [attr.aria-label]="autoPlay ? 'Pause slideshow' : 'Play slideshow'">
        <span class="material-symbols-outlined" aria-hidden="true">{{ autoPlay ? 'pause' : 'play_arrow' }}</span>
      </button>

      @if (!indexes.length) {
        <p class="muted">No indexes configured.</p>
      }
    </section>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .indexes {
      position: relative;
      padding-bottom: 2.2rem;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 0 .5rem;
      padding: 10px 20px .25rem;
    }

    .card-header h2 {
      margin: 0;
      font-size: 1.05rem;
      color: var(--color-heading);
      letter-spacing: .5px;
    }

    .icon-btn {
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: .2rem;
      border-radius: 6px;
    }

    .icon-btn:hover {
      color: var(--color-text);
      background: var(--color-surface-alt);
    }

    .icon-btn:focus {
      outline: none;
      box-shadow: var(--ring);
    }

    .box-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      align-items: stretch;
      gap: .8rem;
      margin: 20px 20px 20px;
    }

    .idx-wrap {
      min-width: 0;
    }

    .idx-box {
      width: 100%;
      height: 100%;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-surface);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: .7rem;
      gap: .35rem;
      cursor: pointer;
      transition: background .15s, border-color .15s;
      box-sizing: border-box;
    }

    .idx-box:hover {
      background: var(--color-surface-alt);
      border-color: var(--color-primary);
    }

    .idx-box:focus {
      outline: none;
      box-shadow: var(--ring);
    }

    .name {
      font-weight: 600;
      color: var(--color-heading);
      letter-spacing: .2px;
      text-align: center;
      width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
      padding: 0 .4rem;
      font-size: 1rem;
      line-height: 1.15;
    }

    .val {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 1.25rem;
      width: 100%;
      text-align: center;
    }

    .val.positive {
      color: var(--color-success);
    }

    .val.negative {
      color: var(--color-danger);
    }

    .delta {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      font-size: .95rem;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      text-align: center;
    }

    .delta .arrow {
      font-size: .9em;
      line-height: 1;
      margin-right: .3rem;
    }

    .delta.positive {
      color: #1a7f37;
    }

    .delta.negative {
      color: var(--color-danger);
    }

    .pager {
      position: absolute;
      left: 50%;
      bottom: .5rem;
      transform: translateX(-50%);
      display: inline-flex;
      gap: .45rem;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      cursor: pointer;
      padding: 0;
    }

    .dot.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }

    .play {
      position: absolute;
      right: .5rem;
      bottom: .45rem;
    }

    .muted {
      color: var(--color-text-muted);
      margin: .5rem 0 0;
    }
  `]
})
export class FavoriteIndexesComponent implements OnChanges, OnDestroy {
  @Input() indexes: ReadonlyArray<FavoriteIndex> = [];

  pageSize = 4; // 4 fissi per pagina
  page = 0;
  autoPlay = false;
  private autoTimer: any = null;

  constructor(private readonly router: Router) {
  }

  get totalPages(): number {
    return Math.ceil((this.indexes?.length ?? 0) / this.pageSize) || 0;
  }

  pageItems(): ReadonlyArray<FavoriteIndex> {
    const start = this.page * this.pageSize;
    return (this.indexes || []).slice(start, start + this.pageSize);
  }

  pageArray(): undefined[] {
    return Array.from({length: this.totalPages});
  }

  goToPage(i: number) {
    if (i < 0 || i >= this.totalPages) {
      return;
    }
    this.page = i;
  }

  nextPage() {
    if (this.totalPages <= 1) {
      return;
    }
    this.page = (this.page + 1) % this.totalPages;
  }

  toggleAuto() {
    this.autoPlay ? this.stopAuto() : this.startAuto();
  }

  private startAuto() {
    if (this.autoTimer || this.totalPages <= 1) {
      return;
    }
    this.autoPlay = true;
    this.autoTimer = setInterval(() => this.nextPage(), 4000);
  }

  private stopAuto() {
    this.autoPlay = false;
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  goToIndices() {
    this.router.navigate(['/app/news-markets/indices']);
  }

  openIndex(idx: FavoriteIndex) {
    this.router.navigate(['/app/news-markets/indices'], {queryParams: {q: idx.name}});
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['indexes']) {
      const tp = this.totalPages;
      if (this.page >= tp) this.page = Math.max(0, tp - 1);
      if (tp <= 1) this.stopAuto();
    }
  }

  ngOnDestroy() {
    this.stopAuto();
  }
}
