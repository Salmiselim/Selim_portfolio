import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PROJECTS } from './projects.data';
import { ThemeService } from './theme.service';

interface HudStats {
  readonly hp: number;
  readonly mp: number;
  readonly exp: number;
  readonly lvl: number;
  readonly speed: number;
  readonly depth: number;
  readonly difficulty: number;
}

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly theme = inject(ThemeService);
  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly projectId = computed(() => this.paramMap().get('id') ?? '');
  readonly project = computed(
    () => PROJECTS.find((item) => item.id === this.projectId()) ?? null
  );
  readonly isMonopoly = computed(() => this.projectId() === 'meganopoly-xr');
  readonly isMagicArena = computed(() => this.projectId() === 'magic-arena-xr');
  readonly isIceCream = computed(() => this.projectId() === 'bad-ice-cream-3d');

  // Stats per project — drives the HUD
  private readonly statsMap: Record<string, HudStats> = {
    'meganopoly-xr':   { hp: 96, mp: 88, exp: 92, lvl: 28, speed: 78, depth: 92, difficulty: 4 },
    'magic-arena-xr':  { hp: 88, mp: 96, exp: 90, lvl: 32, speed: 90, depth: 88, difficulty: 5 },
    'bad-ice-cream-3d':{ hp: 92, mp: 70, exp: 86, lvl: 22, speed: 95, depth: 76, difficulty: 3 },
  };

  readonly stats = computed<HudStats>(
    () => this.statsMap[this.projectId()] ?? { hp: 80, mp: 80, exp: 80, lvl: 1, speed: 80, depth: 80, difficulty: 3 },
  );

  private observer: IntersectionObserver | null = null;

  private readonly themeEffect = effect(() => {
    const id = this.projectId();
    const theme =
      id === 'meganopoly-xr' ? 'monopoly' :
      id === 'magic-arena-xr' ? 'magic' :
      id === 'bad-ice-cream-3d' ? 'icecream' : null;
    this.theme.setProjectTheme(theme);
    // Refresh bar fills when project changes (route update)
    if (isPlatformBrowser(this.platformId)) {
      queueMicrotask(() => this.refreshBars());
    }
  });

  stars(level: number): string {
    return '★'.repeat(level) + '☆'.repeat(Math.max(0, 5 - level));
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.refreshBars();
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 },
    );
    const root = (this.el.nativeElement as HTMLElement).querySelector('.project-detail');
    if (root) this.observer.observe(root);
  }

  private refreshBars(): void {
    const fills = Array.from(
      (this.el.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.hud-fill, .stat-fill-d'),
    );
    fills.forEach((fill, i) => {
      const pct = fill.dataset['pct'] ?? '0';
      fill.style.transitionDelay = `${0.15 + i * 0.06}s`;
      // Reset then set so route changes re-trigger
      fill.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fill.style.width = pct;
        });
      });
    });
  }

  ngOnDestroy(): void {
    this.theme.setProjectTheme(null);
    this.observer?.disconnect();
  }
}
