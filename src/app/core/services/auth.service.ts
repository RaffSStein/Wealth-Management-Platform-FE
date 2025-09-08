import { Injectable, signal } from '@angular/core';

/**
 * AuthService minimale per gestire l'username dell'utente.
 * - Persistenza: localStorage (chiave: wm.username)
 * - Stato reattivo: signal username
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly STORAGE_KEY = 'wm.username';

  username = signal<string | null>(this.readFromStorage());

  setUsername(value: string) {
    const v = (value ?? '').trim();
    this.username.set(v || null);
    if (v) {
      localStorage.setItem(AuthService.STORAGE_KEY, v);
    } else {
      localStorage.removeItem(AuthService.STORAGE_KEY);
    }
  }

  clear() {
    this.username.set(null);
    localStorage.removeItem(AuthService.STORAGE_KEY);
  }

  private readFromStorage(): string | null {
    try {
      const v = localStorage.getItem(AuthService.STORAGE_KEY);
      return v && v.trim() ? v.trim() : null;
    } catch {
      return null;
    }
  }
}

