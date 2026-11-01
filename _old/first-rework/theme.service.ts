import { DOCUMENT } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeName = 'dark' | 'light';

const STORAGE_KEY = 'theme';

/**
 * Light/dark theme. The initial value is applied before first paint by a tiny
 * inline script in index.html (no flash); this service only keeps it in sync.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<ThemeName>('dark');

  /** Call once on the client (after hydration) to read what the inline script chose. */
  init(): void {
    if (!this.isBrowser) return;
    const current = this.doc.documentElement.getAttribute('data-theme');
    this.theme.set(current === 'light' ? 'light' : 'dark');
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private set(next: ThemeName): void {
    this.theme.set(next);
    if (!this.isBrowser) return;
    this.doc.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage can be unavailable (private mode) — the theme still applies for this visit */
    }
  }
}
