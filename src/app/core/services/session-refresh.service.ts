import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Tracks whether the initial router activation (after a full page load) has already performed data refresh. */
@Injectable({ providedIn: 'root' })
export class SessionRefreshService {
  private static readonly KEY = 'wm.session.initialRefreshDone';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  shouldRefreshOnce(): boolean {
    if (!this.isBrowser) return false;
    try {
      const done = sessionStorage.getItem(SessionRefreshService.KEY) === '1';
      return !done;
    } catch { return false; }
  }

  markRefreshed() {
    if (!this.isBrowser) return;
    try { sessionStorage.setItem(SessionRefreshService.KEY, '1'); } catch {}
  }

  reset() {
    if (!this.isBrowser) return;
    try { sessionStorage.removeItem(SessionRefreshService.KEY); } catch {}
  }
}

