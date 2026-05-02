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

type GameState = 'idle' | 'playing' | 'paused' | 'over' | 'won';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: string;
  alive: boolean;
}

const W = 484;
const H = 396;
const PADDLE_W = 84;
const PADDLE_H = 12;
const BALL_R = 6;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_GAP = 6;
const BRICK_TOP = 56;
const BRICK_SIDE_PAD = 10;
const HISCORE_KEY = 'selim-arcade-breaker-hi';

const ROW_PALETTE = [
  { color: '#ff5b6f', hp: 2 },
  { color: '#ffb861', hp: 1 },
  { color: '#ffd166', hp: 1 },
  { color: '#58f8c0', hp: 1 },
  { color: '#7cc9ff', hp: 1 },
];

@Component({
  selector: 'app-breaker-game',
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
        <span class="hud-label">Lives</span>
        <span class="hud-num accent-3">{{ heartString() }}</span>
      </div>
      <div class="hud-cell">
        <span class="hud-label">Combo</span>
        <span class="hud-num">x{{ combo() }}</span>
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
        (mousemove)="onMouseMove($event)"
        (touchmove)="onTouchMove($event)"
        tabindex="0"
        aria-label="Brick Breaker game board"
      ></canvas>

      @if (state() === 'idle') {
        <div class="overlay">
          <p class="overlay-tag">PRESS START</p>
          <button class="btn primary" type="button" (click)="start()">▶ Start Breaker</button>
          <p class="overlay-hint">←/→ or A/D · Mouse or Touch · Space to launch · P to pause</p>
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
      @if (state() === 'won') {
        <div class="overlay">
          <p class="overlay-tag" style="color: var(--accent);">CLEARED!</p>
          <p class="final-score">SCORE {{ pad(score()) }}</p>
          @if (newHi()) {
            <p class="new-hi" aria-hidden="true">★ NEW HI-SCORE ★</p>
          }
          <button class="btn primary" type="button" (click)="start()">▶ Play Again</button>
          <p class="overlay-hint">All bricks destroyed</p>
        </div>
      }
    </div>

    <div class="controls" role="group" aria-label="On-screen controls">
      <div class="dpad">
        <button class="dpad-btn left" type="button" (mousedown)="setHold('left', true)" (mouseup)="setHold('left', false)" (mouseleave)="setHold('left', false)" (touchstart)="setHold('left', true); $event.preventDefault()" (touchend)="setHold('left', false); $event.preventDefault()" aria-label="Left">◀</button>
        <button class="dpad-btn right" type="button" (mousedown)="setHold('right', true)" (mouseup)="setHold('right', false)" (mouseleave)="setHold('right', false)" (touchstart)="setHold('right', true); $event.preventDefault()" (touchend)="setHold('right', false); $event.preventDefault()" aria-label="Right">▶</button>
      </div>
      <div class="action-pad">
        <button class="action-btn a" type="button" (click)="primaryAction()" aria-label="Start, Pause or Launch">
          <span class="key">A</span>
          <span class="label">{{ actionLabel() }}</span>
        </button>
        <button class="action-btn b" type="button" (click)="start()" aria-label="Restart">
          <span class="key">B</span>
          <span class="label">RESTART</span>
        </button>
      </div>
    </div>

    <div class="legend">
      <div class="legend-item">
        <span class="legend-swatch" style="background:#ff5b6f; color:#ff5b6f;"></span>
        <span>Top row — 2 hits, +30 each</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:#ffd166; color:#ffd166;"></span>
        <span>Mid rows — 1 hit, +20</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:#58f8c0; color:#58f8c0;"></span>
        <span>Combo multiplier — keep the streak alive</span>
      </div>
    </div>
  `,
})
export class BreakerGameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private platformId = inject(PLATFORM_ID);
  readonly canvasWidth = W;
  readonly canvasHeight = H;

  readonly state = signal<GameState>('idle');
  readonly score = signal(0);
  readonly hiScore = signal(0);
  readonly lives = signal(3);
  readonly combo = signal(1);
  readonly newHi = signal(false);
  readonly ballAttached = signal(true);

  private paddleX = (W - PADDLE_W) / 2;
  private paddleSpeed = 6;
  private ballX = W / 2;
  private ballY = H - 30;
  private ballVx = 3;
  private ballVy = -3;
  private bricks: Brick[] = [];
  private bricksLeft = 0;
  private holdLeft = false;
  private holdRight = false;
  private rafId: number | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    try {
      const stored = localStorage.getItem(HISCORE_KEY);
      if (stored) this.hiScore.set(parseInt(stored, 10) || 0);
    } catch { /* ignore */ }

    this.resetGame();
    this.draw();
    canvas.focus();
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  pad(n: number): string {
    return n.toString().padStart(5, '0');
  }

  heartString(): string {
    return '♥'.repeat(this.lives()) + '♡'.repeat(Math.max(0, 3 - this.lives()));
  }

  stateLabel(): string {
    switch (this.state()) {
      case 'idle': return 'READY';
      case 'playing': return 'LIVE';
      case 'paused': return 'PAUSE';
      case 'over': return 'OVER';
      case 'won': return 'CLEAR';
    }
  }

  actionLabel(): string {
    const s = this.state();
    if (s === 'playing') {
      return this.ballAttached() ? 'LAUNCH' : 'PAUSE';
    }
    if (s === 'paused') return 'RESUME';
    return 'START';
  }

  start(): void {
    this.resetGame();
    this.state.set('playing');
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.loop();
  }

  togglePause(): void {
    if (this.state() === 'playing') {
      this.state.set('paused');
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.draw();
    } else if (this.state() === 'paused') {
      this.state.set('playing');
      this.loop();
    }
  }

  primaryAction(): void {
    const s = this.state();
    if (s === 'idle' || s === 'over' || s === 'won') {
      this.start();
      return;
    }
    if (s === 'playing' && this.ballAttached()) {
      this.launchBall();
      return;
    }
    this.togglePause();
  }

  canvasClick(): void {
    this.canvasRef.nativeElement.focus();
    const s = this.state();
    if (s === 'idle' || s === 'over' || s === 'won') {
      this.start();
      return;
    }
    if (s === 'playing' && this.ballAttached()) this.launchBall();
  }

  setHold(dir: 'left' | 'right', value: boolean): void {
    if (dir === 'left') this.holdLeft = value;
    else this.holdRight = value;
  }

  onMouseMove(e: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scale = this.canvasWidth / rect.width;
    const x = (e.clientX - rect.left) * scale;
    this.paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    if (this.ballAttached()) this.ballX = this.paddleX + PADDLE_W / 2;
  }

  onTouchMove(e: TouchEvent): void {
    if (!e.touches[0]) return;
    e.preventDefault();
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const scale = this.canvasWidth / rect.width;
    const x = (e.touches[0].clientX - rect.left) * scale;
    this.paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    if (this.ballAttached()) this.ballX = this.paddleX + PADDLE_W / 2;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
    if (key === 'arrowleft' || key === 'a') this.holdLeft = true;
    else if (key === 'arrowright' || key === 'd') this.holdRight = true;
    else if (key === ' ') {
      if (this.state() === 'idle' || this.state() === 'over' || this.state() === 'won') this.start();
      else if (this.ballAttached()) this.launchBall();
      else this.togglePause();
    }
    else if (key === 'p') {
      if (this.state() === 'idle' || this.state() === 'over' || this.state() === 'won') this.start();
      else this.togglePause();
    }
    else if (key === 'r') this.start();
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') this.holdLeft = false;
    if (key === 'arrowright' || key === 'd') this.holdRight = false;
  }

  private resetGame(): void {
    this.score.set(0);
    this.lives.set(3);
    this.combo.set(1);
    this.newHi.set(false);
    this.paddleX = (W - PADDLE_W) / 2;
    this.particles.length = 0;
    this.buildBricks();
    this.attachBall();
  }

  private buildBricks(): void {
    this.bricks = [];
    const totalGap = BRICK_GAP * (BRICK_COLS + 1);
    const usableW = W - BRICK_SIDE_PAD * 2 - totalGap;
    const bw = usableW / BRICK_COLS;
    const bh = 16;
    for (let r = 0; r < BRICK_ROWS; r++) {
      const palette = ROW_PALETTE[r % ROW_PALETTE.length];
      for (let c = 0; c < BRICK_COLS; c++) {
        const x = BRICK_SIDE_PAD + BRICK_GAP + c * (bw + BRICK_GAP);
        const y = BRICK_TOP + r * (bh + BRICK_GAP);
        this.bricks.push({
          x, y, w: bw, h: bh,
          hp: palette.hp, maxHp: palette.hp,
          color: palette.color, alive: true,
        });
      }
    }
    this.bricksLeft = this.bricks.length;
  }

  private attachBall(): void {
    this.ballX = this.paddleX + PADDLE_W / 2;
    this.ballY = H - 30;
    this.ballVx = 0;
    this.ballVy = 0;
    this.ballAttached.set(true);
    this.combo.set(1);
  }

  private launchBall(): void {
    if (!this.ballAttached()) return;
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 0.6;
    const speed = 4.2;
    this.ballVx = Math.cos(angle) * speed;
    this.ballVy = Math.sin(angle) * speed;
    this.ballAttached.set(false);
  }

  private loop = (): void => {
    if (this.state() !== 'playing') return;
    this.step();
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private step(): void {
    if (this.holdLeft) this.paddleX -= this.paddleSpeed;
    if (this.holdRight) this.paddleX += this.paddleSpeed;
    this.paddleX = Math.max(0, Math.min(W - PADDLE_W, this.paddleX));

    if (this.ballAttached()) {
      this.ballX = this.paddleX + PADDLE_W / 2;
      return;
    }

    this.ballX += this.ballVx;
    this.ballY += this.ballVy;

    if (this.ballX < BALL_R) { this.ballX = BALL_R; this.ballVx = -this.ballVx; }
    else if (this.ballX > W - BALL_R) { this.ballX = W - BALL_R; this.ballVx = -this.ballVx; }
    if (this.ballY < BALL_R) { this.ballY = BALL_R; this.ballVy = -this.ballVy; }

    // Paddle collision
    const paddleY = H - 30;
    if (
      this.ballVy > 0 &&
      this.ballY + BALL_R >= paddleY &&
      this.ballY - BALL_R <= paddleY + PADDLE_H &&
      this.ballX >= this.paddleX &&
      this.ballX <= this.paddleX + PADDLE_W
    ) {
      const hit = (this.ballX - (this.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      const angle = hit * (Math.PI / 3);
      const speed = Math.min(7, Math.hypot(this.ballVx, this.ballVy) + 0.05);
      this.ballVx = Math.sin(angle) * speed;
      this.ballVy = -Math.abs(Math.cos(angle) * speed);
      this.ballY = paddleY - BALL_R;
      this.combo.set(1);
    }

    // Brick collisions
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (
        this.ballX + BALL_R > b.x &&
        this.ballX - BALL_R < b.x + b.w &&
        this.ballY + BALL_R > b.y &&
        this.ballY - BALL_R < b.y + b.h
      ) {
        const overlapX = Math.min(this.ballX + BALL_R - b.x, b.x + b.w - (this.ballX - BALL_R));
        const overlapY = Math.min(this.ballY + BALL_R - b.y, b.y + b.h - (this.ballY - BALL_R));
        if (overlapX < overlapY) this.ballVx = -this.ballVx;
        else this.ballVy = -this.ballVy;

        b.hp--;
        if (b.hp <= 0) {
          b.alive = false;
          this.bricksLeft--;
          const points = b.maxHp === 2 ? 30 : 20;
          this.score.update((s) => s + points * this.combo());
          this.combo.update((c) => Math.min(8, c + 1));
          this.spawnBurst(b.x + b.w / 2, b.y + b.h / 2, b.color);
        } else {
          this.spawnBurst(b.x + b.w / 2, b.y + b.h / 2, b.color, 6);
        }

        if (this.bricksLeft <= 0) return this.win();
        break;
      }
    }

    // Lose ball
    if (this.ballY > H + 20) {
      this.lives.update((l) => l - 1);
      if (this.lives() <= 0) return this.gameOver();
      this.attachBall();
    }
  }

  private win(): void {
    this.state.set('won');
    this.score.update((s) => s + 250 * this.lives()); // bonus for remaining lives
    this.commitHi();
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.draw();
  }

  private gameOver(): void {
    this.state.set('over');
    this.commitHi();
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.spawnBurst(this.ballX, this.ballY, '#ff5b6f', 26);
    this.draw();
  }

  private commitHi(): void {
    if (this.score() > this.hiScore()) {
      this.hiScore.set(this.score());
      this.newHi.set(true);
      try { localStorage.setItem(HISCORE_KEY, String(this.score())); } catch { /* ignore */ }
    }
  }

  private spawnBurst(x: number, y: number, color: string, count = 12): void {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 24 + Math.floor(Math.random() * 14),
        color,
      });
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.fillStyle = 'rgba(5, 8, 16, 0.6)';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(124, 201, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 22) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 22) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
    }

    // Bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      const damaged = b.hp < b.maxHp;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x | 0, b.y | 0, b.w | 0, b.h | 0);
      ctx.shadowBlur = 0;
      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect((b.x + 2) | 0, (b.y + 2) | 0, (b.w - 4) | 0, 3);
      // Damage cracks
      if (damaged) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect((b.x + b.w / 2 - 1) | 0, (b.y + 4) | 0, 2, b.h - 8);
      }
    }

    // Paddle
    const paddleY = H - 30;
    ctx.shadowColor = '#58f8c0';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#58f8c0';
    ctx.fillRect(this.paddleX | 0, paddleY | 0, PADDLE_W, PADDLE_H);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect((this.paddleX + 2) | 0, (paddleY + 2) | 0, PADDLE_W - 4, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect((this.paddleX + 2) | 0, (paddleY + PADDLE_H - 3) | 0, PADDLE_W - 4, 2);

    // Ball
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect((this.ballX - BALL_R) | 0, (this.ballY - BALL_R) | 0, BALL_R * 2, BALL_R * 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect((this.ballX - BALL_R + 2) | 0, (this.ballY - BALL_R + 2) | 0, 3, 3);

    // Aim line if attached
    if (this.ballAttached() && this.state() === 'playing') {
      ctx.strokeStyle = 'rgba(88, 248, 192, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.ballX, this.ballY);
      ctx.lineTo(this.ballX, this.ballY - 60);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life--;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      const alpha = Math.max(0, Math.min(1, p.life / 26));
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x | 0, p.y | 0, 3, 3);
    }
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = 'rgba(88, 248, 192, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
  }
}
