import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type OnboardingStepKey = 'personal-details' | 'financial-information' | 'investment-goals' | 'mifid-questionnaire' | 'risk-assessment';

@Injectable({ providedIn: 'root' })
export class OnboardingFormStateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private static readonly PREFIX = 'wm.onboarding.form.';

  load<T = any>(step: OnboardingStepKey): T | null {
    if (!this.isBrowser) return null;
    try {
      const raw = sessionStorage.getItem(OnboardingFormStateService.PREFIX + step);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch { return null; }
  }

  save<T = any>(step: OnboardingStepKey, value: T) {
    if (!this.isBrowser) return;
    try {
      sessionStorage.setItem(OnboardingFormStateService.PREFIX + step, JSON.stringify(value));
    } catch { /* ignore */ }
  }

  clear(step: OnboardingStepKey) {
    if (!this.isBrowser) return;
    try { sessionStorage.removeItem(OnboardingFormStateService.PREFIX + step); } catch { /* ignore */ }
  }

  loadSubmitted<T = any>(step: OnboardingStepKey): T | null {
    if (!this.isBrowser) return null;
    try {
      const raw = sessionStorage.getItem(OnboardingFormStateService.PREFIX + step + '.submitted');
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }

  saveSubmitted<T = any>(step: OnboardingStepKey, value: T) {
    if (!this.isBrowser) return;
    try { sessionStorage.setItem(OnboardingFormStateService.PREFIX + step + '.submitted', JSON.stringify(value)); } catch {}
  }

  clearSubmitted(step: OnboardingStepKey) {
    if (!this.isBrowser) return;
    try { sessionStorage.removeItem(OnboardingFormStateService.PREFIX + step + '.submitted'); } catch {}
  }

  isDirty<T = any>(step: OnboardingStepKey, current: T): boolean {
    const last = this.loadSubmitted<T>(step);
    return JSON.stringify(last ?? {}) !== JSON.stringify(current ?? {});
  }
}
