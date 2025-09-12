import {Injectable} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {filter} from 'rxjs/operators';
import {BehaviorSubject} from 'rxjs';

/**
 * Tracks client-side navigation history to enable a controlled back navigation
 * independent from the browser's native history stack.
 *
 * Characteristics:
 * - Stores a simple in-memory stack of visited URLs (urlAfterRedirects)
 * - Does not persist across full page reloads
 * - Avoids pushing duplicate consecutive entries
 */
@Injectable({providedIn: 'root'})
export class NavigationHistoryService {
  private history: string[] = [];
  private readonly canGoBackSubject = new BehaviorSubject<boolean>(false);
  /** Reactive stream consumed by templates (async pipe) */
  readonly canGoBack$ = this.canGoBackSubject.asObservable();

  constructor(private readonly router: Router) {
    const initial = this.router.url || '/';
    if (!this.history.length) {
      // If app starts on a deep link (not root), seed root first so back button can return there.
      if (initial !== '/' && initial !== '') {
        this.history.push('/');
      }
      this.history.push(initial === '' ? '/' : initial);
      this.updateFlag();
    }

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const url = e.urlAfterRedirects || '/';
        if (!this.history.length || this.history[this.history.length - 1] !== url) {
          this.history.push(url);
          this.updateFlag();
        }
      });
  }

  /** Non-reactive method (legacy usage) */
  canGoBack(): boolean {
    return this.history.length > 1;
  }

  /**
   * Navigate to the previous URL in the stack.
   * If no previous URL exists, navigate to the provided fallback (default '/').
   */
  back(fallback: string = '/'): Promise<void> {
    if (this.history.length > 1) {
      // Remove the current route
      this.history.pop();
      // Retrieve the actual previous route
      const target = this.history.pop();
      this.updateFlag();
      if (target) {
        return this.router.navigateByUrl(target)
          .then(() => {
          })
          .catch(() => {
          });
      }
    }
    return this.router.navigateByUrl(fallback)
      .then(() => {
      })
      .catch(() => {
      });
  }

  /**
   * Clears the history stack and seeds it with the current router URL.
   * Useful after logout or context resets.
   */
  reset(): void {
    this.history = [];
    const current = this.router.url || '/';
    if (current !== '/' && current !== '') {
      this.history.push('/');
    }
    this.history.push(current === '' ? '/' : current);
    this.updateFlag();
  }

  private updateFlag() {
    this.canGoBackSubject.next(this.history.length > 1);
  }
}
