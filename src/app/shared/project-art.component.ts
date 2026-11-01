import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ProjectArt } from '../data/portfolio.data';

interface Tile { x: number; y: number }

/**
 * Original vector cover art for each project (no screenshots needed — set
 * `image` on a project in portfolio.data.ts to show a real screenshot instead).
 * Colours come from `currentColor`, so the art follows the project's accent.
 */
@Component({
  selector: 'app-project-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    svg { width: 100%; height: 100%; display: block; }
    .soft { opacity: .55; } .faint { opacity: .25; } .fill { fill: currentColor; stroke: none; }
  `,
  template: `
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      @switch (art()) {
        @case ('board') {
          @for (t of tiles(); track $index) {
            <rect [attr.x]="t.x" [attr.y]="t.y" width="34" height="34" rx="7" [class.soft]="$index % 3 !== 0" [class.faint]="$index % 3 === 1" />
          }
          <g transform="translate(200 120) rotate(-14)">
            <rect x="-34" y="-34" width="68" height="68" rx="14" class="fill" opacity=".12" />
            <rect x="-34" y="-34" width="68" height="68" rx="14" stroke-width="2.5" />
            <circle cx="-16" cy="-16" r="4.5" class="fill" /><circle cx="16" cy="-16" r="4.5" class="fill" />
            <circle cx="0" cy="0" r="4.5" class="fill" />
            <circle cx="-16" cy="16" r="4.5" class="fill" /><circle cx="16" cy="16" r="4.5" class="fill" />
          </g>
        }
        @case ('arena') {
          <g transform="translate(200 120)">
            <circle r="26" class="soft" /><circle r="54" stroke-dasharray="3 7" class="soft" />
            <circle r="84" class="faint" /><circle r="112" stroke-dasharray="1 9" class="faint" />
            @for (a of spokes; track a) { <line x1="0" y1="-30" x2="0" y2="-84" [attr.transform]="'rotate(' + a + ')'" class="faint" /> }
            <path d="M0-20 6-6 20 0 6 6 0 20-6 6-20 0-6-6Z" class="fill" opacity=".9" />
            <path d="M0-52 4-4 52 0 4 4 0 52-4 4-52 0-4-4Z" class="soft" />
            <circle cx="-120" cy="-62" r="3" class="fill" /><circle cx="108" cy="-70" r="2.5" class="fill" />
            <circle cx="126" cy="46" r="3.5" class="fill" opacity=".6" /><circle cx="-98" cy="70" r="2.5" class="fill" opacity=".6" />
          </g>
        }
        @case ('pulse') {
          @for (r of [0, 1, 2, 3, 4]; track r) { <line x1="0" [attr.y1]="30 + r * 45" x2="400" [attr.y2]="30 + r * 45" class="faint" stroke-dasharray="2 8" /> }
          <path d="M0 125h92l14-22 18 62 22-98 20 74 14-16h220" stroke-width="2.75" />
          <path d="M0 125h92l14-22 18 62 22-98 20 74 14-16h220" stroke-width="9" opacity=".12" />
          <g transform="translate(318 56)">
            <circle r="26" class="soft" />
            <path d="M-9 0h18M0-9v18" stroke-width="3" />
          </g>
          <circle cx="170" cy="54" r="3" class="fill" /><circle cx="64" cy="188" r="2.5" class="fill" opacity=".6" />
        }
        @case ('ice') {
          <g transform="translate(120 130) rotate(-12)"><rect x="-52" y="-52" width="104" height="104" rx="20" class="soft" /><rect x="-30" y="-30" width="60" height="60" rx="12" class="faint" /></g>
          <g transform="translate(262 92) rotate(10)"><rect x="-40" y="-40" width="80" height="80" rx="16" stroke-width="2.25" /><path d="M-40-16h16M-40 6h8" class="soft" /></g>
          <g transform="translate(300 190) rotate(-6)"><rect x="-26" y="-26" width="52" height="52" rx="12" class="soft" /></g>
          <g transform="translate(70 52)" class="soft">
            <path d="M0-16v32M-14-8l28 16M-14 8l28-16" /><circle r="3" class="fill" />
          </g>
          <circle cx="206" cy="190" r="14" class="fill" opacity=".85" /><path d="M206 176c0-8 6-12 12-12" stroke-width="2.25" />
          <circle cx="352" cy="46" r="3" class="fill" /><circle cx="30" cy="186" r="2.5" class="fill" opacity=".6" />
        }
        @case ('bug') {
          @for (r of [0, 1, 2, 3]; track r) { <line x1="0" [attr.y1]="200 - r * 46" x2="400" [attr.y2]="200 - r * 46" class="faint" stroke-dasharray="2 9" /> }
          <path d="M40 200c60-6 90-40 150-44s110 30 170 18" class="soft" stroke-dasharray="4 8" />
          <g transform="translate(212 118) rotate(18)">
            <ellipse rx="34" ry="44" class="fill" opacity=".12" />
            <ellipse rx="34" ry="44" stroke-width="2.5" />
            <path d="M0-44v88" class="soft" />
            <circle cy="-54" r="14" stroke-width="2.25" />
            <path d="M-6-66c-6-12-14-16-22-16M6-66c6-12 14-16 22-16" />
            <path d="M-33-14-56-28M-34 6-60 4M-30 26-52 44M33-14 56-28M34 6 60 4M30 26 52 44" />
            <circle cx="-12" cy="-14" r="5" class="fill" /><circle cx="12" cy="10" r="5" class="fill" /><circle cx="-10" cy="22" r="3.5" class="fill" opacity=".7" />
          </g>
          <circle cx="330" cy="58" r="22" class="soft" /><path d="M318 58h24M330 46v24" class="faint" />
          <circle cx="70" cy="62" r="3" class="fill" /><circle cx="356" cy="184" r="2.5" class="fill" opacity=".6" />
        }
        @case ('route') {
          @for (r of [0, 1, 2, 3, 4]; track r) { <line x1="0" [attr.y1]="30 + r * 45" x2="400" [attr.y2]="30 + r * 45" class="faint" stroke-dasharray="2 8" /> }
          <path d="M56 182c40-10 52-60 96-64s54 46 98 40 40-86 90-96" stroke-width="2.75" />
          <path d="M56 182c40-10 52-60 96-64s54 46 98 40 40-86 90-96" stroke-width="9" opacity=".12" />
          @for (pt of [[56, 182], [152, 118], [250, 158], [340, 62]]; track $index) {
            <g [attr.transform]="'translate(' + pt[0] + ' ' + pt[1] + ')'">
              <path d="M0 0c-9-11-14-18-14-25a14 14 0 0 1 28 0c0 7-5 14-14 25Z" class="fill" opacity=".18" />
              <path d="M0 0c-9-11-14-18-14-25a14 14 0 0 1 28 0c0 7-5 14-14 25Z" />
              <circle cy="-25" r="4.5" class="fill" />
            </g>
          }
        }
      }
    </svg>
  `,
})
export class ProjectArtComponent {
  readonly art = input.required<ProjectArt>();
  protected readonly spokes = [0, 45, 90, 135, 180, 225, 270, 315];

  /** Tiles along the border of a 330×170 "board", leaving the middle for the die. */
  protected readonly tiles = computed<Tile[]>(() => {
    const out: Tile[] = [];
    const x0 = 36, y0 = 28, step = 42, cols = 8, rows = 4;
    for (let c = 0; c < cols; c++) { out.push({ x: x0 + c * step, y: y0 }); out.push({ x: x0 + c * step, y: y0 + (rows - 1) * step + 16 }); }
    for (let r = 1; r < rows - 1; r++) { out.push({ x: x0, y: y0 + r * step + 8 }); out.push({ x: x0 + (cols - 1) * step, y: y0 + r * step + 8 }); }
    return out;
  });
}
