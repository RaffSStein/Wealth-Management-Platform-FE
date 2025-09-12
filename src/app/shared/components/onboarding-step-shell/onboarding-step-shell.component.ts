import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OnboardingNavigatorComponent} from '../onboarding-navigator/onboarding-navigator.component';
import {OnboardingStep} from '../../../core/services/onboarding-progress.service';

@Component({
  selector: 'app-onboarding-step-shell',
  standalone: true,
  imports: [CommonModule, OnboardingNavigatorComponent],
  template: `
    <section class="onb-shell">
      <div class="panel">
        <h1 class="title">
          <span class="step-badge">{{ stepIndex + 1 }}</span>
          {{ title }}
        </h1>
        <p class="muted" *ngIf="subtitle">{{ subtitle }}</p>
        <app-onboarding-navigator [currentStep]="stepIndex"></app-onboarding-navigator>
        <ng-content/>
      </div>
    </section>
  `,
  styles: [`
    .onb-shell {
      min-height: 100dvh;
      padding: 2rem;
      background: var(--color-bg);
      display: grid;
      place-items: flex-start center;
    }

    .panel {
      width: 100%;
      max-width: 960px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.5rem 1.75rem;
      display: grid;
      gap: 0.85rem;
    }

    .title {
      margin: 0;
      font-size: 1.9rem;
      line-height: 1.25;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .step-badge {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      font-size: 0.85rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .muted {
      margin: 0;
      font-size: 0.8rem;
      opacity: 0.8;
    }

    ::ng-deep .placeholder {
      margin: 0;
      font-size: 0.75rem;
      background: var(--color-surface-alt, var(--color-surface));
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius);
      border: 1px dashed var(--color-border);
    }

    ::ng-deep .primary {
      height: 42px;
      border: 1px solid var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      font-weight: 600;
      border-radius: var(--radius);
      cursor: pointer;
    }

    ::ng-deep .primary[disabled] {
      opacity: .6;
      cursor: default;
    }
  `]
})
export class OnboardingStepShellComponent {
  @Input({required: true}) stepIndex!: OnboardingStep;
  @Input({required: true}) title!: string;
  @Input() subtitle: string | null = null;
}

