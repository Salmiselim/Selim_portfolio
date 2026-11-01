import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'arrow-right' | 'arrow-left' | 'arrow-up-right' | 'download' | 'github' | 'linkedin' | 'mail'
  | 'sun' | 'moon' | 'menu' | 'x' | 'copy' | 'check' | 'map-pin' | 'briefcase' | 'graduation'
  | 'code' | 'layers' | 'database' | 'gamepad' | 'users' | 'cube' | 'award' | 'globe'
  | 'play' | 'image' | 'film' | 'chevron-left' | 'chevron-right' | 'maximize' | 'plus';

/** Minimal inline icon set (Lucide-style, 24px grid, stroke = currentColor). */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.width.px]': 'size()', '[style.height.px]': 'size()' },
  styles: `:host{display:inline-flex;flex:none} svg{width:100%;height:100%}`,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      @switch (name()) {
        @case ('arrow-right') { <path d="M5 12h14M13 5l7 7-7 7" /> }
        @case ('arrow-left') { <path d="M19 12H5M11 5l-7 7 7 7" /> }
        @case ('arrow-up-right') { <path d="M7 17 17 7M8 7h9v9" /> }
        @case ('download') { <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /> }
        @case ('github') { <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2" /> }
        @case ('linkedin') {
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
        }
        @case ('mail') { <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /> }
        @case ('sun') { <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /> }
        @case ('moon') { <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /> }
        @case ('menu') { <path d="M4 6h16M4 12h16M4 18h16" /> }
        @case ('x') { <path d="M18 6 6 18M6 6l12 12" /> }
        @case ('copy') { <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /> }
        @case ('check') { <path d="M20 6 9 17l-5-5" /> }
        @case ('map-pin') { <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /> }
        @case ('briefcase') { <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /> }
        @case ('graduation') { <path d="M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5" /> }
        @case ('code') { <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /> }
        @case ('layers') { <path d="m12 2 10 5-10 5L2 7l10-5ZM2 12l10 5 10-5M2 17l10 5 10-5" /> }
        @case ('database') { <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /> }
        @case ('gamepad') { <path d="M6 12h4M8 10v4M15 13h.01M18 11h.01" /><rect x="2" y="6" width="20" height="12" rx="4" /> }
        @case ('users') { <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /><circle cx="9" cy="7" r="4" /> }
        @case ('cube') { <path d="M21 8 12 3 3 8v8l9 5 9-5V8ZM3.3 7.5 12 12.5l8.7-5M12 22V12.5" /> }
        @case ('award') { <circle cx="12" cy="8" r="6" /><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" /> }
        @case ('play') { <path d="M7 4.5v15a1 1 0 0 0 1.5.87l12-7.5a1 1 0 0 0 0-1.74l-12-7.5A1 1 0 0 0 7 4.5Z" fill="currentColor" stroke="none" /> }
        @case ('image') { <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /> }
        @case ('film') { <rect x="2" y="3" width="20" height="18" rx="2" /><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5M2 12h20" /> }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6" /> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6" /> }
        @case ('maximize') { <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /> }
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('globe') { <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /> }
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
