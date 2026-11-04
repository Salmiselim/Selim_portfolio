import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NAV, PROFILE } from '../data/portfolio.data';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    footer { border-top: 1px solid var(--line); padding-top: clamp(40px, 6vw, 72px); overflow: hidden; }
    .row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 24px 48px; }
    nav, .ext { display: flex; flex-wrap: wrap; gap: 4px 20px; }
    a { min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none; color: var(--muted); font-size: 0.93rem; transition: color .2s; }
    a:hover { color: var(--fg); }
    .arcade { font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); }
    .wordmark {
      margin: clamp(24px, 4vw, 48px) 0 0; font-family: var(--font-display); text-transform: uppercase;
      font-size: clamp(3.5rem, 19.4vw, 17.8rem); line-height: 0.78; letter-spacing: -0.01em; white-space: nowrap;
      color: transparent; -webkit-text-stroke: 1px rgba(239, 234, 247, 0.22); user-select: none;
      transform: translateY(0.12em);
    }
    .legal { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; padding-block: 20px;
      border-top: 1px solid var(--line); color: var(--subtle); font-size: 0.82rem; font-family: var(--font-mono); position: relative; background: var(--bg); }
  `,
  template: `
    <footer>
      <div class="container row">
        <nav aria-label="Footer">
          @for (item of nav; track item.id) { <a routerLink="/" [fragment]="item.id">{{ item.label }}</a> }
        </nav>
        <div class="ext">
          <a [href]="profile.linkedin.href" target="_blank" rel="noopener" data-umami-event="linkedin-click" data-umami-event-from="footer">LinkedIn <app-icon name="arrow-up-right" [size]="14" /></a>
          <a [href]="profile.github.href" target="_blank" rel="noopener" data-umami-event="github-click" data-umami-event-from="footer">GitHub <app-icon name="arrow-up-right" [size]="14" /></a>
          <a [href]="profile.itch.href" target="_blank" rel="noopener" data-umami-event="itch-click" data-umami-event-from="footer">itch.io <app-icon name="arrow-up-right" [size]="14" /></a>
          <a [href]="'mailto:' + profile.email" data-umami-event="email-click" data-umami-event-from="footer">Email <app-icon name="arrow-up-right" [size]="14" /></a>
          <a class="arcade" routerLink="/arcade"><app-icon name="gamepad" [size]="16" /> Play Snake</a>
        </div>
      </div>
      <div class="container" aria-hidden="true"><p class="wordmark">Selim Salmi</p></div>
      <div class="legal">
        <div class="container row">
          <span>© {{ year }} {{ profile.name }}</span>
          <span>Cookie-free, anonymous analytics · Built with Angular</span>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {
  protected readonly nav = NAV;
  protected readonly profile = PROFILE;
  protected readonly year = new Date().getFullYear();
}
