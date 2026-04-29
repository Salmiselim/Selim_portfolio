import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { animate as _animate, inView, stagger, wrap } from 'motion';
import { ThemeService } from './theme.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const animate = _animate as (...args: any[]) => any;

interface SkillPixel {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly delay: number;
  readonly duration: number;
  readonly driftX: number;
  readonly driftY: number;
  readonly hue: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [RouterLink, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  readonly theme = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('carouselTrack') carouselTrackRef!: ElementRef<HTMLElement>;

  carouselIndex = 0;
  readonly leadershipCards = [0, 1, 2, 3, 4]; // one entry per card

  readonly skillPixels: SkillPixel[] = Array.from({ length: 12 }, (_, index) => {
    const seed = index + 1;
    const normalized = (value: number) => value - Math.floor(value);
    const random = (salt: number) =>
      normalized(Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453);
    return {
      id: seed,
      x: 6 + random(1) * 88,
      y: 8 + random(2) * 84,
      size: 3 + Math.round(random(3) * 4),
      delay: Math.round(random(4) * 900),
      duration: 1000 + Math.round(random(5) * 1100),
      driftX: Math.round((random(6) - 0.5) * 80),
      driftY: Math.round((random(7) - 0.5) * 60),
      hue: 170 + Math.round(random(8) * 100),
    };
  });

  private readonly stopFns: Array<() => void> = [];

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupAnimations();
    }
  }

  ngOnDestroy(): void {
    this.stopFns.forEach((stop) => stop());
  }

  carouselNext(): void {
    this.carouselIndex = wrap(0, this.leadershipCards.length, this.carouselIndex + 1);
    this.scrollCarousel();
  }

  carouselPrev(): void {
    this.carouselIndex = wrap(0, this.leadershipCards.length, this.carouselIndex - 1);
    this.scrollCarousel();
  }

  private scrollCarousel(): void {
    const track = this.carouselTrackRef?.nativeElement;
    if (!track) return;
    const card = track.querySelectorAll<HTMLElement>('.card')[this.carouselIndex];
    if (!card) return;
    animate(
      track,
      { x: -card.offsetLeft },
      { duration: 0.5, easing: [0.16, 1, 0.3, 1] },
    );
  }

  private setupAnimations(): void {
    // ── Hero ──────────────────────────────────────────────────────────────
    const heroEl = document.querySelector<HTMLElement>('.hero');
    if (heroEl) {
      heroEl.style.opacity = '0';
      heroEl.style.transform = 'translateY(20px)';
      const stop = inView(
        heroEl,
        (el) => {
          animate(
            el,
            { opacity: 1, transform: 'translateY(0px)' },
            { duration: 0.7, easing: [0.16, 1, 0.3, 1] },
          );
          stop();
        },
        { amount: 0.1 },
      );
      this.stopFns.push(stop);
    }

    // ── Hero panel (Mission Control) ──────────────────────────────────────
    const panel = document.querySelector<HTMLElement>('.hero-panel');
    if (panel) {
      panel.style.opacity = '0';
      panel.style.transform = 'translateX(32px)';
      const stop = inView(
        panel,
        (el) => {
          animate(
            el,
            { opacity: 1, transform: 'translateX(0px)' },
            { duration: 0.65, easing: [0.16, 1, 0.3, 1], delay: 0.2 },
          );
          stop();
        },
        { amount: 0.2 },
      );
      this.stopFns.push(stop);
    }

    // ── Hero chips ────────────────────────────────────────────────────────
    const chipsWrap = document.querySelector<HTMLElement>('.hero-tags');
    if (chipsWrap) {
      const chips = Array.from(chipsWrap.querySelectorAll<HTMLElement>('.chip'));
      chips.forEach((chip) => {
        chip.style.opacity = '0';
        chip.style.transform = 'scale(0.75)';
      });
      const stop = inView(
        chipsWrap,
        () => {
          animate(
            chips,
            { opacity: 1, transform: 'scale(1)' },
            {
              duration: 0.4,
              easing: [0.34, 1.56, 0.64, 1],
              delay: stagger(0.05, { startDelay: 0.3 }),
            },
          );
          stop();
        },
        { amount: 0.5 },
      );
      this.stopFns.push(stop);
    }

    // ── Section titles ────────────────────────────────────────────────────
    document.querySelectorAll<HTMLElement>('.section-title').forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-32px)';
      const stop = inView(
        el,
        (target) => {
          animate(
            target,
            { opacity: 1, transform: 'translateX(0px)' },
            { duration: 0.6, easing: [0.16, 1, 0.3, 1] },
          );
          stop();
        },
        { amount: 0.3 },
      );
      this.stopFns.push(stop);
    });

    // ── Card grids ────────────────────────────────────────────────────────
    document.querySelectorAll<HTMLElement>('.card-grid').forEach((grid) => {
      const cards = Array.from(grid.querySelectorAll<HTMLElement>('.card'));
      cards.forEach((card) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(36px)';
      });
      const stop = inView(
        grid,
        () => {
          animate(
            cards,
            { opacity: 1, transform: 'translateY(0px)' },
            {
              duration: 0.55,
              easing: [0.16, 1, 0.3, 1],
              delay: stagger(0.08),
            },
          );
          stop();
        },
        { amount: 0.05 },
      );
      this.stopFns.push(stop);
    });

    // ── Skills cards ──────────────────────────────────────────────────────
    document.querySelectorAll<HTMLElement>('.skills-grid').forEach((grid) => {
      const cards = Array.from(grid.querySelectorAll<HTMLElement>('.skills-card'));
      cards.forEach((card) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(36px)';
      });
      const stop = inView(
        grid,
        () => {
          animate(
            cards,
            { opacity: 1, transform: 'translateY(0px)' },
            {
              duration: 0.55,
              easing: [0.16, 1, 0.3, 1],
              delay: stagger(0.1),
            },
          );
          stop();
        },
        { amount: 0.05 },
      );
      this.stopFns.push(stop);
    });

    // ── Timeline items ────────────────────────────────────────────────────
    const timeline = document.querySelector<HTMLElement>('.timeline');
    if (timeline) {
      const items = Array.from(
        timeline.querySelectorAll<HTMLElement>('.timeline-item'),
      );
      items.forEach((item) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(40px)';
      });
      const stop = inView(
        timeline,
        () => {
          animate(
            items,
            { opacity: 1, transform: 'translateX(0px)' },
            {
              duration: 0.55,
              easing: [0.16, 1, 0.3, 1],
              delay: stagger(0.1),
            },
          );
          stop();
        },
        { amount: 0.05 },
      );
      this.stopFns.push(stop);
    }

    // ── Training cards ────────────────────────────────────────────────────
    const training = document.querySelector<HTMLElement>('.training');
    if (training) {
      const cards = Array.from(
        training.querySelectorAll<HTMLElement>('.training-card'),
      );
      cards.forEach((card) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(28px)';
      });
      const stop = inView(
        training,
        () => {
          animate(
            cards,
            { opacity: 1, transform: 'translateY(0px)' },
            {
              duration: 0.5,
              easing: [0.16, 1, 0.3, 1],
              delay: stagger(0.12),
            },
          );
          stop();
        },
        { amount: 0.15 },
      );
      this.stopFns.push(stop);
    }

    // ── Contact panels ────────────────────────────────────────────────────
    const contactGrid = document.querySelector<HTMLElement>('.contact-grid');
    if (contactGrid) {
      const panels = Array.from(
        contactGrid.querySelectorAll<HTMLElement>('.contact-panel'),
      );
      panels.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(28px)';
      });
      const stop = inView(
        contactGrid,
        () => {
          animate(
            panels,
            { opacity: 1, transform: 'translateY(0px)' },
            {
              duration: 0.55,
              easing: [0.16, 1, 0.3, 1],
              delay: stagger(0.12),
            },
          );
          stop();
        },
        { amount: 0.2 },
      );
      this.stopFns.push(stop);
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const footer = document.querySelector<HTMLElement>('.footer');
    if (footer) {
      footer.style.opacity = '0';
      const stop = inView(
        footer,
        (el) => {
          animate(el, { opacity: 1 }, { duration: 0.6, easing: 'ease-out' });
          stop();
        },
        { amount: 0.5 },
      );
      this.stopFns.push(stop);
    }
  }

  openResume(event: MouseEvent): void {
  event.preventDefault();
  window.open('/resume.pdf', '_blank');
}
}