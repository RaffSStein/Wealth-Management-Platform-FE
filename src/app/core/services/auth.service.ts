import { Injectable, signal } from '@angular/core';

/**
 * AuthService minimale per gestire l'username dell'utente.
 * - Username: localStorage (chiave: wm.username)
 * - Token: sessionStorage (chiave: wm.auth.token) per durata sessione browser
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly STORAGE_KEY = 'wm.username';
  private static readonly TOKEN_KEY = 'wm.auth.token';

  username = signal<string | null>(this.readFromStorage());
  token = signal<string | null>(this.readToken());

  setUsername(value: string) {
    const v = (value ?? '').trim();
    this.username.set(v || null);
    try {
      if (v) {
        localStorage.setItem(AuthService.STORAGE_KEY, v);
      } else {
        localStorage.removeItem(AuthService.STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  setToken(value: string | null) {
    const v = (value ?? '').trim();
    this.token.set(v || null);
    try {
      if (v) {
        sessionStorage.setItem(AuthService.TOKEN_KEY, v);
      } else {
        sessionStorage.removeItem(AuthService.TOKEN_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  getAuthorizationHeader(): string | null {
    const t = this.token();
    return t ? `Bearer ${t}` : null;
  }

  clear() {
    this.username.set(null);
    this.setToken(null);
    try {
      localStorage.removeItem(AuthService.STORAGE_KEY);
    } catch {}
  }

  private readFromStorage(): string | null {
    try {
      const v = localStorage.getItem(AuthService.STORAGE_KEY);
      return v?.trim() || null;
    } catch {
      return null;
    }
  }

  private readToken(): string | null {
    try {
      const v = sessionStorage.getItem(AuthService.TOKEN_KEY);
      return v?.trim() || null;
    } catch {
      return null;
    }
  }
}
