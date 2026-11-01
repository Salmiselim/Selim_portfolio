import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { PROJECTS, SITE } from '../data/portfolio.data';
import { IconComponent } from '../shared/icon.component';
import { MediaGalleryComponent } from '../shared/media-gallery.component';

/** Case-study page for one project. The `id` input is bound from the route (withComponentInputBinding). */
@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, IconComponent, MediaGalleryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent {
  readonly id = input<string>();

  protected readonly project = computed(() => PROJECTS.find((p) => p.id === this.id()) ?? null);
  protected readonly index = computed(() => PROJECTS.findIndex((p) => p.id === this.id()));
  protected readonly total = PROJECTS.length;
  protected readonly prev = computed(() => PROJECTS[(this.index() - 1 + PROJECTS.length) % PROJECTS.length]);
  protected readonly next = computed(() => PROJECTS[(this.index() + 1) % PROJECTS.length]);

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const p = this.project();
      if (p) {
        seo.update({ title: `${p.title}: ${p.kicker} | Selim Salmi`, description: p.summary, path: `/projects/${p.id}` });
      } else {
        seo.update({ title: `Project not found | ${SITE.name}`, description: SITE.description, path: '/' });
      }
    });
  }
}
