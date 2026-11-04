import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ANALYTICS } from '../data/portfolio.data';

type EventData = Record<string, string | number | boolean>;
interface UmamiWindow extends Window {
  umami?: { track: (event: string, data?: EventData) => void };
}

/**
 * Anonymous, cookie-free visitor statistics.
 *
 * 1. Your own stats system: page views, time on page and clicks are sent to /api/collect
 *    (a Vercel Function that stores them in your database). You read them on /admin,
 *    which only your GitHub account can open. See README → "Private statistics".
 * 2. Optional Umami Cloud backup, if ANALYTICS.umamiWebsiteId is set.
 *
 * Nothing runs during server rendering or on localhost.
 * Clicks on elements with `data-umami-event="name"` (+ `data-umami-event-<key>="value"`)
 * are tracked automatically; call `track()` for anything else.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private enabled = false;
  private firstPageview = true;
  private pv = { id: '', path: '', visibleMs: 0, since: 0 };

  init(): void {
    if (!this.isBrowser || this.enabled) return;
    const host = this.doc.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return;
    if (ANALYTICS.domains.length && !ANALYTICS.domains.includes(host)) return;
    this.enabled = true;

    if (ANALYTICS.umamiWebsiteId) this.loadUmami();
    if (!ANALYTICS.collectUrl) return;

    // Page views: the first page plus every in-app navigation.
    this.startPageview(this.currentPath());
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const path = this.currentPath();
        if (path !== this.pv.path) {
          this.endPageview();
          this.startPageview(path);
        }
      });

    // Time on page: only counts while the tab is visible.
    const win = this.doc.defaultView!;
    this.doc.addEventListener('visibilitychange', () => {
      if (this.doc.visibilityState === 'hidden') this.endPageview(false);
      else this.pv.since = performance.now();
    });
    win.addEventListener('pagehide', () => this.endPageview(false));

    // Clicks on anything marked with data-umami-event.
    this.doc.addEventListener(
      'click',
      (ev) => {
        const el = (ev.target as Element | null)?.closest?.('[data-umami-event]');
        if (!el) return;
        const data: EventData = {};
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.startsWith('data-umami-event-')) data[attr.name.slice('data-umami-event-'.length)] = attr.value;
        }
        this.send({ t: 'event', n: el.getAttribute('data-umami-event'), p: this.pv.path || this.currentPath(), d: data });
      },
      true,
    );
  }

  track(event: string, data?: EventData): void {
    if (!this.isBrowser || !this.enabled) return;
    if (ANALYTICS.collectUrl) this.send({ t: 'event', n: event, p: this.pv.path || this.currentPath(), d: data ?? {} });
    try {
      (this.doc.defaultView as UmamiWindow | null)?.umami?.track(event, data);
    } catch {
      /* analytics must never break the site */
    }
  }

  private startPageview(path: string): void {
    this.pv = { id: this.uid(), path, visibleMs: 0, since: performance.now() };
    const params = new URLSearchParams(this.doc.location.search);
    this.send({
      t: 'pageview',
      id: this.pv.id,
      p: path,
      r: this.firstPageview ? this.doc.referrer : '',
      u: params.get('utm_source') || params.get('ref') || '',
    });
    this.firstPageview = false;
  }

  /** Reports the visible time spent on the current page. */
  private endPageview(final = true): void {
    if (!this.pv.id) return;
    if (this.pv.since) this.pv.visibleMs += performance.now() - this.pv.since;
    this.pv.since = 0;
    const seconds = Math.round(this.pv.visibleMs / 1000);
    if (seconds > 0) this.send({ t: 'leave', id: this.pv.id, p: this.pv.path, s: seconds });
    if (final) this.pv.id = '';
  }

  private send(payload: Record<string, unknown>): void {
    try {
      const body = JSON.stringify(payload);
      const nav = this.doc.defaultView?.navigator;
      if (nav?.sendBeacon && nav.sendBeacon(ANALYTICS.collectUrl, new Blob([body], { type: 'text/plain' }))) return;
      void fetch(ANALYTICS.collectUrl, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
    } catch {
      /* ignore */
    }
  }

  private currentPath(): string {
    return this.doc.location.pathname || '/';
  }

  private uid(): string {
    const c = this.doc.defaultView?.crypto;
    return c?.randomUUID ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private loadUmami(): void {
    if (this.doc.querySelector('script[data-website-id]')) return;
    const s = this.doc.createElement('script');
    s.defer = true;
    s.src = ANALYTICS.scriptUrl;
    s.setAttribute('data-website-id', ANALYTICS.umamiWebsiteId);
    this.doc.head.appendChild(s);
  }
}
