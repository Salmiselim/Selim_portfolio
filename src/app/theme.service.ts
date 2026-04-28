import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isLight = signal(false);
  readonly projectTheme = signal<string | null>(null);

  toggle(): void {
    this.isLight.update((value) => !value);
  }

  setProjectTheme(theme: string | null): void {
    this.projectTheme.set(theme);
  }
}
