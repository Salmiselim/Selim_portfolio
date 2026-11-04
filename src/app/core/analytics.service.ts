import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ANALYTICS } from '../data/portfolio.data';

type UmamiData = Record<string, string | number | boolean>;
interface UmamiWindow extends Window {
  umami?: { track: (event: string, data?: UmamiData) => void };
}

/**
 * Private, cookie-free visitor statistics via Umami Cloud.
 *
 * - Your dashboard (the "backoffice") lives at https://cloud.umami.is behind your own login.
 *   The portfolio itself has no admin page, so there is nothing for anyone else to open.
 * - The script only loads in the browser, only when ANALYTICS.umamiWebsiteId is set,
 *   and never on localhost, so your local development doesn't pollute the numbers.
 * - Page views (including Angular route changes) are tracked automatically by Umami.
 *   Clicks on elements with `data-umami-event="..."` are tracked automatically too.
 *   Use `track()` for everything else (video plays, lightbox, copy email).
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  init(): void {
    if (!this.isBrowser || !ANALYTICS.umamiWebsiteId) return;
    const host = this.doc.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return;
    if (ANALYTICS.domains.length && !ANALYTICS.domains.includes(host)) return;
    if (this.doc.querySelector('script[data-website-id]')) return;

    const s = this.doc.createElement('script');
    s.defer = true;
    s.src = ANALYTICS.scriptUrl;
    s.setAttribute('data-website-id', ANALYTICS.umamiWebsiteId);
    this.doc.head.appendChild(s);
  }

  track(event: string, data?: UmamiData): void {
    if (!this.isBrowser) return;
    try {
      (this.doc.defaultView as UmamiWindow | null)?.umami?.track(event, data);
    } catch {
      /* analytics must never break the site */
    }
  }
}
