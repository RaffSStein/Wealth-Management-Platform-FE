import {Component, Input, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {OnboardingProgressService, OnboardingStep} from '../../../core/services/onboarding-progress.service';

interface ViewStep {
  index: number;
  label: string;
  path: string;
  completed: boolean;
  current: boolean;
  locked: boolean;
}

@Component({
  selector: 'app-onboarding-navigator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="onb-timeline" aria-label="Onboarding progress">
      <div class="track">
        <div class="track-progress" [style.width.%]="progressWidth">
          <span class="sr-only">Progress {{ progressWidth | number:'1.0-0' }}%</span>
        </div>
      </div>
      <ul class="steps" role="list">
        <li *ngFor="let s of viewSteps"
            (click)="go(s)"
            [class.completed]="s.completed"
            [class.current]="s.current"
            [class.locked]="s.locked"
            [attr.aria-current]="s.current ? 'step' : null"
            [attr.aria-disabled]="s.locked ? 'true' : null">
          <div class="dot">
            <span class="dot-label" *ngIf="!s.completed || s.current">{{ s.index + 1 }}</span>
            <span class="dot-check" *ngIf="s.completed && !s.current">✓</span>
          </div>
          <div class="label">{{ s.label }}</div>
        </li>
      </ul>
    </nav>
  `,
  styles: [`
    .onb-timeline {
      position: relative;
      width: 100%;
      padding: 0 0 0.5rem;
    }

    .track {
      position: absolute;
      left: 0;
      right: 0;
      top: 18px;
      height: 4px;
      background: linear-gradient(90deg, var(--color-border) 0, var(--color-border) 100%);
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
      position: relative;
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
      opacity: 0.55;
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
      opacity: 0.9;
    }

    .steps li.locked .label {
      opacity: 0.55;
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
export class OnboardingNavigatorComponent {
  @Input({required: true}) currentStep!: OnboardingStep;

  private readonly progress: OnboardingProgressService = inject(OnboardingProgressService);
  private readonly router = inject(Router);

  get viewSteps(): ViewStep[] {
    const steps = this.progress.steps;
    return steps.map((d: any, i: number) => {
      const completed = this.progress.isStepCompleted(i as OnboardingStep);
      const locked = !this.progress.isStepAllowed(i as OnboardingStep);
      return {
        index: i,
        label: d.label,
        path: d.path,
        completed,
        current: this.currentStep === i,
        locked: locked && !completed
      };
    });
  }

  get progressWidth(): number {
    const steps = this.viewSteps;
    const total = steps.length - 1;
    if (total <= 0) return 0;
    // Consider only completed steps (exclude current if not completed) so the bar mostra l'ultimo step effettivamente completato.
    const completed = steps.filter(s => s.completed).map(s => s.index);
    if (!completed.length) return 0;
    const last = Math.max(...completed);
    return Math.min(100, Math.max(0, (last / total) * 100));
  }

  go(s: ViewStep) {
    if (s.locked) return;
    if (s.path) this.router.navigateByUrl(s.path).catch(() => {
    });
  }
}

export {OnboardingStep};
