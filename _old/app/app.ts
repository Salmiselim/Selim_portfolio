import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  Renderer2,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { featherLinkedin, featherMapPin, featherPhone, featherMail, featherGithub } from '@ng-icons/feather-icons';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './theme.service';

interface AmbientPixel {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly delay: number;
  readonly duration: number;
  readonly driftX: number;
  readonly driftY: number;
  readonly hue: number;
  readonly opacity: number;
}

const TRAIL_LENGTH = 6;
const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

@Component({
  selector: 'app-root',
  template: `
    <div
      class="app"
      [attr.data-theme]="theme.isLight() ? 'light' : 'dark'"
      [attr.data-project-theme]="theme.projectTheme()"
      [class.super-mode]="superMode()"
    >
      @if (showBoot()) {
        <div class="boot-screen" [class.boot-done]="bootDone()" aria-hidden="true">
          <div class="boot-stage">
            <div class="boot-logo">SELIM SALMI</div>
            <div class="boot-bar"></div>
            <div class="boot-msg">▶ INITIALIZING SYSTEMS</div>
          </div>
        </div>
      }

      <div class="pixel-cosmos" aria-hidden="true">
        @for (pixel of ambientPixels; track pixel.id) {
          <span
            class="ambient-pixel"
            [style.--pixel-x]="pixel.x + '%'"
            [style.--pixel-y]="pixel.y + '%'"
            [style.--pixel-size]="pixel.size + 'px'"
            [style.--pixel-delay]="pixel.delay + 'ms'"
            [style.--pixel-duration]="pixel.duration + 'ms'"
            [style.--pixel-drift-x]="pixel.driftX + 'px'"
            [style.--pixel-drift-y]="pixel.driftY + 'px'"
            [style.--pixel-hue]="pixel.hue"
            [style.--pixel-opacity]="pixel.opacity"
          ></span>
        }
      </div>

      <div class="scroll-xp" aria-hidden="true"></div>

      <div class="cursor-glow"></div>
      <div class="custom-cursor"></div>
      <div class="cursor-ring"></div>
      @for (i of trailIndices; track i) {
        <div class="cursor-trail" aria-hidden="true"></div>
      }

      <div class="click-burst-layer" aria-hidden="true"></div>

      <div class="super-banner" [class.show]="superMode()" aria-hidden="true">★ SUPER MODE ★</div>

      <div class="app-shell">
        <div class="back-to-top-sentinel" aria-hidden="true"></div>
        <router-outlet></router-outlet>
      </div>

      @if (showBackToTop()) {
        <button
          class="back-to-top"
          type="button"
          (click)="scrollToTop()"
          aria-label="Back to top"
        >
          Top
        </button>
      }
    </div>
  `,
  imports: [RouterOutlet],
  viewProviders: [provideIcons({ featherLinkedin, featherMapPin, featherPhone, featherMail, featherGithub })],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements AfterViewInit, OnDestroy {
  readonly theme = inject(ThemeService);
  readonly showBackToTop = signal(false);
  readonly showBoot = signal(true);
  readonly bootDone = signal(false);
  readonly superMode = signal(false);
  readonly trailIndices = Array.from({ length: TRAIL_LENGTH }, (_, i) => i);
  readonly ambientPixels: AmbientPixel[] = Array.from({ length: 48 }, (_, index) => {
    const seed = index + 1;
    const normalized = (value: number) => value - Math.floor(value);
    const random = (salt: number) => normalized(Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453);

    return {
      id: seed,
      x: 2 + random(1) * 96,
      y: 4 + random(2) * 92,
      size: 3 + Math.round(random(3) * 5),
      delay: Math.round(random(4) * 3200),
      duration: 2400 + Math.round(random(5) * 2800),
      driftX: Math.round((random(6) - 0.5) * 140),
      driftY: Math.round((random(7) - 0.5) * 120),
      hue: 165 + Math.round(random(8) * 110),
      opacity: 0.28 + random(9) * 0.42,
    };
  });

  private platformId = inject(PLATFORM_ID);
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private scrollHandler: (() => void) | null = null;
  private scrollProgressCleanup: (() => void) | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private magneticHandler: ((e: MouseEvent) => void) | null = null;
  private appShell: HTMLElement | null = null;
  private backToTopObserver: IntersectionObserver | null = null;

  private cursor!: HTMLElement;
  private cursorRing!: HTMLElement;
  private cursorGlow!: HTMLElement;
  private trailEls: HTMLElement[] = [];
  private burstLayer!: HTMLElement | null;
  private cards: HTMLElement[] = [];
  private magneticEls: HTMLElement[] = [];

  private mouseX = 0;
  private mouseY = 0;
  private ringX = 0;
  private ringY = 0;
  private glowX = 0;
  private glowY = 0;
  private trailHistory: Array<{ x: number; y: number }> = [];

  private konamiIndex = 0;
  private superTimer: ReturnType<typeof setTimeout> | null = null;
  private bootTimer: ReturnType<typeof setTimeout> | null = null;
  private bootHideTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeBoot();
      this.initializeCursor();
      this.initializeTrail();
      this.initializeCardInteractions();
      this.initializeBackToTop();
      this.initializeScrollProgress();
      this.initializeClickBurst();
      this.initializeMagneticButtons();
      this.initializeKonami();
      this.animate();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler);
        this.appShell?.removeEventListener('scroll', this.scrollHandler);
      }
      if (this.clickHandler) window.removeEventListener('mousedown', this.clickHandler);
      if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
      if (this.magneticHandler) window.removeEventListener('mousemove', this.magneticHandler);
      this.scrollProgressCleanup?.();
    }
    if (this.bootTimer) clearTimeout(this.bootTimer);
    if (this.bootHideTimer) clearTimeout(this.bootHideTimer);
    if (this.superTimer) clearTimeout(this.superTimer);
    this.backToTopObserver?.disconnect();
  }

  private initializeBoot(): void {
    this.bootTimer = setTimeout(() => {
      this.bootDone.set(true);
      this.bootHideTimer = setTimeout(() => this.showBoot.set(false), 700);
    }, 1700);
  }

  private initializeCursor(): void {
    this.cursor = this.el.nativeElement.querySelector('.custom-cursor');
    this.cursorRing = this.el.nativeElement.querySelector('.cursor-ring');
    this.cursorGlow = this.el.nativeElement.querySelector('.cursor-glow');
    const appRoot = this.el.nativeElement.querySelector('.app');

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.renderer.addClass(appRoot, 'cursor-active');
    });

    const interactiveSelectors = 'a, button, .card, .chip, .timeline-item, .stat-bar';
    this.el.nativeElement.querySelectorAll(interactiveSelectors).forEach((el: HTMLElement) => {
      el.addEventListener('mouseenter', () => this.renderer.addClass(appRoot, 'cursor-interactive'));
      el.addEventListener('mouseleave', () => this.renderer.removeClass(appRoot, 'cursor-interactive'));
    });
  }

  private initializeTrail(): void {
    this.trailEls = Array.from(
      (this.el.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.cursor-trail'),
    );
    this.trailHistory = Array.from({ length: TRAIL_LENGTH }, () => ({ x: 0, y: 0 }));
    this.trailEls.forEach((el, i) => {
      const scale = 1 - i / (TRAIL_LENGTH + 2);
      this.renderer.setStyle(el, 'transform', 'translate(-9999px, -9999px) scale(0)');
      this.renderer.setStyle(el, 'opacity', `${0.55 - i * 0.08}`);
      this.renderer.setStyle(el, 'transitionDuration', `${0.06 + i * 0.04}s`);
      this.renderer.setStyle(el, '--trail-scale', scale.toString());
    });
  }

  private initializeCardInteractions(): void {
    this.cards = Array.from(this.el.nativeElement.querySelectorAll('.card, .skills-card, .timeline-item, .training-card, .contact-panel'));
    this.cards.forEach((card) => {
      card.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;

        const rotateX = (y / height - 0.5) * -12;
        const rotateY = (x / width - 0.5) * 12;

        this.renderer.setStyle(card, 'transform', `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`);
        this.renderer.setStyle(card, '--glow-x', `${x}px`);
        this.renderer.setStyle(card, '--glow-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        this.renderer.setStyle(card, 'transform', 'perspective(1000px) rotateX(0) rotateY(0)');
      });
    });
  }

  private initializeClickBurst(): void {
    this.burstLayer = this.el.nativeElement.querySelector('.click-burst-layer');
    if (!this.burstLayer) return;

    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Skip if it's the boot screen
      if (target?.closest('.boot-screen')) return;
      this.spawnBurst(e.clientX, e.clientY);
    };
    window.addEventListener('mousedown', this.clickHandler, { passive: true });
  }

  private spawnBurst(x: number, y: number): void {
    if (!this.burstLayer) return;
    const colors = ['#58f8c0', '#7cc9ff', '#ffb861', '#c084fc'];
    const burst = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(burst, 'click-burst');
    this.renderer.setStyle(burst, 'left', `${x}px`);
    this.renderer.setStyle(burst, 'top', `${y}px`);
    this.renderer.setStyle(burst, 'position', 'fixed');

    const count = this.superMode() ? 18 : 12;
    for (let i = 0; i < count; i++) {
      const pixel = this.renderer.createElement('div') as HTMLElement;
      this.renderer.addClass(pixel, 'burst-pixel');
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 40 + Math.random() * 50;
      const bx = Math.cos(angle) * distance;
      const by = Math.sin(angle) * distance;
      const color = colors[i % colors.length];
      this.renderer.setStyle(pixel, '--bx', `${bx}px`);
      this.renderer.setStyle(pixel, '--by', `${by}px`);
      this.renderer.setStyle(pixel, 'background', color);
      this.renderer.setStyle(pixel, 'color', color);
      this.renderer.setStyle(pixel, 'animationDelay', `${Math.random() * 0.05}s`);
      this.renderer.appendChild(burst, pixel);
    }

    this.renderer.appendChild(this.burstLayer, burst);
    setTimeout(() => burst.parentNode?.removeChild(burst), 800);
  }

  private initializeMagneticButtons(): void {
    // Refresh list of magnetic targets
    const refresh = () => {
      this.magneticEls = Array.from(
        (this.el.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.btn, .theme-toggle, .carousel-btn, .back-to-top'),
      );
    };
    refresh();

    // Re-discover after layout settles (e.g., back-to-top mounts later)
    setTimeout(refresh, 1000);
    setTimeout(refresh, 3000);

    this.magneticHandler = (e: MouseEvent) => {
      const radius = 90;
      const strength = 0.35;
      this.magneticEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < radius) {
          const factor = (1 - dist / radius) * strength;
          this.renderer.setStyle(el, '--mag-x', `${dx * factor}px`);
          this.renderer.setStyle(el, '--mag-y', `${dy * factor}px`);
        } else {
          this.renderer.setStyle(el, '--mag-x', '0px');
          this.renderer.setStyle(el, '--mag-y', '0px');
        }
      });
    };
    window.addEventListener('mousemove', this.magneticHandler, { passive: true });
  }

  private initializeKonami(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const expected = KONAMI_SEQUENCE[this.konamiIndex];
      if (key === expected) {
        this.konamiIndex++;
        if (this.konamiIndex === KONAMI_SEQUENCE.length) {
          this.activateSuperMode();
          this.konamiIndex = 0;
        }
      } else {
        this.konamiIndex = key === KONAMI_SEQUENCE[0] ? 1 : 0;
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private activateSuperMode(): void {
    this.superMode.set(true);
    // Big burst from center
    if (isPlatformBrowser(this.platformId)) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => this.spawnBurst(cx + (Math.random() - 0.5) * 200, cy + (Math.random() - 0.5) * 200), i * 80);
      }
    }
    if (this.superTimer) clearTimeout(this.superTimer);
    this.superTimer = setTimeout(() => this.superMode.set(false), 6000);
  }

  private animate(): void {
    const lerp = (start: number, end: number, amount: number) => (1 - amount) * start + amount * end;

    this.ringX = lerp(this.ringX, this.mouseX, 0.2);
    this.ringY = lerp(this.ringY, this.mouseY, 0.2);
    this.glowX = lerp(this.glowX, this.mouseX, 0.12);
    this.glowY = lerp(this.glowY, this.mouseY, 0.12);

    if (this.cursor) {
      this.renderer.setStyle(this.cursor, 'transform', `translate(${this.mouseX}px, ${this.mouseY}px)`);
    }
    if (this.cursorRing) {
      this.renderer.setStyle(this.cursorRing, 'transform', `translate(${this.ringX - 20}px, ${this.ringY - 20}px)`);
    }
    if (this.cursorGlow) {
      this.renderer.setStyle(this.cursorGlow, 'transform', `translate(${this.glowX}px, ${this.glowY}px)`);
    }

    // Update trail history (newest first)
    this.trailHistory.unshift({ x: this.mouseX, y: this.mouseY });
    if (this.trailHistory.length > TRAIL_LENGTH) this.trailHistory.length = TRAIL_LENGTH;

    this.trailEls.forEach((el, i) => {
      const lag = i * 2;
      const point = this.trailHistory[Math.min(lag, this.trailHistory.length - 1)];
      if (!point) return;
      const scale = 1 - i / (TRAIL_LENGTH + 2);
      this.renderer.setStyle(el, 'transform', `translate(${point.x}px, ${point.y}px) scale(${scale})`);
    });

    requestAnimationFrame(() => this.animate());
  }

  private initializeBackToTop(): void {
    this.appShell = this.el.nativeElement.querySelector('.app-shell');
    const sentinel = this.el.nativeElement.querySelector('.back-to-top-sentinel');
    if (!sentinel) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.scrollHandler = () => {
        const scrollY = Math.max(
          window.scrollY || 0,
          document.documentElement.scrollTop || 0,
          document.body.scrollTop || 0,
          this.appShell?.scrollTop || 0
        );
        this.showBackToTop.set(scrollY > 420);
      };

      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      this.appShell?.addEventListener('scroll', this.scrollHandler, { passive: true });
      this.scrollHandler();
      return;
    }

    this.backToTopObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.showBackToTop.set(!entry.isIntersecting);
      },
      {
        root: this.appShell,
        threshold: 0,
      }
    );

    this.backToTopObserver.observe(sentinel);
  }

  private initializeScrollProgress(): void {
    const bar = this.el.nativeElement.querySelector('.scroll-xp') as HTMLElement | null;
    if (!bar) return;
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const pct = Math.min(100, (window.scrollY / total) * 100);
      this.renderer.setStyle(bar, 'width', `${pct}%`);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    this.scrollProgressCleanup = () => window.removeEventListener('scroll', update);
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.appShell && this.appShell.scrollTop > 0) {
        this.appShell.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
