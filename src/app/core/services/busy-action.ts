import { Signal, signal } from '@angular/core';

/** An async action that tracks whether it is running. Calls made while it runs are ignored. */
export interface BusyAction<A extends unknown[]> {
  (...args: A): Promise<void>;
  /** True while the action runs: bind it to the CTA's `[loading]`. */
  readonly pending: Signal<boolean>;
}

/**
 * Wraps an async handler (submit, save, navigate) so the CTA that started it can show a spinner, and a double
 * click can't start it twice. Errors still propagate: handle them inside `fn`, as the handlers already do.
 *
 * ```ts
 * protected readonly onSubmit = busyAction(async () => { ... });
 * // <p-button type="submit" [loading]="onSubmit.pending()"/>
 * ```
 */
export function busyAction<A extends unknown[]>(fn: (...args: A) => Promise<unknown>): BusyAction<A> {
  const pending = signal(false);
  const run = async (...args: A): Promise<void> => {
    if (pending()) return;
    pending.set(true);
    try {
      await fn(...args);
    } finally {
      pending.set(false);
    }
  };
  return Object.assign(run, {pending: pending.asReadonly()});
}
