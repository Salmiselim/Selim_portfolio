import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, HostListener, afterNextRender, effect, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { NAV, PROFILE } from '../data/portfolio.data';
import { IconComponent } from '../shared/icon.component';

/** Top bar: transparent over the hero, solid once scrolled. Scroll-spy + full-screen mobile menu. */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css',
})
export class SiteHeaderComponent {
  protected readonly nav = NAV;
  protected readonly profile = PROFILE;
  protected readonly open = signal(false);
  protected readonly active = signal('');
  protected readonly scrolled = signal(false);

  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      this.onScroll();
      this.router.events
        .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.open.set(false);
          setTimeout(() => this.observeSections(), 60);
        });
      this.destroyRef.onDestroy(() => this.observer?.disconnect());
      this.observeSections();
    });
    // Lock page scroll while the full-screen mobile menu is open.
    effect(() => {
      this.doc.body.style.overflow = this.open() ? 'hidden' : '';
    });
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set((this.doc.defaultView?.scrollY ?? 0) > 24);
  }

  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.open.set(false);
  }

  protected toggleMenu(): void {
    this.open.update((v) => !v);
  }

  private observeSections(): void {
    this.observer?.disconnect();
    const sections = Array.from(this.doc.querySelectorAll<HTMLElement>('main section[id]'));
    if (!sections.length) {
      this.active.set('');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) this.active.set(entry.target.id);
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    sections.forEach((s) => this.observer!.observe(s));
  }
}
