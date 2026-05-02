import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

type Dir = 'up' | 'down' | 'left' | 'right';
type GameState = 'idle' | 'playing' | 'paused' | 'over';

interface Cell { x: number; y: number; }

const COLS = 22;
const ROWS = 18;
const CELL = 22;
const HISCORE_KEY = 'selim-arcade-snake-hi';

@Component({
  selector: 'app-arcade',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="arcade-page">
      <div class="arcade-header">
        <a class="back-link btn ghost" routerLink="/" aria-label="Back to HQ">
          <span aria-hidden="true">◀</span>
          <span>Back to HQ</span>
        </a>
        <span class="section-tag">Arcade Cabinet</span>
        <h1 class="arcade-title">PIXEL <span class="hero-grad">SNAKE</span></h1>
        <p class="arcade-subtitle" aria-hidden="true">▶ INSERT COIN — PRESS START ◀</p>
        <p class="arcade-lead">
          A bite-size pixel arcade game built into the portfolio. Use the
          <b>arrow keys</b> or <b>WASD</b> to steer. Eat glowing fruit to grow,
          dodge your tail. Press <b>P</b> to pause, <b>R</b> to restart.
        </p>
      </div>

      <div class="arcade-stage">
        <div class="cabinet-frame" aria-hidden="true">
          <span class="cabinet-corner tl"></span>
          <span class="cabinet-corner tr"></span>
          <span class="cabinet-corner bl"></span>
          <span class="cabinet-corner br"></span>
        </div>

        <div class="cabinet-marquee" aria-hidden="true">
          <span class="marquee-bulb"></span>
          <span class="marquee-text">SELIM SALMI ARCADE — SNAKE EDITION</span>
          <span class="marquee-bulb"></span>
        </div>

        <div class="hud-bar" role="status" aria-live="polite">
          <div class="hud-cell">
            <span class="hud-label">Score</span>
            <span class="hud-num">{{ pad(score()) }}</span>
          </div>
          <div class="hud-cell">
            <span class="hud-label">Hi-Score</span>
            <span class="hud-num accent-2">{{ pad(hiScore()) }}</span>
          </div>
          <div class="hud-cell">
            <span class="hud-label">Length</span>
            <span class="hud-num accent-3">{{ length() }}</span>
          </div>
          <div class="hud-cell">
            <span class="hud-label">Speed</span>
            <span class="hud-num">x{{ speedMul().toFixed(1) }}</span>
          </div>
          <div class="hud-cell">
            <span class="hud-label">Status</span>
            <span class="hud-num status-{{ state() }}">{{ stateLabel() }}</span>
          </div>
        </div>

        <div class="screen-wrap">
          <canvas
            #canvas
            class="game-canvas"
            [width]="canvasWidth"
            [height]="canvasHeight"
            (click)="canvasClick()"
            tabindex="0"
            aria-label="Snake game board"
          ></canvas>

          @if (state() === 'idle') {
            <div class="overlay">
              <p class="overlay-tag">PRESS START</p>
              <button class="btn primary" type="button" (click)="start()">▶ Start Game</button>
              <p class="overlay-hint">Arrows / WASD to move · P to pause · R to restart</p>
            </div>
          }
          @if (state() === 'paused') {
            <div class="overlay">
              <p class="overlay-tag">PAUSED</p>
              <button class="btn primary" type="button" (click)="togglePause()">▶ Resume</button>
              <p class="overlay-hint">Press P to resume</p>
            </div>
          }
          @if (state() === 'over') {
            <div class="overlay over">
              <p class="overlay-tag game-over-tag">GAME OVER</p>
              <p class="final-score">SCORE {{ pad(score()) }}</p>
              @if (newHi()) {
                <p class="new-hi" aria-hidden="true">★ NEW HI-SCORE ★</p>
              }
              <button class="btn primary" type="button" (click)="start()">▶ Play Again</button>
              <p class="overlay-hint">Press R to restart</p>
            </div>
          }
        </div>

        <div class="controls" role="group" aria-label="On-screen controls">
          <div class="dpad">
            <button class="dpad-btn up" type="button" (click)="setDir('up')" aria-label="Up">▲</button>
            <button class="dpad-btn left" type="button" (click)="setDir('left')" aria-label="Left">◀</button>
            <button class="dpad-btn right" type="button" (click)="setDir('right')" aria-label="Right">▶</button>
            <button class="dpad-btn down" type="button" (click)="setDir('down')" aria-label="Down">▼</button>
          </div>
          <div class="action-pad">
            <button class="action-btn a" type="button" (click)="primaryAction()" aria-label="Start or Pause">
              <span class="key">A</span>
              <span class="label">{{ state() === 'playing' ? 'PAUSE' : (state() === 'paused' ? 'RESUME' : 'START') }}</span>
            </button>
            <button class="action-btn b" type="button" (click)="start()" aria-label="Restart">
              <span class="key">B</span>
              <span class="label">RESTART</span>
            </button>
          </div>
        </div>
      </div>

      <div class="legend">
        <div class="legend-item">
          <span class="legend-swatch fruit"></span>
          <span>Fruit — +10 score, grow +1</span>
        </div>
        <div class="legend-item">
          <span class="legend-swatch power"></span>
          <span>Power Pixel — 1-in-6 chance, +25 score</span>
        </div>
        <div class="legend-item">
          <span class="legend-swatch snake"></span>
          <span>Don't crash into yourself or the wall</span>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      color: var(--text);
    }

    .arcade-page {
      display: flex;
      flex-direction: column;
      gap: 28px;
      padding-bottom: 40px;
    }

    .arcade-header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }

    .arcade-title {
      font-family: 'Press Start 2P', system-ui, sans-serif;
      font-size: clamp(1.4rem, 3vw + 0.6rem, 2.4rem);
      letter-spacing: 0.06em;
      margin: 4px 0;
      color: var(--text);
      text-shadow: 0 0 18px rgba(88, 248, 192, 0.3);
    }

    .arcade-subtitle {
      font-family: 'Press Start 2P', system-ui, sans-serif;
      font-size: 0.65rem;
      letter-spacing: 0.3em;
      color: var(--accent);
      animation: subtitle-blink 1.4s step-end infinite;
    }

    @keyframes subtitle-blink {
      0%, 100% { opacity: 0.95; }
      50% { opacity: 0.45; }
    }

    .arcade-lead {
      max-width: 60ch;
      color: var(--muted);
      line-height: 1.6;
    }

    .arcade-lead b { color: var(--accent); font-weight: 700; }

    /* Cabinet stage */
    .arcade-stage {
      position: relative;
      padding: 28px 24px;
      background:
        radial-gradient(circle at 50% 0%, rgba(88, 248, 192, 0.07), transparent 55%),
        linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 2px solid color-mix(in srgb, var(--accent) 30%, var(--line));
      border-radius: 6px;
      box-shadow: 12px 12px 0 var(--shadow);
      isolation: isolate;
    }

    .cabinet-frame {
      position: absolute; inset: 0;
      pointer-events: none;
      z-index: 4;
    }

    .cabinet-corner {
      position: absolute;
      width: 24px; height: 24px;
      pointer-events: none;
    }
    .cabinet-corner.tl { top: -2px; left: -2px;
      border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
    .cabinet-corner.tr { top: -2px; right: -2px;
      border-top: 2px solid var(--accent); border-right: 2px solid var(--accent); }
    .cabinet-corner.bl { bottom: -2px; left: -2px;
      border-bottom: 2px solid var(--accent); border-left: 2px solid var(--accent); }
    .cabinet-corner.br { bottom: -2px; right: -2px;
      border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }

    .cabinet-marquee {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 8px 14px;
      margin: 0 auto 18px;
      max-width: 520px;
      font-family: 'Press Start 2P', system-ui, sans-serif;
      font-size: 0.6rem;
      letter-spacing: 0.18em;
      color: #ffd166;
      background: linear-gradient(180deg, #211608 0%, #382008 100%);
      border: 1px solid rgba(255, 184, 97, 0.35);
      border-radius: 4px;
      box-shadow: 0 0 18px rgba(255, 184, 97, 0.15), inset 0 0 18px rgba(0,0,0,0.6);
      text-shadow: 0 0 10px rgba(255, 184, 97, 0.55);
    }

    .marquee-bulb {
      width: 8px; height: 8px;
      background: #ffd166;
      border-radius: 50%;
      box-shadow: 0 0 8px #ffd166, 0 0 16px rgba(255, 184, 97, 0.5);
      animation: bulb-blink 1.6s ease-in-out infinite alternate;
    }

    .marquee-bulb:last-child { animation-delay: 0.8s; }

    @keyframes bulb-blink {
      0% { opacity: 0.4; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1.15); }
    }

    /* HUD */
    .hud-bar {
      display: flex;
      gap: 0;
      padding: 12px 14px;
      margin-bottom: 18px;
      background: linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15)), var(--panel);
      border: 1px solid color-mix(in srgb, var(--accent-3) 35%, var(--line));
      border-radius: 4px;
      box-shadow: inset 0 0 30px rgba(124, 201, 255, 0.06);
      flex-wrap: wrap;
    }

    .hud-cell {
      flex: 1;
      min-width: 100px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
      text-align: center;
      padding: 6px 8px;
      border-right: 1px dashed color-mix(in srgb, var(--accent-3) 25%, transparent);
    }
    .hud-cell:last-child { border-right: none; }

    .hud-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .hud-num {
      font-family: 'Press Start 2P', system-ui, sans-serif;
      font-size: 0.95rem;
      color: var(--accent);
      letter-spacing: 0.06em;
      text-shadow: 0 0 10px rgba(88, 248, 192, 0.45), 0 2px 0 rgba(0,0,0,0.4);
    }
    .hud-num.accent-2 { color: var(--accent-2); text-shadow: 0 0 10px rgba(255, 184, 97, 0.45); }
    .hud-num.accent-3 { color: var(--accent-3); text-shadow: 0 0 10px rgba(124, 201, 255, 0.45); }
    .status-idle { color: var(--muted); text-shadow: none; font-size: 0.7rem; }
    .status-playing { color: #4ade80; text-shadow: 0 0 10px rgba(74, 222, 128, 0.55); font-size: 0.7rem; }
    .status-paused { color: var(--accent-2); text-shadow: 0 0 10px rgba(255, 184, 97, 0.55); font-size: 0.7rem; }
    .status-over { color: #ff5b6f; text-shadow: 0 0 10px rgba(255, 91, 111, 0.55); font-size: 0.7rem; }

    /* Screen */
    .screen-wrap {
      position: relative;
      display: grid;
      place-items: center;
      padding: 14px;
      background: #050810;
      border: 2px solid #0c1422;
      border-radius: 6px;
      box-shadow:
        inset 0 0 28px rgba(0,0,0,0.85),
        inset 0 0 80px rgba(88, 248, 192, 0.05),
        0 0 0 4px #1a1f2c,
        0 0 0 6px #0a0f17,
        0 12px 0 rgba(0,0,0,0.45);
      max-width: 100%;
      overflow: hidden;
    }

    .screen-wrap::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px);
      pointer-events: none;
      mix-blend-mode: screen;
      z-index: 2;
    }

    .screen-wrap::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%);
      pointer-events: none;
      z-index: 2;
    }

    .game-canvas {
      display: block;
      max-width: 100%;
      height: auto;
      image-rendering: pixelated;
      background:
        repeating-linear-gradient(0deg, rgba(124, 201, 255, 0.025) 0 1px, transparent 1px 22px),
        repeating-linear-gradient(90deg, rgba(124, 201, 255, 0.025) 0 1px, transparent 1px 22px),
        radial-gradient(circle at 50% 50%, #0a141f 0%, #050810 100%);
      outline: none;
      cursor: crosshair;
    }

    /* Overlay (start, pause, gameover) */
    .overlay {
      position: absolute;
      inset: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 24px;
      background: rgba(5, 8, 16, 0.78);
      backdrop-filter: blur(2px);
      border-radius: 4px;
      z-index: 3;
    }

    .overlay-tag {
      font-family: 'Press Start 2P', system-ui, sans-serif;
      font-size: clamp(1rem, 2vw + 0.5rem, 1.6rem);
      letter-spacing: 0.18em;
      color: var(--accent);
      text-shadow: 0 0 14px rgba(88, 248, 192, 0.55), 0 2px 0 rgba(0,0,0,0.6);
      margin: 0;
      animation: overlay-blink 1s step-end infinite;
    }

    .game-over-tag {
      color: #ff5b6f;
      text-shadow: 3px 0 rgba(255, 80, 80, 0.7), -3px 0 rgba(88, 248, 192, 0.7), 0 0 16px rgba(255, 91, 111, 0.5);
      animation: glitch-shake 0.4s steps(2) infinite;
    }

    @keyframes glitch-shake {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(-2px, 1px); }
    }

    @keyframes overlay-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .final-score {
      font-family: 'Press Start 2P', system-ui, sans-serif;
      font-size: 0.85rem;
      color: var(--accent-2);
      letter-spacing: 0.16em;
      margin: 0;
    }

    .new-hi {
      font-family: 'Press Start 2P', system-ui, sans-serif;
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      color: #ffd166;
      animation: new-hi-pulse 0.8s ease-in-out infinite alternate;
      text-shadow: 0 0 16px #ffd166, 0 0 28px rgba(255, 184, 97, 0.6);
      margin: 0;
    }

    @keyframes new-hi-pulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.08); }
    }

    .overlay-hint {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: var(--muted);
      text-transform: uppercase;
      margin: 0;
    }

    /* Controls (D-pad + buttons) */
    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      margin-top: 22px;
      flex-wrap: wrap;
    }

    .dpad {
      display: grid;
      grid-template-columns: repeat(3, 44px);
      grid-template-rows: repeat(3, 44px);
      gap: 4px;
      width: max-content;
    }

    .dpad-btn {
      grid-row: 2; grid-column: 2;
      width: 44px; height: 44px;
      background: linear-gradient(180deg, var(--panel-2), var(--panel));
      border: 2px solid color-mix(in srgb, var(--accent-3) 40%, var(--line));
      color: var(--text);
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 4px 0 rgba(0,0,0,0.4);
      transition: transform 0.1s ease, box-shadow 0.1s ease, border-color 0.2s ease;
    }
    .dpad-btn:hover { border-color: var(--accent); }
    .dpad-btn:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 rgba(0,0,0,0.4);
    }
    .dpad-btn.up    { grid-row: 1; grid-column: 2; }
    .dpad-btn.left  { grid-row: 2; grid-column: 1; }
    .dpad-btn.right { grid-row: 2; grid-column: 3; }
    .dpad-btn.down  { grid-row: 3; grid-column: 2; }

    .action-pad {
      display: flex;
      gap: 14px;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 76px;
      padding: 10px 12px;
      border: 2px solid rgba(0,0,0,0.35);
      border-radius: 999px;
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
      box-shadow: 0 5px 0 rgba(0,0,0,0.45);
      font-family: 'JetBrains Mono', monospace;
    }

    .action-btn:active {
      transform: translateY(3px);
      box-shadow: 0 2px 0 rgba(0,0,0,0.45);
    }

    .action-btn.a {
      background: radial-gradient(circle at 30% 30%, #ff8aa1, #ff4769 75%);
      color: #2a040d;
    }
    .action-btn.b {
      background: radial-gradient(circle at 30% 30%, #93dcff, #4aa9e6 75%);
      color: #051628;
    }
    .action-btn .key {
      font-family: 'Press Start 2P', system-ui, sans-serif;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
    }
    .action-btn .label {
      font-size: 0.55rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    /* Legend */
    .legend {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      padding: 18px;
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 6px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      color: var(--muted);
      letter-spacing: 0.04em;
    }

    .legend-swatch {
      width: 18px; height: 18px;
      border-radius: 2px;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 0 8px currentColor;
    }
    .legend-swatch.fruit { background: #ff5b6f; color: #ff5b6f; }
    .legend-swatch.power { background: #ffd166; color: #ffd166; }
    .legend-swatch.snake { background: #58f8c0; color: #58f8c0; }

    .hero-grad {
      background: linear-gradient(110deg, var(--accent) 0%, var(--accent-3) 50%, var(--accent-2) 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
      animation: arcade-grad 6s ease-in-out infinite;
    }

    @keyframes arcade-grad {
      0%, 100% { background-position: 0% 50%; }
      50%      { background-position: 100% 50%; }
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: max-content;
    }

    @media (max-width: 720px) {
      .controls { justify-content: center; }
      .arcade-stage { padding: 22px 14px; }
      .hud-cell { min-width: 80px; }
      .hud-num { font-size: 0.8rem; }
    }
  `],
})
export class ArcadeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private platformId = inject(PLATFORM_ID);
  readonly canvasWidth = COLS * CELL;
  readonly canvasHeight = ROWS * CELL;

  readonly state = signal<GameState>('idle');
  readonly score = signal(0);
  readonly hiScore = signal(0);
  readonly length = signal(3);
  readonly speedMul = signal(1.0);
  readonly newHi = signal(false);

  private snake: Cell[] = [];
  private dir: Dir = 'right';
  private nextDir: Dir = 'right';
  private fruit: Cell = { x: 10, y: 9 };
  private isPower = false;
  private tick = 0;
  private lastTime = 0;
  private accumulator = 0;
  private rafId: number | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // visual state
  private flashTimer = 0;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    try {
      const stored = localStorage.getItem(HISCORE_KEY);
      if (stored) this.hiScore.set(parseInt(stored, 10) || 0);
    } catch { /* storage may be blocked */ }

    this.resetGame();
    this.draw();
    canvas.focus();
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  stateLabel(): string {
    switch (this.state()) {
      case 'idle': return 'READY';
      case 'playing': return 'LIVE';
      case 'paused': return 'PAUSE';
      case 'over': return 'OVER';
    }
  }

  pad(n: number): string {
    return n.toString().padStart(5, '0');
  }

  start(): void {
    this.resetGame();
    this.state.set('playing');
    this.lastTime = performance.now();
    this.accumulator = 0;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.loop(this.lastTime);
  }

  togglePause(): void {
    if (this.state() === 'playing') {
      this.state.set('paused');
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.draw();
    } else if (this.state() === 'paused') {
      this.state.set('playing');
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  primaryAction(): void {
    const s = this.state();
    if (s === 'idle' || s === 'over') this.start();
    else this.togglePause();
  }

  canvasClick(): void {
    this.canvasRef.nativeElement.focus();
    if (this.state() === 'idle' || this.state() === 'over') this.start();
  }

  setDir(d: Dir): void {
    const opposites: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (this.dir === opposites[d]) return;
    this.nextDir = d;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase()) ||
        ['w', 'a', 's', 'd', 'p', 'r', ' '].includes(key)) {
      // Prevent page scroll on arrow keys / space
      if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
    }
    if (key === 'arrowup' || key === 'w') this.setDir('up');
    else if (key === 'arrowdown' || key === 's') this.setDir('down');
    else if (key === 'arrowleft' || key === 'a') this.setDir('left');
    else if (key === 'arrowright' || key === 'd') this.setDir('right');
    else if (key === 'p' || key === ' ') {
      if (this.state() === 'idle' || this.state() === 'over') this.start();
      else this.togglePause();
    }
    else if (key === 'r') this.start();
  }

  private resetGame(): void {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    this.dir = 'right';
    this.nextDir = 'right';
    this.score.set(0);
    this.length.set(this.snake.length);
    this.speedMul.set(1.0);
    this.newHi.set(false);
    this.placeFruit();
    this.flashTimer = 0;
    this.particles.length = 0;
  }

  private placeFruit(): void {
    const occupied = new Set(this.snake.map((c) => `${c.x},${c.y}`));
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) return;
    this.fruit = free[Math.floor(Math.random() * free.length)];
    this.isPower = Math.random() < (1 / 6);
  }

  private loop = (time: number): void => {
    if (this.state() !== 'playing') return;
    const dt = time - this.lastTime;
    this.lastTime = time;
    this.accumulator += dt;
    const stepMs = 130 / this.speedMul();
    while (this.accumulator >= stepMs) {
      this.step();
      this.accumulator -= stepMs;
      if (this.state() !== 'playing') break;
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private step(): void {
    this.dir = this.nextDir;
    const head = this.snake[0];
    const next: Cell = { x: head.x, y: head.y };
    if (this.dir === 'up') next.y--;
    else if (this.dir === 'down') next.y++;
    else if (this.dir === 'left') next.x--;
    else next.x++;

    // Wall collision
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      return this.gameOver();
    }
    // Self collision (skip last tail since it'll move)
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === next.x && this.snake[i].y === next.y) {
        return this.gameOver();
      }
    }

    this.snake.unshift(next);

    // Eat fruit?
    if (next.x === this.fruit.x && next.y === this.fruit.y) {
      const points = this.isPower ? 25 : 10;
      this.score.update((s) => s + points);
      this.length.set(this.snake.length);
      this.speedMul.update((m) => Math.min(2.4, m + 0.05));
      this.flashTimer = 6;
      this.spawnBurst(this.fruit.x, this.fruit.y, this.isPower ? '#ffd166' : '#ff5b6f');
      this.placeFruit();
    } else {
      this.snake.pop();
    }
    this.tick++;
  }

  private gameOver(): void {
    this.state.set('over');
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.score() > this.hiScore()) {
      this.hiScore.set(this.score());
      this.newHi.set(true);
      try {
        localStorage.setItem(HISCORE_KEY, String(this.score()));
      } catch { /* ignore */ }
    }
    this.spawnBurst(this.snake[0].x, this.snake[0].y, '#ff5b6f', 30);
    this.draw();
  }

  private spawnBurst(gx: number, gy: number, color: string, count = 14): void {
    const cx = gx * CELL + CELL / 2;
    const cy = gy * CELL + CELL / 2;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1 + Math.random() * 2.4;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 28 + Math.floor(Math.random() * 16),
        color,
      });
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Clear with subtle fade trail
    ctx.fillStyle = 'rgba(5, 8, 16, 0.55)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Grid
    ctx.strokeStyle = 'rgba(124, 201, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, this.canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(this.canvasWidth, y * CELL + 0.5);
      ctx.stroke();
    }

    // Flash on eat
    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(88, 248, 192, ${0.04 * this.flashTimer})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.flashTimer--;
    }

    // Fruit
    this.drawFruit();

    // Snake
    this.drawSnake();

    // Particles
    this.drawParticles();

    // Border vignette
    ctx.strokeStyle = 'rgba(88, 248, 192, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, this.canvasWidth - 2, this.canvasHeight - 2);
  }

  private drawSnake(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const len = this.snake.length;
    for (let i = len - 1; i >= 0; i--) {
      const cell = this.snake[i];
      const isHead = i === 0;
      const t = 1 - i / Math.max(1, len);
      // Body color gradient teal -> cyan
      const r = Math.round(88 + (124 - 88) * (1 - t));
      const g = Math.round(248 + (201 - 248) * (1 - t));
      const b = Math.round(192 + (255 - 192) * (1 - t));
      const color = `rgb(${r}, ${g}, ${b})`;

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = isHead ? 18 : 6;
      ctx.fillStyle = color;
      const px = cell.x * CELL + 2;
      const py = cell.y * CELL + 2;
      const sz = CELL - 4;
      ctx.fillRect(px, py, sz, sz);

      // Inner pixel highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,255,255,${isHead ? 0.35 : 0.15})`;
      ctx.fillRect(px + 2, py + 2, 4, 4);

      if (isHead) {
        // Eyes
        ctx.fillStyle = '#06141c';
        const e = CELL / 4;
        const offsets = this.dirOffsets();
        ctx.fillRect(px + sz / 2 - e + offsets.ex - 2, py + sz / 2 - e + offsets.ey - 2, 3, 3);
        ctx.fillRect(px + sz / 2 - e + offsets.ex + 6, py + sz / 2 - e + offsets.ey - 2, 3, 3);
      }
    }
    ctx.shadowBlur = 0;
  }

  private dirOffsets(): { ex: number; ey: number } {
    if (this.dir === 'left') return { ex: -3, ey: 0 };
    if (this.dir === 'right') return { ex: 3, ey: 0 };
    if (this.dir === 'up') return { ex: 0, ey: -3 };
    return { ex: 0, ey: 3 };
  }

  private drawFruit(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const px = this.fruit.x * CELL + 2;
    const py = this.fruit.y * CELL + 2;
    const sz = CELL - 4;
    const pulse = 0.85 + Math.sin(performance.now() / 220) * 0.15;
    const color = this.isPower ? '#ffd166' : '#ff5b6f';
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = color;
    ctx.fillRect(px, py, sz, sz);
    ctx.shadowBlur = 0;
    // Pixel highlight
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(px + 3, py + 3, 4, 4);
    if (this.isPower) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(px + sz - 6, py + sz - 6, 3, 3);
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const alpha = Math.max(0, Math.min(1, p.life / 32));
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x | 0, p.y | 0, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}
