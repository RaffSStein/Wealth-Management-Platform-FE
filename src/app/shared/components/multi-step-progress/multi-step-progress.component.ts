import {Component, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-multi-step-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="onb-timeline" aria-label="Registration progress">
      <div class="track">
        <div class="track-progress" [style.width.%]="progressWidth">
          <span class="sr-only">Progress {{ progressWidth | number:'1.0-0' }}%</span>
        </div>
      </div>
      <ul class="steps" role="list">
        @for (label of steps; track $index; let i = $index) {
          <li (click)="onClick(i)"
              [class.completed]="i < currentIndex"
              [class.current]="i === currentIndex"
              [class.locked]="i > currentIndex"
              [attr.aria-current]="i === currentIndex ? 'step' : null"
              [attr.aria-disabled]="i > currentIndex ? 'true' : null"
              [attr.tabindex]="i <= currentIndex ? 0 : -1"
              (keydown.enter)="onKey(i)" (keydown.space)="onKey(i)">
            <div class="dot">
              @if (i < currentIndex) {
                <span class="dot-check">✓</span>
              } @else {
                <span class="dot-label">{{ i + 1 }}</span>
              }
            </div>
            <div class="label">{{ label }}</div>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    .onb-timeline {
      position: relative;
      width: 100%;
      padding: 0 0 0.75rem;
    }

    .track {
      position: absolute;
      left: 0;
      right: 0;
      top: 18px;
      height: 4px;
      background: var(--color-border);
      border-radius: 2px;
    }

    .track-progress {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: var(--color-primary);
      border-radius: 2px 0 0 2px;
      min-width: 0;
      transition: width .35s ease;
    }

    .track-progress::after {
      content: '';
      position: absolute;
      right: -10px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 10px solid var(--color-primary);
      border-top: 7px solid transparent;
      border-bottom: 7px solid transparent;
    }

    .track-progress[style*='width: 0']::after, .track-progress[style*='width: 0%']::after {
      display: none;
    }

    .steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }

    .steps li {
      flex: 1 1 auto;
      position: relative;
      text-align: center;
      cursor: pointer;
      user-select: none;
      outline: none;
    }

    .steps li.locked {
      cursor: not-allowed;
    }

    .dot {
      width: 36px;
      height: 36px;
      margin: 0 auto 0.35rem;
      border-radius: 50%;
      background: var(--color-surface-alt, var(--color-surface));
      border: 2px solid var(--color-border);
      display: grid;
      place-items: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text);
      transition: border-color .25s, background .25s, color .25s;
    }

    .steps li.current .dot {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 35%, transparent);
    }

    .steps li.completed:not(.current) .dot {
      background: var(--color-success, var(--color-primary));
      border-color: var(--color-success, var(--color-primary));
      color: var(--color-primary-contrast);
    }

    .steps li.locked .dot {
      background: var(--color-border);
      border-color: var(--color-border);
      color: var(--color-text);
      opacity: .55;
    }

    .dot-check {
      font-size: 0.9rem;
      line-height: 1;
    }

    .label {
      font-size: 0.65rem;
      font-weight: 500;
      line-height: 1.15;
      max-width: 90px;
      margin: 0 auto;
      color: var(--color-text);
      opacity: .9;
    }

    .steps li.locked .label {
      opacity: .55;
    }

    .steps li.current .label {
      color: var(--color-primary);
    }

    .steps li.completed:not(.current) .label {
      color: var(--color-success, var(--color-primary));
    }

    @media (min-width: 680px) {
      .label {
        font-size: 0.7rem;
        max-width: 140px;
      }
    }

    @media (min-width: 900px) {
      .label {
        font-size: 0.75rem;
      }
    }

    .steps li:hover:not(.locked):not(.current) .dot {
      border-color: var(--color-primary);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class MultiStepProgressComponent {
  @Input({required: true}) steps: string[] = [];
  @Input({required: true}) currentIndex = 0;
  @Output() stepClick = new EventEmitter<number>();

  get progressWidth(): number {
    if (!this.steps || this.steps.length <= 1) return 0;
    const total = this.steps.length - 1;
    return Math.min(100, Math.max(0, (this.currentIndex / total) * 100));
  }

  onClick(i: number) {
    if (i < this.currentIndex) this.stepClick.emit(i);
  }

  onKey(i: number) {
    this.onClick(i);
  }
}
