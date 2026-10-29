import {Injectable, signal, computed, inject, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

export enum OnboardingStep {
  PersonalDetails = 0,
  FinancialInformation = 1,
  InvestmentGoals = 2,
  MifidQuestionnaire = 3,
  RiskAssessment = 4
}

interface StepDescriptor {
  step: OnboardingStep;
  label: string;
  path: string; // absolute path
}

@Injectable({providedIn: 'root'})
export class OnboardingProgressService {
  private static readonly STORAGE_KEY = 'wm.onboarding.progress';
  private static readonly PERSONAL_DETAILS_KEY = 'wm.personalDetails.submitted';
  /** Step status the BE sets once a step succeeds (others: REJECTED, or pending while not reached). */
  private static readonly BE_STEP_DONE = 'DONE';
  /** BE onboarding step whose completion completes each FE step. */
  private static readonly CLOSING_BE_STEP: Record<OnboardingStep, string> = {
    [OnboardingStep.PersonalDetails]: 'PERSONAL_DETAILS',
    [OnboardingStep.FinancialInformation]: 'FINANCIALS',
    [OnboardingStep.InvestmentGoals]: 'GOALS',
    [OnboardingStep.MifidQuestionnaire]: 'MIFID',
    [OnboardingStep.RiskAssessment]: 'FINALIZE'
  };

  readonly steps: StepDescriptor[] = [
    {
      step: OnboardingStep.PersonalDetails,
      label: 'Personal details',
      path: '/onboarding/personal-details'
    },
    {
      step: OnboardingStep.FinancialInformation,
      label: 'Financial information',
      path: '/onboarding/financial-information'
    },
    {
      step: OnboardingStep.InvestmentGoals,
      label: 'Investment goals',
      path: '/onboarding/investment-goals'
    },
    {
      step: OnboardingStep.MifidQuestionnaire,
      label: 'MiFID questionnaire',
      path: '/onboarding/mifid-questionnaire'
    },
    {
      step: OnboardingStep.RiskAssessment,
      label: 'Risk assessment',
      path: '/onboarding/risk-assessment'
    }
  ];

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  progress = signal<boolean[]>(this.load());

  firstIncompleteIndex = computed(() => this.progress().findIndex(v => !v));
  allCompleted = computed(() => this.progress().every(v => v));

  constructor() {
    if (this.isBrowser) {
      this.validateConsistency();
    }
  }

  private load(): boolean[] {
    if (!this.isBrowser) return Array(this.steps.length).fill(false);
    try {
      const raw = localStorage.getItem(OnboardingProgressService.STORAGE_KEY);
      if (!raw) return Array(this.steps.length).fill(false);
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return Array(this.steps.length).fill(false);
      return this.steps.map((_, i) => !!arr[i]);
    } catch {
      return Array(this.steps.length).fill(false);
    }
  }

  private save(progress: boolean[]) {
    if (!this.isBrowser) return;
    try { localStorage.setItem(OnboardingProgressService.STORAGE_KEY, JSON.stringify(progress)); } catch {}
  }

  private validateConsistency() {
    if (!this.isBrowser) return;
    const p = [...this.progress()];
    const personalOk = localStorage.getItem(OnboardingProgressService.PERSONAL_DETAILS_KEY) === '1';
    if (!personalOk && p[OnboardingStep.PersonalDetails]) {
      p[OnboardingStep.PersonalDetails] = false;
      this.progress.set(p);
      this.save(p);
    }
  }

  markPersonalDetailsSubmitted() {
    if (!this.isBrowser) return; // in SSR non facciamo nulla, sarà gestito lato client
    localStorage.setItem(OnboardingProgressService.PERSONAL_DETAILS_KEY, '1');
    this.completeStep(OnboardingStep.PersonalDetails);
  }

  clearPersonalDetailsSubmission() {
    if (!this.isBrowser) return;
    localStorage.removeItem(OnboardingProgressService.PERSONAL_DETAILS_KEY);
    const p = [...this.progress()];
    if (p[OnboardingStep.PersonalDetails]) {
      p[OnboardingStep.PersonalDetails] = false;
      this.progress.set(p);
      this.save(p);
    }
  }

  isStepCompleted(step: OnboardingStep): boolean {
    return this.progress()[step];
  }

  isStepAllowed(target: OnboardingStep): boolean {
    if (target === OnboardingStep.PersonalDetails) return true;
    return this.progress().slice(0, target).every(v => v);
  }

  completeStep(step: OnboardingStep) {
    const curr = [...this.progress()];
    if (!curr[step]) {
      curr[step] = true;
      this.progress.set(curr);
      this.save(curr);
    }
  }

  reset() {
    const base = Array(this.steps.length).fill(false);
    this.progress.set(base);
    this.save(base);
  }

  pathFor(step: OnboardingStep): string {
    return this.steps[step].path;
  }

  firstIncompletePath(): string {
    const idx = this.firstIncompleteIndex();
    return idx === -1 ? this.pathFor(OnboardingStep.RiskAssessment) : this.pathFor(idx as OnboardingStep);
  }

  /**
   * Maps a BE onboarding step (customer-service `OnboardingStep`: INIT, PERSONAL_DETAILS, DOCUMENTS, FINANCIALS,
   * GOALS, MIFID, AML, FINALIZE) to the FE step that handles it. Unknown values return null.
   */
  stepFromBackend(step: string | null | undefined): OnboardingStep | null {
    switch ((step ?? '').toUpperCase()) {
      case 'INIT':
      case 'PERSONAL_DETAILS':
      case 'DOCUMENTS':
        return OnboardingStep.PersonalDetails;
      case 'FINANCIALS':
        return OnboardingStep.FinancialInformation;
      case 'GOALS':
        return OnboardingStep.InvestmentGoals;
      case 'MIFID':
        return OnboardingStep.MifidQuestionnaire;
      case 'AML':
      case 'FINALIZE':
        return OnboardingStep.RiskAssessment;
      default:
        return null;
    }
  }

  /**
   * Rebuilds the local flags from the BE onboarding (`onboarding/active` steps). The flags are per browser, not per
   * customer, so call this whenever the working customer's onboarding is (re)loaded, or stale flags from another
   * customer show as completed. An FE step is done when the BE step that closes it is DONE.
   */
  syncFromBackend(steps: ReadonlyArray<{step?: string; status?: string}> | null | undefined): void {
    const done = new Set((steps ?? [])
      .filter(s => (s.status ?? '').toUpperCase() === OnboardingProgressService.BE_STEP_DONE)
      .map(s => (s.step ?? '').toUpperCase()));
    const next = this.steps.map(d => done.has(OnboardingProgressService.CLOSING_BE_STEP[d.step]));
    this.progress.set(next);
    this.save(next);
    if (!this.isBrowser) return;
    try {
      if (next[OnboardingStep.PersonalDetails]) localStorage.setItem(OnboardingProgressService.PERSONAL_DETAILS_KEY, '1');
      else localStorage.removeItem(OnboardingProgressService.PERSONAL_DETAILS_KEY);
    } catch {}
  }

  stepForPath(path: string): OnboardingStep | null {
    const clean = path.startsWith('/') ? path : '/' + path;
    const found = this.steps.find(s => s.path === clean);
    return found ? found.step : null;
  }
}
