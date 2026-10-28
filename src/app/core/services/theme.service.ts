import {DOCUMENT, Injectable, PLATFORM_ID, inject, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

export type WmpTheme = 'dark' | 'light';

const STORAGE_KEY = 'wmp.theme';
const DARK_CLASS = 'wmp-dark';

/**
 * ThemeService
 * Owns the active colour scheme. Dark is the default (index.html ships `<html class="wmp-dark">`
 * so SSR and first paint are already dark). The same class drives both the --wmp-* tokens
 * (styles/_tokens.scss) and the PrimeNG preset (darkModeSelector in app.config.ts).
 * TODO: persist the preference in user-service UserSettingsDTO.theme once settings are wired.
 */
@Injectable({providedIn: 'root'})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<WmpTheme>(this.readStoredTheme());

  constructor() {
    this.apply(this.theme());
  }

  setTheme(theme: WmpTheme): void {
    this.theme.set(theme);
    this.apply(theme);
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // storage unavailable (private mode, blocked site data): keep the in-memory choice only
      }
    }
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: WmpTheme): void {
    this.document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
  }

  private readStoredTheme(): WmpTheme {
    if (!this.isBrowser) {
      return 'dark';
    }
    try {
      return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }
}
