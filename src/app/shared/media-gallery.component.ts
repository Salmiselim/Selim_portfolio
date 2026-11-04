import {
  ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild,
} from '@angular/core';
import type { Media, Project } from '../data/portfolio.data';
import { IconComponent } from './icon.component';
import { AnalyticsService } from '../core/analytics.service';
import { MediaFrameComponent } from './media-frame.component';
import { ProjectArtComponent } from './project-art.component';

type ImageMedia = Extract<Media, { kind: 'image' }>;

/**
 * Project media: one large featured player (first video, otherwise first item) plus screenshots.
 * Screenshots open in a full-screen lightbox (native <dialog>: Esc closes, arrow keys navigate).
 * Projects without any media show their vector cover art instead.
 */
@Component({
  selector: 'app-media-gallery',
  imports: [IconComponent, MediaFrameComponent, ProjectArtComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './media-gallery.component.css',
  template: `
    <div class="gallery" [class.full]="variant() === 'full'" [style.--c]="project().color">
      <div class="feature">
        @if (featured(); as f) {
          @if (f.kind === 'image') {
            <button type="button" class="zoom" (click)="open(f)" [attr.aria-label]="'View ' + f.alt + ' full size'">
              <app-media-frame [item]="f" [title]="project().title" [eager]="eager()" />
              <span class="zoom-hint"><app-icon name="maximize" [size]="18" /></span>
            </button>
          } @else {
            <app-media-frame [item]="f" [title]="project().title" />
          }
        } @else {
          <div class="cover">
            <app-project-art [art]="project().art" />
          </div>
        }
      </div>

      @if (thumbs().length) {
        <ul class="thumbs" role="list">
          @for (m of thumbs(); track $index) {
            <li>
              <div class="thumb">
                @if (m.kind === 'image') {
                  <button type="button" class="zoom" (click)="open(m)" [attr.aria-label]="'View ' + m.alt + ' full size'">
                    <app-media-frame [item]="m" [title]="project().title" />
                    <span class="zoom-hint"><app-icon name="maximize" [size]="16" /></span>
                  </button>
                } @else {
                  <app-media-frame [item]="m" [title]="project().title" />
                }
              </div>
              @if (variant() === 'full' && m.caption) { <p class="caption">{{ m.caption }}</p> }
            </li>
          }
        </ul>
      }
    </div>

    <dialog #dialog class="lightbox" aria-label="Screenshot viewer" (click)="onDialogClick($event)" (keydown)="onKey($event)" (close)="current.set(-1)">
      @if (currentImage(); as img) {
        <figure>
          <img [src]="img.src" [alt]="img.alt" />
          <figcaption>
            <span>{{ img.caption ?? img.alt }}</span>
            <span class="count">{{ current() + 1 }} / {{ images().length }}</span>
          </figcaption>
        </figure>
        <button type="button" class="lb-btn close" (click)="close()" aria-label="Close viewer"><app-icon name="x" /></button>
        @if (images().length > 1) {
          <button type="button" class="lb-btn prev" (click)="step(-1)" aria-label="Previous screenshot"><app-icon name="chevron-left" [size]="26" /></button>
          <button type="button" class="lb-btn next" (click)="step(1)" aria-label="Next screenshot"><app-icon name="chevron-right" [size]="26" /></button>
        }
      }
    </dialog>
  `,
})
export class MediaGalleryComponent {
  readonly project = input.required<Project>();
  /** 'feature' = home page (featured + up to 4 thumbs), 'full' = case-study page (everything). */
  readonly variant = input<'feature' | 'full'>('feature');
  readonly eager = input(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private readonly media = computed(() => this.project().media);
  protected readonly featured = computed<Media | null>(
    () => this.media().find((m) => m.kind !== 'image') ?? this.media()[0] ?? null,
  );
  protected readonly thumbs = computed(() => {
    const rest = this.media().filter((m) => m !== this.featured());
    return this.variant() === 'feature' ? rest.slice(0, 4) : rest;
  });

  protected readonly images = computed(() => this.media().filter((m): m is ImageMedia => m.kind === 'image'));
  protected readonly current = signal(-1);
  protected readonly currentImage = computed(() => this.images()[this.current()] ?? null);

  private readonly analytics = inject(AnalyticsService);

  protected open(m: Media): void {
    this.analytics.track('screenshot-open', { project: this.project().title });
    this.current.set(this.images().indexOf(m as ImageMedia));
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected step(dir: number): void {
    const n = this.images().length;
    this.current.update((i) => (i + dir + n) % n);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') this.step(1);
    else if (e.key === 'ArrowLeft') this.step(-1);
  }

  /** Clicking the dark backdrop (the dialog element itself) closes the viewer. */
  protected onDialogClick(e: MouseEvent): void {
    if (e.target === this.dialog().nativeElement) this.close();
  }
}
