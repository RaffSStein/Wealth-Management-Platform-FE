import {Injectable, signal, computed} from '@angular/core';

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

  private load(): boolean[] {
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
    try {
      localStorage.setItem(OnboardingProgressService.STORAGE_KEY, JSON.stringify(progress));
    } catch {
    }
  }

  progress = signal<boolean[]>(this.load());

  firstIncompleteIndex = computed(() => this.progress().findIndex(v => !v));
  allCompleted = computed(() => this.progress().every(v => v));

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

  stepForPath(path: string): OnboardingStep | null {
    const clean = path.startsWith('/') ? path : '/' + path;
    const found = this.steps.find(s => s.path === clean);
    return found ? found.step : null;
  }
}
