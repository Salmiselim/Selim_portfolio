import { RenderMode, ServerRoute } from '@angular/ssr';
import { PROJECTS } from './data/portfolio.data';

export const serverRoutes: ServerRoute[] = [
  {
    // One static HTML page per project, generated at build time (good for SEO and link previews).
    path: 'projects/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PROJECTS.map((p) => ({ id: p.id })),
  },
  { path: 'arcade', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
