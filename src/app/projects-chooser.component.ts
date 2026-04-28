import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROJECTS } from './projects.data';

@Component({
  selector: 'app-projects-chooser',
  templateUrl: './projects-chooser.component.html',
  styleUrls: ['./projects-chooser.component.css'],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsChooserComponent {
  readonly projects = PROJECTS;
}
