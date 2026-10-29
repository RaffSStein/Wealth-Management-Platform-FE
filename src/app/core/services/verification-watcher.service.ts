import { Injectable, NgZone, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerDTO, CustomerService } from '../../api/customer-service';
import { BACKGROUND_REQUEST } from '../interceptors/loading.context';
import { AuthService } from './auth.service';
import { CustomerSessionService } from './customer-session.service';
import { NotificationService } from './notification.service';
import { ToastService } from '../../shared/services/toast.service';

/**
 * - pending: just submitted, checking often
 * - slow: taking longer than usual, still checking in the background
 * - stalled: gave up checking automatically (checkNow() restarts)
 * - active / rejected: the AML outcome
 */
export type VerificationState = 'pending' | 'slow' | 'stalled' | 'active' | 'rejected';

/** Poll schedule: every 1.5 s for 20 s, then every 5 s up to 2 min, then every 30 s; give up after 30 min. */
export const VERIFICATION_SLOW_AFTER_MS = 20_000;
const MEDIUM_AFTER_MS = 120_000;
const GIVE_UP_AFTER_MS = 30 * 60_000;
function delayFor(elapsed: number): number {
  if (elapsed < VERIFICATION_SLOW_AFTER_MS) return 1500;
  return elapsed < MEDIUM_AFTER_MS ? 5000 : 30_000;
}

const RISK_ASSESSMENT_PATH = '/onboarding/risk-assessment';

/**
 * Follows a customer's AML verification after the MiFID submit (PENDING_VERIFICATION -> ACTIVE | REJECTED, set
 * asynchronously by the BE). The BE has no push channel yet, so this polls GET /customer/{id} in the background for
 * as long as the app is open, even after the user leaves the risk assessment page, and reports the outcome as a toast
 * plus a notification. It also resumes for a selected customer that is still pending (e.g. after a reload).
 */
@Injectable({providedIn: 'root'})
export class VerificationWatcherService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly customerApi = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly customerSession = inject(CustomerSessionService);
  private readonly notifications = inject(NotificationService);
  private readonly toast = inject(ToastService);

  private readonly states = signal<ReadonlyMap<string, VerificationState>>(new Map());
  private readonly running = new Set<string>();
  /** Ends the current wait of a running watch (checkNow). */
  private readonly wakeups = new Map<string, () => void>();

  constructor() {
    if (!this.browser) return;
    // Resume for a selected customer still waiting for the AML check (reload, customer opened from the list)
    effect(() => {
      const c = this.customerSession.customer();
      if (c?.id && c.customerStatus === 'PENDING_VERIFICATION') untracked(() => this.watch(c.id!));
    });
  }

  /** Verification state for a customer, or null when it isn't being followed. Reactive (reads a signal). */
  stateFor(customerId: string | null | undefined): VerificationState | null {
    return customerId ? this.states().get(customerId) ?? null : null;
  }

  /**
   * Starts following a customer's verification (no-op if already running).
   * `justSubmitted`: right after the MiFID submit the status may still read DRAFT for a moment; keep waiting then.
   */
  watch(customerId: string, options: {justSubmitted?: boolean} = {}): void {
    if (!this.browser || this.running.has(customerId)) return;
    void this.run(customerId, !!options.justSubmitted);
  }

  /** Checks right away: wakes a running watch, or restarts a stalled one. */
  checkNow(customerId: string): void {
    const wake = this.wakeups.get(customerId);
    if (wake) wake();
    else this.watch(customerId);
  }

  private async run(customerId: string, justSubmitted: boolean): Promise<void> {
    this.running.add(customerId);
    this.setState(customerId, 'pending');
    const started = Date.now();
    // Notify only for a change seen while waiting, not for a customer that was already verified
    let sawPending = false;
    // Background requests: the page shows its own state, so keep the global loading bar out of it
    const context = new HttpContext().set(BACKGROUND_REQUEST, true);
    try {
      // Stop when the user signs out
      while (this.auth.token()) {
        let customer: CustomerDTO | null = null;
        try {
          customer = await firstValueFrom(this.customerApi.getCustomerById(customerId, 'body', false, {context}));
        } catch {
          // transient error: keep checking
        }
        const status = customer?.customerStatus;
        if (customer && (status === 'ACTIVE' || status === 'REJECTED')) {
          this.zone.run(() => this.settle(customer!, status === 'ACTIVE' ? 'active' : 'rejected', sawPending));
          return;
        }
        const waiting = !customer || status === 'PENDING_VERIFICATION' || (justSubmitted && status === 'DRAFT');
        if (!waiting) {
          // Not (or no longer) under verification, e.g. a DRAFT that was never submitted
          this.setState(customerId, null);
          return;
        }
        sawPending = true;
        const elapsed = Date.now() - started;
        if (elapsed > GIVE_UP_AFTER_MS) {
          this.setState(customerId, 'stalled');
          return;
        }
        this.setState(customerId, elapsed < VERIFICATION_SLOW_AFTER_MS ? 'pending' : 'slow');
        await this.wait(customerId, delayFor(elapsed));
      }
    } finally {
      this.running.delete(customerId);
      this.wakeups.delete(customerId);
    }
  }

  /** Sleeps outside the Angular zone, so a long-running watch never keeps the app "unstable". */
  private wait(customerId: string, ms: number): Promise<void> {
    return new Promise(resolve => this.zone.runOutsideAngular(() => {
      const timer = setTimeout(done, ms);
      function done() { clearTimeout(timer); resolve(); }
      this.wakeups.set(customerId, done);
    }));
  }

  private settle(customer: CustomerDTO, outcome: 'active' | 'rejected', notify: boolean): void {
    const id = customer.id!;
    this.setState(id, outcome);
    if (this.customerSession.customer()?.id === id) this.customerSession.setCustomer(customer);
    if (!notify) return;

    const name = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.companyName || 'The customer';
    const title = outcome === 'active' ? 'Account verified' : 'Account verification failed';
    const message = outcome === 'active'
      ? `${name}'s account passed the anti-money-laundering check and is now active.`
      : `${name}'s account could not be verified. The advisor will follow up.`;
    this.notifications.add({title, message, timestamp: new Date()});
    // The risk assessment page shows the outcome inline for its own customer: no toast on top of it
    const onPage = this.router.url.startsWith(RISK_ASSESSMENT_PATH) && this.customerSession.customer()?.id === id;
    if (!onPage) {
      if (outcome === 'active') this.toast.success(message);
      else this.toast.error(message);
    }
  }

  private setState(customerId: string, state: VerificationState | null): void {
    this.states.update(current => {
      const next = new Map(current);
      if (state) next.set(customerId, state);
      else next.delete(customerId);
      return next;
    });
  }
}
