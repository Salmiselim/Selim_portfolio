import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  // "Health Platform" was renamed to Suivital; keep the old link working.
  { path: 'projects/health-platform', redirectTo: 'projects/suivital', pathMatch: 'full' },
  {
    path: 'projects/:id',
    loadComponent: () => import('./project/project-detail.component').then((m) => m.ProjectDetailComponent),
  },
  {
    path: 'arcade',
    title: 'Arcade | Selim Salmi',
    loadComponent: () => import('./arcade.component').then((m) => m.ArcadeComponent),
  },
  // The old "projects" list now lives on the home page.
  { path: 'projects', redirectTo: '', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
