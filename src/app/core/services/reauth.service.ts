import {Injectable, inject, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {AuthService as ApiAuthService} from '../../api/user-service';
import {AuthService} from './auth.service';
import {UserSessionService} from './user-session.service';

/** True for the BE answer to a sensitive action whose sign-in is older than 10 minutes. */
export const isReauthRequired = (e: unknown): boolean =>
  e instanceof HttpErrorResponse && e.status === 401 && e.error?.errorCode === 'REAUTHENTICATION_REQUIRED';

/**
 * Re-authentication for admin actions (BE: sign-in at most 10 minutes old, else 401 REAUTHENTICATION_REQUIRED).
 * `run()` performs a call; on that 401 it asks for the password (`ReauthDialogComponent`, mounted in the shell),
 * signs in again on the same bank and branch, replaces the token and retries the call once. Calls hitting it at
 * the same time share one prompt. Cancelling resolves `run()` with undefined: the action is simply abandoned.
 */
@Injectable({providedIn: 'root'})
export class ReauthService {
  private readonly api = inject(ApiAuthService);
  private readonly auth = inject(AuthService);
  private readonly userSession = inject(UserSessionService);

  readonly open = signal(false);
  readonly error = signal<string | null>(null);
  readonly email = signal('');

  private prompt: Promise<boolean> | null = null;
  private settle?: (confirmed: boolean) => void;

  async run<T>(call: () => Promise<T>): Promise<T | undefined> {
    try {
      return await call();
    } catch (e) {
      if (!isReauthRequired(e)) throw e;
      if (!await this.ask()) return undefined;
      return call();
    }
  }

  /**
   * Signs in again with `password` on the active role assignment. The old token is revoked before it is replaced
   * (logout ends only the token it is sent with), so no second valid token stays around. A wrong password keeps
   * the dialog open with a message.
   */
  async confirm(password: string): Promise<void> {
    const active = this.userSession.activeBranch();
    let token: string | undefined;
    try {
      const response = await firstValueFrom(this.api.loginUser({
        email: this.email(), password, bankCode: active?.bankCode, branchCode: active?.branchCode
      }));
      token = response?.token;
    } catch (e) {
      const status = e instanceof HttpErrorResponse ? e.status : 0;
      this.error.set(status === 401 ? "That password isn't right."
        : status === 403 ? 'You no longer have a role in this branch. Sign out and sign in again.'
        : "We couldn't confirm it right now. Please try again in a moment.");
      return;
    }
    if (!token) {
      this.error.set("We couldn't confirm it right now. Please try again in a moment.");
      return;
    }
    await this.auth.revokeCurrentToken();
    this.auth.setToken(token);
    this.finish(true);
  }

  cancel(): void {
    this.finish(false);
  }

  private ask(): Promise<boolean> {
    this.prompt ??= new Promise<boolean>(resolve => {
      this.settle = resolve;
      this.email.set(this.userSession.profile()?.email ?? this.auth.username() ?? '');
      this.error.set(null);
      this.open.set(true);
    });
    return this.prompt;
  }

  private finish(confirmed: boolean): void {
    this.open.set(false);
    this.settle?.(confirmed);
    this.prompt = null;
    this.settle = undefined;
  }
}
