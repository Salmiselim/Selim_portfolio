import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PROJECTS } from './projects.data';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly theme = inject(ThemeService);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly projectId = computed(() => this.paramMap().get('id') ?? '');
  readonly project = computed(
    () => PROJECTS.find((item) => item.id === this.projectId()) ?? null
  );
  readonly isMonopoly = computed(() => this.projectId() === 'meganopoly-xr');
  readonly isMagicArena = computed(() => this.projectId() === 'magic-arena-xr');
  readonly isIceCream = computed(() => this.projectId() === 'bad-ice-cream-3d');

  private readonly themeEffect = effect(() => {
    const id = this.projectId();
    const theme =
      id === 'meganopoly-xr' ? 'monopoly' :
      id === 'magic-arena-xr' ? 'magic' :
      id === 'bad-ice-cream-3d' ? 'icecream' : null;
    this.theme.setProjectTheme(theme);
  });

  ngOnDestroy(): void {
    this.theme.setProjectTheme(null);
  }
}
