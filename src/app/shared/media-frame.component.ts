import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import type { Media } from '../data/portfolio.data';
import { IconComponent } from './icon.component';
import { AnalyticsService } from '../core/analytics.service';

/**
 * Renders one media item: an image, a self-hosted video (mp4/webm) or a YouTube video.
 * YouTube uses a "lite" facade: only a thumbnail loads until the visitor presses play.
 */
@Component({
  selector: 'app-media-frame',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; position: relative; width: 100%; height: 100%; background: #0a090e; overflow: hidden; }
    img, video, iframe { width: 100%; height: 100%; object-fit: cover; border: 0; display: block; }
    video { object-fit: contain; background: #000; }
    img.contain { object-fit: contain; background: #1b1822; }
    .yt { position: relative; width: 100%; height: 100%; padding: 0; border: 0; cursor: pointer; background: #000; }
    .yt img { opacity: .85; transition: opacity .3s, transform .6s cubic-bezier(.22,1,.36,1); }
    .yt:hover img { opacity: 1; transform: scale(1.02); }
    .play {
      position: absolute; inset: 0; margin: auto; width: 84px; height: 84px; border-radius: 50%;
      display: grid; place-items: center; background: var(--accent); color: var(--accent-ink);
      box-shadow: 0 10px 40px -10px rgba(162, 116, 255, .8); transition: transform .3s cubic-bezier(.22,1,.36,1);
    }
    .play app-icon { margin-left: 4px; }
    .yt:hover .play { transform: scale(1.08); }
    @media (prefers-reduced-motion: reduce) { .yt:hover img, .yt:hover .play { transform: none; } }
  `,
  template: `
    @switch (item().kind) {
      @case ('image') {
        <img [src]="image()!.src" [alt]="image()!.alt" [class.contain]="image()!.fit === 'contain'" [attr.loading]="eager() ? 'eager' : 'lazy'" decoding="async" />
      }
      @case ('video') {
        <video [src]="video()!.src" [attr.poster]="video()!.poster ?? null" controls playsinline preload="metadata"
               [attr.aria-label]="title() + ' demo video'" (play)="onPlay()"></video>
      }
      @case ('youtube') {
        @if (playing()) {
          <iframe [src]="ytEmbed()" [title]="title() + ' video'" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
        } @else {
          <button type="button" class="yt" (click)="playing.set(true); onPlay()" [attr.aria-label]="'Play ' + title() + ' video'">
            <img [src]="ytThumb()" alt="" loading="lazy" />
            <span class="play"><app-icon name="play" [size]="30" /></span>
          </button>
        }
      }
    }
  `,
})
export class MediaFrameComponent {
  readonly item = input.required<Media>();
  readonly title = input('');
  readonly eager = input(false);

  protected readonly playing = signal(false);
  private readonly analytics = inject(AnalyticsService);
  private played = false;

  /** Counts the first play of each video per page view. */
  protected onPlay(): void {
    if (this.played) return;
    this.played = true;
    this.analytics.track('video-play', { project: this.title() || 'unknown' });
  }
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly image = computed(() => { const m = this.item(); return m.kind === 'image' ? m : null; });
  protected readonly video = computed(() => { const m = this.item(); return m.kind === 'video' ? m : null; });
  private readonly ytId = computed(() => {
    const m = this.item();
    return m.kind === 'youtube' && /^[\w-]{6,20}$/.test(m.id) ? m.id : '';
  });
  protected readonly ytThumb = computed(() => `https://i.ytimg.com/vi/${this.ytId()}/hqdefault.jpg`);
  protected readonly ytEmbed = computed<SafeResourceUrl>(() =>
    // The id is validated above, so only youtube-nocookie.com embed URLs can be produced here.
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${this.ytId()}?autoplay=1&rel=0&modestbranding=1`,
    ),
  );
}
