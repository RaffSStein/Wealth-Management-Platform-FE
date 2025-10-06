import {Injectable, signal} from '@angular/core';

/**
 * RegistrationStateService
 * - Temporarily stores the email of the just registered user
 * - Uses sessionStorage so it survives a simple page refresh (not a new browser session)
 * - The information is "consumed" (removed) on the first explicit read
 */
@Injectable({providedIn: 'root'})
export class RegistrationStateService {
  private static readonly KEY = 'wm.reg.email';
  lastEmail = signal<string | null>(this.readSession());

  setEmail(email: string) {
    const clean = (email || '').trim();
    this.lastEmail.set(clean || null);
    try {
      if (clean) sessionStorage.setItem(RegistrationStateService.KEY, clean);
      else sessionStorage.removeItem(RegistrationStateService.KEY);
    } catch { /* ignore */ }
  }

  /** Returns and removes the stored email (one-shot). */
  consumeEmail(): string | null {
    const v = this.lastEmail();
    this.clear();
    return v;
  }

  clear() {
    this.lastEmail.set(null);
    try { sessionStorage.removeItem(RegistrationStateService.KEY); } catch { /* ignore */ }
  }

  private readSession(): string | null {
    try {
      const v = sessionStorage.getItem(RegistrationStateService.KEY);
      return v && v.trim() ? v.trim() : null;
    } catch {
      return null;
    }
  }
}
