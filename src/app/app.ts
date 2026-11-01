import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SiteFooterComponent } from './layout/site-footer.component';
import { SiteHeaderComponent } from './layout/site-header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main" (click)="focusMain($event)">Skip to content</a>
    <div class="progress" aria-hidden="true"></div>
    <app-site-header />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <app-site-footer />
  `,
})
export class AppComponent {
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      // After a route change (without an in-page anchor) move focus to the content for keyboard/screen-reader users.
      this.router.events
        .pipe(
          filter((e): e is NavigationEnd => e instanceof NavigationEnd),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((e) => {
          if (!e.urlAfterRedirects.includes('#')) this.doc.getElementById('main')?.focus({ preventScroll: true });
        });
    });
  }

  protected focusMain(event: Event): void {
    event.preventDefault();
    this.doc.getElementById('main')?.focus();
  }
}
