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
import { NgIcon, provideIcons } from '@ng-icons/core';
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

@Component({
  selector: 'app-root',
  template: `
    <div
      class="app"
      [attr.data-theme]="theme.isLight() ? 'light' : 'dark'"
      [attr.data-project-theme]="theme.projectTheme()"
    >
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
      <div class="cursor-glow"></div>
      <div class="custom-cursor"></div>
      <div class="cursor-ring"></div>
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
  private appShell: HTMLElement | null = null;
  private backToTopObserver: IntersectionObserver | null = null;

  private cursor!: HTMLElement;
  private cursorRing!: HTMLElement;
  private cursorGlow!: HTMLElement;
  private cards: HTMLElement[] = [];
  private scrollRevealElements: HTMLElement[] = [];

  private mouseX = 0;
  private mouseY = 0;
  private ringX = 0;
  private ringY = 0;
  private glowX = 0;
  private glowY = 0;

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeCursor();
      this.initializeCardInteractions();
      this.initializeScrollReveal();
      this.initializeBackToTop();
      this.animate();
    }
  }

  ngOnDestroy(): void {
    if (this.scrollHandler && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.appShell?.removeEventListener('scroll', this.scrollHandler);
    }
    this.backToTopObserver?.disconnect();
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

    const interactiveElements = this.el.nativeElement.querySelectorAll(
      'a, button, .card, .chip, .timeline-item'
    );
    interactiveElements.forEach((el: HTMLElement) => {
      el.addEventListener('mouseenter', () => this.renderer.addClass(appRoot, 'cursor-interactive'));
      el.addEventListener('mouseleave', () => this.renderer.removeClass(appRoot, 'cursor-interactive'));
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

        const rotateX = (y / height - 0.5) * -15; // Max rotation 7.5deg
        const rotateY = (x / width - 0.5) * 15; // Max rotation 7.5deg

        this.renderer.setStyle(card, 'transform', `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
        this.renderer.setStyle(card, '--glow-x', `${x}px`);
        this.renderer.setStyle(card, '--glow-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        this.renderer.setStyle(card, 'transform', 'perspective(1000px) rotateX(0) rotateY(0)');
      });
    });
  }

  private initializeScrollReveal(): void {
    this.scrollRevealElements = Array.from(this.el.nativeElement.querySelectorAll('[data-scroll-reveal]'));

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.renderer.addClass(entry.target, 'is-visible');
          // Stagger children if any
          const children = (entry.target as HTMLElement).children;
          for (let i = 0; i < children.length; i++) {
            this.renderer.setStyle(children[i], '--stagger-index', i.toString());
          }
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    this.scrollRevealElements.forEach((el) => observer.observe(el));
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