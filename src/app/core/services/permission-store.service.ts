import {Injectable, computed, inject, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {PermissionsService, SectionPermissionsDTO} from '../../api/profiler-service';
import {UserSessionService} from './user-session.service';
import {PermissionCheck} from '../../layout/navigation';

export type PermissionStatus = 'loading' | 'ready' | 'unavailable';
export type PermissionCode = 'VIEW' | 'USE' | 'EDIT' | 'DOWNLOAD';

interface CachedPermissions {
  key: string;
  sections: SectionPermissionsDTO[];
}

/**
 * What the active role assignment may do, from the BE permission catalogue
 * (`GET /permissions/getUserSitemapByClaims`: sections, features and permission codes of the token's roles).
 * Permissions follow the role only, so they are fetched once per bank + roles and kept in sessionStorage: a
 * re-sign-in keeps them, a branch switch fetches again.
 *
 * UI-level only: the BE checks every call. While the catalogue is loading or can't be loaded, `can` allows
 * everything and the role-based navigation is shown.
 */
@Injectable({providedIn: 'root'})
export class PermissionStore {
  private static readonly STORAGE_KEY = 'wm.user.permissions';

  private readonly api = inject(PermissionsService);
  private readonly userSession = inject(UserSessionService);

  private readonly cached = signal<CachedPermissions | null>(this.read());
  private readonly failedKey = signal<string | null>(null);
  private inflight: {key: string; done: Promise<void>} | null = null;

  /** Identifies the permission set: the active bank and the token's roles. */
  private readonly key = computed(() => {
    const active = this.userSession.activeBranch();
    return active ? `${active.bankCode}|${[...this.userSession.roles()].sort().join(',')}` : null;
  });

  readonly status = computed<PermissionStatus>(() => {
    const key = this.key();
    if (key && this.cached()?.key === key) return 'ready';
    return key && this.failedKey() !== key ? 'loading' : 'unavailable';
  });

  private readonly grants = computed(() => {
    const grants = new Set<string>();
    if (this.status() !== 'ready') return grants;
    for (const s of this.cached()?.sections ?? []) {
      for (const f of s.featurePermissions ?? []) {
        for (const p of f.permissions ?? []) grants.add(`${s.sectionCode}/${f.featureCode}/${p.permissionCode}`);
      }
    }
    return grants;
  });

  /** Navigation filter, only once the catalogue is known for the active role assignment. */
  readonly navigationCheck = computed<PermissionCheck | undefined>(() => {
    if (this.status() !== 'ready') return undefined;
    const grants = this.grants();
    return (section, feature) => grants.has(`${section}/${feature}/VIEW`);
  });

  /** Whether the active role assignment may `code` on a catalogue feature; true while the catalogue is unknown. */
  can(section: string, feature: string, code: PermissionCode = 'VIEW'): boolean {
    return this.status() !== 'ready' || this.grants().has(`${section}/${feature}/${code}`);
  }

  /** Fetches the catalogue for the active role assignment unless it is already known. Never throws. */
  ensureLoaded(): Promise<void> {
    const key = this.key();
    if (!key || this.status() === 'ready') return Promise.resolve();
    if (this.inflight?.key === key) return this.inflight.done;
    const done = firstValueFrom(this.api.getUserSitemapByClaims())
      .then(dto => this.store({key, sections: dto?.sectionPermissions ?? []}))
      .catch(() => this.failedKey.set(key))
      .finally(() => {
        if (this.inflight?.key === key) this.inflight = null;
      });
    this.inflight = {key, done};
    return done;
  }

  private store(value: CachedPermissions): void {
    this.cached.set(value);
    try {
      sessionStorage.setItem(PermissionStore.STORAGE_KEY, JSON.stringify(value));
    } catch {
      // storage unavailable: keep the in-memory copy only
    }
  }

  private read(): CachedPermissions | null {
    try {
      const raw = sessionStorage.getItem(PermissionStore.STORAGE_KEY);
      return raw ? JSON.parse(raw) as CachedPermissions : null;
    } catch {
      return null;
    }
  }
}
