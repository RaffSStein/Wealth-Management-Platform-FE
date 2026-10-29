import {Component, computed, inject, input} from '@angular/core';
import {Router} from '@angular/router';
import {Button} from 'primeng/button';
import {OnboardingProgressService, OnboardingStep} from '../../../core/services/onboarding-progress.service';
import {WorkspaceContextService} from '../../../core/services/workspace-context.service';
import {busyAction} from '../../../core/services/busy-action';

interface RailStep {
  index: number;
  label: string;
  path: string;
  completed: boolean;
  current: boolean;
  reachable: boolean;
}

/**
 * Layout for the onboarding steps: step rail (vertical on desktop, progress bar on small screens),
 * step header, projected content, optional `[aside]` summary and `[actions]` footer.
 */
@Component({
  selector: 'app-onboarding-layout',
  imports: [Button],
  template: `
    <div class="onb">
      <nav class="rail" aria-label="Onboarding steps">
        <div class="rail__compact">
          <span class="num">Step {{ step() + 1 }} of {{ steps().length }}</span>
          <span class="rail__bar"><span [style.width.%]="percent()"></span></span>
        </div>
        <ol class="rail__list">
          @for (s of steps(); track s.index) {
            <li>
              <button type="button" class="rail__step" [class.is-current]="s.current" [class.is-done]="s.completed"
                      [disabled]="!s.reachable || s.current" [attr.aria-current]="s.current ? 'step' : null"
                      (click)="go(s)">
                <span class="rail__marker num" aria-hidden="true">
                  @if (s.completed && !s.current) {
                    <span class="material-symbols-outlined">check</span>
                  } @else {
                    {{ (s.index + 1).toString().padStart(2, '0') }}
                  }
                </span>
                <span class="rail__label">{{ s.label }}</span>
                @if (s.completed && !s.current) { <span class="wmp-sr-only">(completed)</span> }
              </button>
            </li>
          }
        </ol>
      </nav>

      <div class="main">
        <header class="head">
          <div class="head__text">
            <h1>{{ title() }}</h1>
            @if (subtitle()) { <p>{{ subtitle() }}</p> }
          </div>
          <p-button label="Exit" severity="secondary" [text]="true" ariaLabel="Exit onboarding, resume later"
                    [loading]="exit.pending()" (onClick)="exit()"/>
        </header>
        <div class="body">
          <div class="content"><ng-content/></div>
          <ng-content select="[aside]"/>
        </div>
        <ng-content select="[actions]"/>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .onb { display: flex; min-height: calc(100dvh - var(--wmp-header-h)); }
    .rail { flex: 0 0 260px; border-right: 1px solid var(--wmp-border); padding: 1.5rem .75rem; box-sizing: border-box; }
    .rail__compact { display: none; }
    .rail__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
    .rail__step {
      width: 100%; height: auto; min-height: 44px; display: flex; align-items: center; justify-content: flex-start; gap: .75rem; padding: 0 .75rem;
      background: transparent; border: 1px solid transparent; border-radius: var(--wmp-radius-md);
      color: var(--wmp-text-muted); font-weight: 400; font-size: .9rem; text-align: left; cursor: pointer;
    }
    .rail__step:hover:not(:disabled) { background: var(--wmp-surface); color: var(--wmp-text); }
    .rail__step:disabled { cursor: default; opacity: 1; }
    .rail__step:disabled:not(.is-current):not(.is-done) { opacity: .55; }
    .rail__step.is-current { background: var(--wmp-surface); border-color: var(--wmp-border); color: var(--wmp-text); font-weight: 500; }
    .rail__marker { width: 1.5rem; display: inline-flex; justify-content: center; font-size: .8rem; }
    .rail__step.is-current .rail__marker { color: var(--wmp-primary); }
    .rail__step.is-done .rail__marker { color: var(--wmp-gain); }
    .rail__marker .material-symbols-outlined { font-size: 18px; }
    .main { flex: 1; min-width: 0; padding: 2rem 2.5rem 3rem; box-sizing: border-box; display: grid; gap: 1.5rem; align-content: start; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .head h1 { margin: 0; font-size: 1.75rem; font-weight: 600; }
    .head p { margin: .4rem 0 0; color: var(--wmp-text-muted); max-width: 42rem; }
    .body { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-start; }
    .content { flex: 999 1 520px; min-width: 0; max-width: 820px; }
    @media (max-width: 959.98px) {
      .onb { flex-direction: column; }
      .rail { flex: none; border-right: 0; border-bottom: 1px solid var(--wmp-border); padding: .75rem 1rem; }
      .rail__list { display: none; }
      .rail__compact { display: grid; gap: .4rem; font-size: .8rem; color: var(--wmp-text-muted); }
      .rail__bar { height: 4px; border-radius: 2px; background: var(--wmp-surface-raised); overflow: hidden; }
      .rail__bar span { display: block; height: 100%; background: var(--wmp-primary); }
      .main { padding: 1.25rem 1rem 2rem; }
    }
  `]
})
export class OnboardingLayoutComponent {
  private readonly progress = inject(OnboardingProgressService);
  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceContextService);

  readonly step = input.required<OnboardingStep>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();

  protected readonly steps = computed<RailStep[]>(() => {
    this.progress.progress(); // re-evaluate when progress changes
    return this.progress.steps.map((d, i) => ({
      index: i,
      label: d.label,
      path: d.path,
      completed: this.progress.isStepCompleted(i),
      current: this.step() === i,
      // Going back is always allowed; going forward only to unlocked steps
      reachable: i < this.step() || this.progress.isStepAllowed(i)
    }));
  });

  protected readonly percent = computed(() => ((this.step() + 1) / this.steps().length) * 100);

  /** Leaves without saving the current step: completed steps are on the BE, typing stays in the local draft. */
  protected readonly exit = busyAction(() => this.workspace.exitOnboarding());

  protected go(s: RailStep): void {
    if (s.reachable && !s.current) void this.router.navigateByUrl(s.path);
  }
}
