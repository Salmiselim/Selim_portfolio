import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CERTIFICATES, EDUCATION, EXPERIENCE, LANGUAGES, LEADERSHIP, PROFILE, PROJECTS, SHOWREEL, SITE, SKILLS, TICKER,
  type Project,
} from '../data/portfolio.data';
import { SeoService } from '../core/seo.service';
import { IconComponent } from '../shared/icon.component';
import { MediaFrameComponent } from '../shared/media-frame.component';
import { ProjectArtComponent } from '../shared/project-art.component';

/** "A, B and C" */
function listNames(names: readonly string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent, MediaFrameComponent, ProjectArtComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected readonly profile = PROFILE;
  protected readonly projects = PROJECTS;
  protected readonly experience = EXPERIENCE;
  protected readonly skills = SKILLS;
  protected readonly education = EDUCATION;
  protected readonly certificates = CERTIFICATES;
  protected readonly languages = LANGUAGES;
  protected readonly leadership = LEADERSHIP;
  protected readonly showreel = SHOWREEL;
  /** Rendered twice so the marquee can loop seamlessly. */
  protected readonly ticker = TICKER;

  /** Facts shown under the hero, all derived from the data file. */
  protected readonly facts = [
    { value: String(EXPERIENCE.length).padStart(2, '0'), label: 'Internships' },
    { value: String(PROJECTS.length).padStart(2, '0'), label: 'Projects built' },
    { value: String(PROJECTS.filter((p) => p.platform.includes('Meta Quest')).length).padStart(2, '0'), label: 'Meta Quest titles' },
  ];

  /** Work section: games first, then web platforms. */
  protected readonly groups = [
    { key: 'game', title: 'Games', items: PROJECTS.filter((p) => p.category === 'game') },
    { key: 'web', title: 'Web platforms', items: PROJECTS.filter((p) => p.category === 'web') },
  ];

  /** Games with key art appear in the itch.io section. */
  protected readonly itchGames = PROJECTS.filter((p) => p.category === 'game' && p.poster);
  protected readonly itchNames = listNames(this.itchGames.map((g) => g.title));

  /* ---- Hero reel: cycles through the game covers when no showreel is set ---- */
  protected readonly reel = PROJECTS.filter((p) => p.category === 'game');
  protected readonly reelIndex = signal(0);
  private reelTimer?: ReturnType<typeof setInterval>;
  private reelPaused = false;

  protected readonly copied = signal(false);

  constructor() {
    inject(SeoService).update({ title: SITE.title, description: SITE.description, path: '/' });
    const doc = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const reduce = doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (SHOWREEL || reduce) return;
      this.reelTimer = setInterval(() => {
        if (!this.reelPaused) this.reelIndex.update((i) => (i + 1) % this.reel.length);
      }, 4200);
      destroyRef.onDestroy(() => clearInterval(this.reelTimer));
    });
  }

  /** Cover still for cards and the hero reel: the trailer poster, else the first screenshot. */
  protected coverOf(p: Project): { src: string; contain: boolean } | null {
    if (p.cover) return { src: p.cover, contain: false };
    const video = p.media.find((m) => m.kind === 'video' && m.poster);
    if (video?.kind === 'video' && video.poster) return { src: video.poster, contain: false };
    const image = p.media.find((m) => m.kind === 'image');
    return image?.kind === 'image' ? { src: image.src, contain: false } : null;
  }

  protected hasVideo(p: Project): boolean {
    return p.media.some((m) => m.kind !== 'image');
  }

  protected pauseReel(paused: boolean): void {
    this.reelPaused = paused;
  }

  protected showReel(i: number): void {
    this.reelIndex.set(i);
  }

  protected async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    } catch {
      window.location.href = `mailto:${PROFILE.email}`;
    }
  }
}
