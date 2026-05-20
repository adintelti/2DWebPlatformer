import { AudioSynth } from "./AudioSynth";
import { Input } from "./Input";
import { Level } from "./Level";
import { drawPixelText } from "./PixelText";
import { Player } from "./Player";
import { Renderer } from "./Renderer";
import {
  clamp,
  FIXED_TIMESTEP,
  rectsOverlap,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
  type Camera,
  type GameMode,
  type LevelStats,
} from "./types";

export class Game {
  private readonly input = new Input();
  private readonly audio = new AudioSynth();
  private readonly renderer: Renderer;
  private level = new Level();
  private player = new Player(this.level.playerStart.x, this.level.playerStart.y);
  private camera: Camera = { x: 0, y: 0, width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT };
  private mode: GameMode = "title";
  private accumulator = 0;
  private lastTime = 0;
  private animationFrame = 0;
  private stats: LevelStats = { coins: 0, score: 0, time: 300 };
  private playedDeathSound = false;
  private playedEndSound = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
  }

  start(): void {
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    this.input.destroy();
    this.renderer.destroy();
  }

  private readonly frame = (timeMs: number): void => {
    const time = timeMs / 1000;
    const delta = Math.min(0.1, time - this.lastTime || 0);
    this.lastTime = time;
    this.accumulator += delta;

    while (this.accumulator >= FIXED_TIMESTEP) {
      this.update(FIXED_TIMESTEP);
      this.input.endFrame();
      this.accumulator -= FIXED_TIMESTEP;
    }

    this.render();
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    const input = this.input.snapshot();

    if (input.restart) {
      this.audio.resume();
      this.reset();
      this.mode = "playing";
      return;
    }

    if (this.mode === "title") {
      if (input.startPressed) {
        this.audio.resume();
        this.mode = "playing";
      }
      return;
    }

    if (this.mode === "paused") {
      if (input.pausePressed) {
        this.mode = "playing";
      }
      return;
    }

    if (this.mode === "dead" || this.mode === "complete") {
      if (input.startPressed) {
        this.audio.resume();
        this.reset();
        this.mode = "playing";
      }
      return;
    }

    if (input.pausePressed) {
      this.mode = "paused";
      return;
    }

    this.stats.time = Math.max(0, this.stats.time - dt);
    this.level.update(dt);
    const coinsBefore = this.level.coins.filter((coin) => coin.collected).length;
    const enemiesBefore = this.level.enemies.filter((enemy) => !enemy.alive).length;
    this.player.update(dt, input, this.level);
    this.updateStats();
    this.playFrameAudio(coinsBefore, enemiesBefore);
    this.updateCamera(dt);

    if (this.player.dead) {
      if (!this.playedDeathSound) {
        this.audio.play("hurt");
        this.playedDeathSound = true;
      }
      this.mode = "dead";
    }

    if (rectsOverlap(this.player.bounds, this.level.goal)) {
      this.mode = "complete";
      if (!this.playedEndSound) {
        this.audio.play("goal");
        this.stats.score += Math.ceil(this.stats.time) * 10;
        this.playedEndSound = true;
      }
    }

    if (this.stats.time <= 0) {
      this.player.kill();
      this.mode = "dead";
    }
  }

  private render(): void {
    const ctx = this.renderer.begin();
    this.level.render(ctx, this.camera.x, this.camera.y);
    this.player.render(ctx, this.camera.x, this.camera.y);
    this.renderHud(ctx);

    if (this.mode === "title") {
      this.renderOverlay(ctx, "Canvas Ridge", "Press Enter or Space");
    } else if (this.mode === "dead") {
      this.renderOverlay(ctx, "Try Again", "Press Enter Space or R");
    } else if (this.mode === "paused") {
      this.renderOverlay(ctx, "Paused", "Press Escape");
    } else if (this.mode === "complete") {
      this.renderOverlay(ctx, "Goal!", "Press Enter Space or R");
    }

    this.renderer.present();
  }

  private reset(): void {
    this.level = new Level();
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
    this.camera = { x: 0, y: 0, width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT };
    this.stats = { coins: 0, score: 0, time: 30 };
    this.playedDeathSound = false;
    this.playedEndSound = false;
  }

  private updateStats(): void {
    const coins = this.level.coins.filter((coin) => coin.collected).length;
    const defeated = this.level.enemies.filter((enemy) => !enemy.alive).length;
    this.stats.coins = coins;
    this.stats.score = coins * 100 + defeated * 250;
  }

  private playFrameAudio(coinsBefore: number, enemiesBefore: number): void {
    const coinsAfter = this.level.coins.filter((coin) => coin.collected).length;
    const enemiesAfter = this.level.enemies.filter((enemy) => !enemy.alive).length;

    if (this.player.jumpedThisFrame) {
      this.audio.play("jump");
    }

    if (coinsAfter > coinsBefore) {
      this.audio.play("coin");
    }

    if (enemiesAfter > enemiesBefore) {
      this.audio.play("stomp");
    }
  }

  private updateCamera(dt: number): void {
    const lookAhead = this.player.facing * 34;
    const targetX = this.player.bounds.x + this.player.bounds.width / 2 - VIRTUAL_WIDTH / 2 + lookAhead;
    const targetY = this.player.bounds.y + this.player.bounds.height / 2 - VIRTUAL_HEIGHT / 2 + 12;
    const maxX = Math.max(0, this.level.width - VIRTUAL_WIDTH);
    const maxY = Math.max(0, this.level.height - VIRTUAL_HEIGHT);

    this.camera.x += (clamp(targetX, 0, maxX) - this.camera.x) * Math.min(1, dt * 5);
    this.camera.y += (clamp(targetY, 0, maxY) - this.camera.y) * Math.min(1, dt * 5);
  }

  private renderHud(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(20, 25, 36, 0.55)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, 20);
    drawPixelText(ctx, `SCORE ${this.stats.score.toString().padStart(6, "0")}`, 10, 7, "#fff8d6");
    drawPixelText(ctx, `COINS ${this.stats.coins.toString().padStart(2, "0")}`, 158, 7, "#fff8d6");
    drawPixelText(ctx, `TIME ${Math.ceil(this.stats.time).toString().padStart(3, "0")}`, 314, 7, "#fff8d6");
  }

  private renderOverlay(ctx: CanvasRenderingContext2D, title: string, prompt: string): void {
    ctx.fillStyle = "rgba(15, 23, 36, 0.72)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    drawPixelText(ctx, title, VIRTUAL_WIDTH / 2, 82, "#ffe08a", 4, "center");
    drawPixelText(ctx, prompt, VIRTUAL_WIDTH / 2, 121, "#f8f4d8", 2, "center");
    drawPixelText(ctx, "Move: arrows/WASD", VIRTUAL_WIDTH / 2, 145, "#f8f4d8", 1, "center");
    drawPixelText(ctx, "Jump: space/Z/K  Run: shift/X/J", VIRTUAL_WIDTH / 2, 157, "#f8f4d8", 1, "center");
  }
}
