import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingIndicatorService } from '../../core/services/loading-indicator.service';

/** Thin indeterminate bar at the top of the viewport while a navigation or foreground request is pending. */
@Component({
  selector: 'app-loading-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (indicator.visible()) {
      <div class="bar" role="progressbar" aria-label="Loading"><span class="bar__fill"></span></div>
    }
  `,
  styles: [`
    .bar {
      position: fixed; inset: 0 0 auto 0; z-index: 1200; height: 3px; overflow: hidden;
      background: var(--wmp-primary-soft); pointer-events: none;
    }
    .bar__fill {
      position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
      background: var(--wmp-primary);
      animation: wmp-loading-slide 1.1s ease-in-out infinite;
    }
    @keyframes wmp-loading-slide {
      from { transform: translateX(-100%); }
      to { transform: translateX(250%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar__fill { width: 100%; animation: wmp-loading-pulse 1.6s ease-in-out infinite; }
      @keyframes wmp-loading-pulse { 50% { opacity: 0.4; } }
    }
  `]
})
export class LoadingBarComponent {
  protected readonly indicator = inject(LoadingIndicatorService);
}
