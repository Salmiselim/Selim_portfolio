import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PROJECTS } from './projects.data';

interface ProjectStats {
  readonly power: number;
  readonly difficulty: number; // 1-5
  readonly fun: number;
  readonly genre: string;
}

@Component({
  selector: 'app-projects-chooser',
  templateUrl: './projects-chooser.component.html',
  styleUrls: ['./projects-chooser.component.css'],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsChooserComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private el = inject(ElementRef);

  readonly projects = PROJECTS;
  readonly hoveredIndex = signal<number | null>(null);

  // Battle-card stats per project (mapped by index — order matches PROJECTS)
  readonly statsByIndex: Record<number, ProjectStats> = {
    0: { power: 92, difficulty: 4, fun: 88, genre: 'XR Board' }, // Meganopoly XR
    1: { power: 88, difficulty: 5, fun: 92, genre: 'XR Action' }, // Magic Arena XR
    2: { power: 78, difficulty: 3, fun: 95, genre: 'Arcade' }, // Bad Ice Cream 3D
  };

  private observer: IntersectionObserver | null = null;

  stars(level: number): string {
    return '★'.repeat(level) + '☆'.repeat(Math.max(0, 5 - level));
  }

  pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  setHovered(index: number | null): void {
    this.hoveredIndex.set(index);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const fills = Array.from(
      (this.el.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.power-fill'),
    );
    const grid = (this.el.nativeElement as HTMLElement).querySelector('.chooser-grid');
    if (!grid) return;

    this.observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            fills.forEach((fill, i) => {
              fill.style.transitionDelay = `${0.2 + i * 0.05}s`;
              fill.style.width = fill.dataset['pct'] ?? '0%';
            });
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    this.observer.observe(grid);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
