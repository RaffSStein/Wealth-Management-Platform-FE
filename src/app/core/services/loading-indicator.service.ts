import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router } from '@angular/router';

/** Busy time before the bar appears, so fast actions don't flicker. */
export const LOADING_SHOW_DELAY_MS = 150;
/** Once shown, the bar stays at least this long, so it doesn't blink. */
export const LOADING_MIN_VISIBLE_MS = 300;

/**
 * App-wide "something is happening" state: busy while a router navigation is pending (lazy chunk, async guards)
 * or a foreground HTTP request is in flight (counted by `loadingInterceptor`). Rendered by `<app-loading-bar>`.
 * Browser only: on the server nothing is tracked, so no timers delay SSR stability.
 */
@Injectable({providedIn: 'root'})
export class LoadingIndicatorService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly navigating = signal(false);
  private readonly requests = signal(0);
  private readonly shown = signal(false);

  readonly busy = computed(() => this.navigating() || this.requests() > 0);
  /** Debounced `busy`: what the bar shows. */
  readonly visible = this.shown.asReadonly();

  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAt = 0;

  constructor() {
    if (!this.browser) return;
    inject(Router).events.subscribe(e => {
      if (e instanceof NavigationStart) this.setNavigating(true);
      else if (e instanceof NavigationEnd || e instanceof NavigationCancel
        || e instanceof NavigationError || e instanceof NavigationSkipped) this.setNavigating(false);
    });
  }

  requestStarted(): void {
    if (!this.browser) return;
    this.requests.update(n => n + 1);
    this.sync();
  }

  requestEnded(): void {
    if (!this.browser) return;
    this.requests.update(n => Math.max(0, n - 1));
    this.sync();
  }

  private setNavigating(value: boolean): void {
    this.navigating.set(value);
    this.sync();
  }

  private sync(): void {
    if (this.busy()) {
      this.clear('hide');
      if (this.shown() || this.showTimer) return;
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        this.shownAt = Date.now();
        this.shown.set(true);
      }, LOADING_SHOW_DELAY_MS);
    } else {
      this.clear('show');
      if (!this.shown() || this.hideTimer) return;
      const remaining = Math.max(0, LOADING_MIN_VISIBLE_MS - (Date.now() - this.shownAt));
      this.hideTimer = setTimeout(() => {
        this.hideTimer = null;
        this.shown.set(false);
      }, remaining);
    }
  }

  private clear(timer: 'show' | 'hide'): void {
    if (timer === 'show' && this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
    if (timer === 'hide' && this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }
}
