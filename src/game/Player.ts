import { approach, rectsOverlap, TILE_SIZE, type InputSnapshot, type Rect } from "./types";
import type { Level } from "./Level";

const RUN_SPEED = 118;
const WALK_SPEED = 84;
const GROUND_ACCEL = 720;
const AIR_ACCEL = 430;
const FRICTION = 820;
const GRAVITY = 620;
const MAX_FALL_SPEED = 260;
const JUMP_SPEED = 205;
const JUMP_CUT_MULTIPLIER = 0.48;
const COYOTE_TIME = 0.09;
const JUMP_BUFFER = 0.11;

export class Player {
  readonly bounds: Rect;
  velocityX = 0;
  velocityY = 0;
  grounded = false;
  facing = 1;
  dead = false;
  jumpedThisFrame = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private wasJumpHeld = false;
  private walkTime = 0;

  constructor(x: number, y: number) {
    this.bounds = { x: x + 2, y: y, width: 12, height: 16 };
  }

  update(dt: number, input: InputSnapshot, level: Level): void {
    this.jumpedThisFrame = false;

    if (this.dead) {
      this.velocityY = Math.min(this.velocityY + GRAVITY * dt, MAX_FALL_SPEED);
      this.bounds.y += this.velocityY * dt;
      return;
    }

    const axis = Number(input.right) - Number(input.left);
    const maxSpeed = input.run ? RUN_SPEED : WALK_SPEED;
    const accel = this.grounded ? GROUND_ACCEL : AIR_ACCEL;

    if (axis !== 0) {
      this.velocityX = approach(this.velocityX, axis * maxSpeed, accel * dt);
      this.facing = axis;
    } else {
      this.velocityX = approach(this.velocityX, 0, FRICTION * dt);
    }

    if (input.jumpPressed) {
      this.jumpBufferTimer = JUMP_BUFFER;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    this.coyoteTimer = this.grounded ? COYOTE_TIME : Math.max(0, this.coyoteTimer - dt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocityY = -JUMP_SPEED;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.jumpedThisFrame = true;
    }

    if (!input.jump && this.wasJumpHeld && this.velocityY < 0) {
      this.velocityY *= JUMP_CUT_MULTIPLIER;
    }

    this.wasJumpHeld = input.jump;
    this.velocityY = Math.min(this.velocityY + GRAVITY * dt, MAX_FALL_SPEED);

    this.moveHorizontally(dt, level);
    this.moveVertically(dt, level);
    this.collectAndInteract(level);

    this.walkTime += Math.abs(this.velocityX) > 5 && this.grounded ? dt * 12 : dt * 2;

    if (this.bounds.y > level.height + TILE_SIZE * 2 || level.isHazard(this.bounds)) {
      this.kill();
    }
  }

  kill(): void {
    this.dead = true;
    this.velocityX = 0;
    this.velocityY = -150;
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const x = Math.round(this.bounds.x - cameraX);
    const y = Math.round(this.bounds.y - cameraY);
    const bob = this.grounded && Math.abs(this.velocityX) > 10 ? Math.round(Math.sin(this.walkTime) * 1) : 0;
    const flipOffset = this.facing < 0 ? -1 : 1;

    ctx.fillStyle = "#24405f";
    ctx.fillRect(x + 2, y + 7 + bob, 8, 7);
    ctx.fillStyle = "#f2c68d";
    ctx.fillRect(x + 3, y + 2 + bob, 7, 6);
    ctx.fillStyle = "#d94141";
    ctx.fillRect(x + 2, y + bob, 9, 3);
    ctx.fillRect(x + 1, y + 2 + bob, 11, 2);
    ctx.fillStyle = "#1e1d2a";
    ctx.fillRect(x + (this.facing > 0 ? 8 : 3), y + 4 + bob, 1, 1);
    ctx.fillStyle = "#f7d37f";
    ctx.fillRect(x + 1 - flipOffset, y + 8 + bob, 3, 4);
    ctx.fillRect(x + 9 - flipOffset, y + 8 + bob, 3, 4);
    ctx.fillStyle = "#3a2a20";
    ctx.fillRect(x + 2, y + 14, 4, 2);
    ctx.fillRect(x + 7, y + 14, 4, 2);
  }

  private moveHorizontally(dt: number, level: Level): void {
    this.bounds.x += this.velocityX * dt;
    const hits = level.getSolidTiles(this.bounds);

    for (const hit of hits) {
      if (this.velocityX > 0) {
        this.bounds.x = hit.x - this.bounds.width;
      } else if (this.velocityX < 0) {
        this.bounds.x = hit.x + hit.width;
      }
      this.velocityX = 0;
    }
  }

  private moveVertically(dt: number, level: Level): void {
    this.bounds.y += this.velocityY * dt;
    this.grounded = false;
    const hits = level.getSolidTiles(this.bounds);

    for (const hit of hits) {
      if (this.velocityY > 0) {
        this.bounds.y = hit.y - this.bounds.height;
        this.grounded = true;
      } else if (this.velocityY < 0) {
        this.bounds.y = hit.y + hit.height;
        this.hitBlocksFromBelow(level, hit);
      }

      this.velocityY = 0;
    }
  }

  private collectAndInteract(level: Level): void {
    for (const coin of level.coins) {
      if (!coin.collected && rectsOverlap(this.bounds, coin.bounds)) {
        coin.collected = true;
      }
    }

    for (const enemy of level.enemies) {
      if (!enemy.alive || !rectsOverlap(this.bounds, enemy.bounds)) {
        continue;
      }

      const fallingOntoEnemy = this.velocityY > 0 && this.bounds.y + this.bounds.height - enemy.bounds.y < 9;
      if (fallingOntoEnemy) {
        enemy.stomp();
        this.velocityY = -JUMP_SPEED * 0.72;
      } else {
        this.kill();
      }
    }
  }

  private hitBlocksFromBelow(level: Level, hit: Rect): void {
    for (const block of level.blocks) {
      if (block.bounds === hit && block.hit()) {
        const bonusCoin = level.coins.find((coin) => coin.collected);
        if (bonusCoin) {
          bonusCoin.bounds.x = block.bounds.x + 4;
          bonusCoin.bounds.y = block.bounds.y - 14;
          bonusCoin.collected = false;
        }
      }
    }
  }
}
