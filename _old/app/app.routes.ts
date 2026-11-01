import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () =>
			import('./home.component').then((mod) => mod.HomeComponent),
	},
	{
		path: 'projects',
		loadComponent: () =>
			import('./projects-chooser.component').then(
				(mod) => mod.ProjectsChooserComponent
			),
	},
	{
		path: 'projects/:id',
		loadComponent: () =>
			import('./project-detail.component').then(
				(mod) => mod.ProjectDetailComponent
			),
		data: { renderMode: 'client' }
	},
	{
		path: 'arcade',
		loadComponent: () =>
			import('./arcade.component').then((mod) => mod.ArcadeComponent),
		data: { renderMode: 'client' }
	},
	{
		path: '**',
		redirectTo: '',
	},
];
