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

type Dir = 'up' | 'down' | 'left' | 'right';
type GameState = 'idle' | 'playing' | 'paused' | 'over';

interface Cell { x: number; y: number; }

const COLS = 22;
const ROWS = 18;
const CELL = 22;
const HISCORE_KEY = 'selim-arcade-snake-hi';

@Component({
  selector: 'app-snake-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
          <button class="btn primary" type="button" (click)="start()">▶ Start Snake</button>
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
  `,
})
export class SnakeGameComponent implements AfterViewInit, OnDestroy {
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
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
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

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) return this.gameOver();
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === next.x && this.snake[i].y === next.y) return this.gameOver();
    }

    this.snake.unshift(next);

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
      try { localStorage.setItem(HISCORE_KEY, String(this.score())); } catch { /* ignore */ }
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

    ctx.fillStyle = 'rgba(5, 8, 16, 0.55)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

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

    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(88, 248, 192, ${0.04 * this.flashTimer})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.flashTimer--;
    }

    this.drawFruit();
    this.drawSnake();
    this.drawParticles();

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
      const r = Math.round(88 + (124 - 88) * (1 - t));
      const g = Math.round(248 + (201 - 248) * (1 - t));
      const b = Math.round(192 + (255 - 192) * (1 - t));
      const color = `rgb(${r}, ${g}, ${b})`;

      ctx.shadowColor = color;
      ctx.shadowBlur = isHead ? 18 : 6;
      ctx.fillStyle = color;
      const px = cell.x * CELL + 2;
      const py = cell.y * CELL + 2;
      const sz = CELL - 4;
      ctx.fillRect(px, py, sz, sz);

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,255,255,${isHead ? 0.35 : 0.15})`;
      ctx.fillRect(px + 2, py + 2, 4, 4);

      if (isHead) {
        ctx.fillStyle = '#06141c';
        const e = CELL / 4;
        const off = this.dirOffsets();
        ctx.fillRect(px + sz / 2 - e + off.ex - 2, py + sz / 2 - e + off.ey - 2, 3, 3);
        ctx.fillRect(px + sz / 2 - e + off.ex + 6, py + sz / 2 - e + off.ey - 2, 3, 3);
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
