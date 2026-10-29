import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CustomerSessionService } from './customer-session.service';

export type OnboardingStepKey = 'personal-details' | 'financial-information' | 'investment-goals' | 'mifid-questionnaire' | 'risk-assessment';

/**
 * Unsaved onboarding form values, kept in sessionStorage (this tab only) so a reload or "Exit" doesn't lose typing.
 * Drafts are scoped to the working customer ('new' before the customer exists), so one customer's values never
 * show up in another's onboarding. Clear a step's draft once it is saved: the BE copy (with row ids) wins from then on.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingFormStateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly customerSession = inject(CustomerSessionService);
  private static readonly PREFIX = 'wm.onboarding.form.';

  private key(step: OnboardingStepKey): string {
    return `${OnboardingFormStateService.PREFIX}${this.customerSession.customer()?.id ?? 'new'}.${step}`;
  }

  load<T = any>(step: OnboardingStepKey): T | null {
    if (!this.isBrowser) return null;
    try {
      const raw = sessionStorage.getItem(this.key(step));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch { return null; }
  }

  save<T = any>(step: OnboardingStepKey, value: T) {
    if (!this.isBrowser) return;
    try {
      sessionStorage.setItem(this.key(step), JSON.stringify(value));
    } catch { /* ignore */ }
  }

  clear(step: OnboardingStepKey) {
    if (!this.isBrowser) return;
    try { sessionStorage.removeItem(this.key(step)); } catch { /* ignore */ }
  }
}
