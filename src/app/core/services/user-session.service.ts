import {Injectable, computed, signal} from '@angular/core';
import {UserService, UserDTO} from '../../api/user-service';
import {firstValueFrom} from 'rxjs';

/**
 * Holds the logged-in user's profile for the whole browser session.
 * - Fetches from backend using /me (UserService.getCurrentUser)
 * - Caches into sessionStorage to avoid calling /me again during the session
 * - Exposes a signal for reactive consumption
 */
@Injectable({providedIn: 'root'})
export class UserSessionService {
  private static readonly STORAGE_KEY = 'wm.user.profile';

  // in-memory state hydrated from sessionStorage
  private readonly _profile = signal<UserDTO | null>(this.readFromSession());
  readonly profile = computed(() => this._profile());
  readonly isLoaded = computed(() => this._profile() != null);

  constructor(private readonly userApi: UserService) {
  }

  /**
   * Ensure we have the user profile in memory; if not present or forceReload is true, fetch it.
   * Returns the up-to-date UserDTO or throws on error (caller should handle UI/flow).
   */
  async ensureLoaded(forceReload = false): Promise<UserDTO> {
    const cached = this._profile();
    if (cached && !forceReload) return cached;

    const fresh = await firstValueFrom(this.userApi.getCurrentUser());
    this.setProfile(fresh);
    return fresh;
  }

  /** Set the profile both in memory and sessionStorage. */
  setProfile(value: UserDTO | null) {
    this._profile.set(value);
    try {
      if (value) {
        sessionStorage.setItem(UserSessionService.STORAGE_KEY, JSON.stringify(value));
      } else {
        sessionStorage.removeItem(UserSessionService.STORAGE_KEY);
      }
    } catch {
      // best-effort: ignore storage errors (private mode, quota, etc.)
    }
  }

  /** Clear the profile (e.g., on logout). */
  clear() {
    this.setProfile(null);
  }

  /**
   * Returns true if the loaded profile contains a non-empty accountId property.
   * We avoid changing the generated UserDTO interface; backend may add this field later.
   */
  hasAccount(): boolean {
    const p = this._profile();
    if (!p) return false;
    const accountId = (p as any).accountId;
    return typeof accountId === 'string' && accountId.trim().length > 0;
  }

  /** Convenience accessor for accountId (may be undefined until backend field exists). */
  getAccountId(): string | undefined {
    const p = this._profile();
    if (!p) return undefined;
    const accountId = (p as any).accountId;
    return typeof accountId === 'string' ? accountId : undefined;
  }

  private readFromSession(): UserDTO | null {
    try {
      const raw = sessionStorage.getItem(UserSessionService.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as UserDTO;
    } catch {
      return null; // corrupted or unavailable storage
    }
  }
}
