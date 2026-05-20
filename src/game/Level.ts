import { TILE_SIZE, rectsOverlap, type Rect, type TileKind, type Vec2 } from "./types";

type SpawnedLevel = {
  tiles: TileKind[][];
  playerStart: Vec2;
  coins: Coin[];
  enemies: Enemy[];
  blocks: BonusBlock[];
  goal: Rect;
};

const MAP = [
  "................................................................................................",
  "................................................................................................",
  "................................................................................................",
  "................................................................................................",
  "............................................................................................G...",
  "............................................................................................G...",
  "............................................................................................G...",
  "............................................................................................G...",
  "............................................................................................G...",
  "............................................................................................G...",
  "........................C.........................C........C................................G...",
  "......................#####.......B.............#####....#####..............................G...",
  "....P..........C......................#########...........C.................................G...",
  ".........#####........#######............................#####..............E...............G...",
  ".................E......................................................#########...........G...",
  "########################....#############################....################.....##############",
  "########################....#############################....################.....##############",
  "########################....#############################....################.....##############",
];

export class Coin {
  readonly bounds: Rect;
  collected = false;
  private wobble = 0;

  constructor(x: number, y: number) {
    this.bounds = { x: x + 4, y: y + 3, width: 8, height: 10 };
  }

  update(dt: number): void {
    this.wobble += dt * 9;
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    if (this.collected) {
      return;
    }

    const x = Math.round(this.bounds.x - cameraX);
    const y = Math.round(this.bounds.y - cameraY + Math.sin(this.wobble) * 1.5);
    ctx.fillStyle = "#ffd547";
    ctx.fillRect(x + 2, y, 4, 1);
    ctx.fillRect(x + 1, y + 1, 6, 8);
    ctx.fillRect(x + 2, y + 9, 4, 1);
    ctx.fillStyle = "#fff4a8";
    ctx.fillRect(x + 3, y + 2, 2, 6);
  }
}

export class BonusBlock {
  readonly bounds: Rect;
  used = false;
  bump = 0;

  constructor(x: number, y: number) {
    this.bounds = { x, y, width: TILE_SIZE, height: TILE_SIZE };
  }

  hit(): boolean {
    if (this.used) {
      return false;
    }

    this.used = true;
    this.bump = 1;
    return true;
  }

  update(dt: number): void {
    this.bump = Math.max(0, this.bump - dt * 5);
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const x = Math.round(this.bounds.x - cameraX);
    const y = Math.round(this.bounds.y - cameraY - Math.sin(this.bump * Math.PI) * 5);
    ctx.fillStyle = this.used ? "#9a7750" : "#e39b32";
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = this.used ? "#75583b" : "#ffd26b";
    ctx.fillRect(x + 2, y + 2, 3, 3);
    ctx.fillRect(x + 11, y + 2, 3, 3);
    ctx.fillRect(x + 2, y + 11, 3, 3);
    ctx.fillRect(x + 11, y + 11, 3, 3);
    ctx.fillStyle = this.used ? "#6c5137" : "#8b4d23";
    ctx.fillRect(x + 7, y + 4, 2, 2);
    ctx.fillRect(x + 6, y + 7, 4, 2);
    ctx.fillRect(x + 7, y + 11, 2, 2);
  }
}

export class Enemy {
  readonly bounds: Rect;
  velocityX = -34;
  alive = true;
  squash = 0;

  constructor(x: number, y: number) {
    this.bounds = { x: x + 2, y: y + 3, width: 12, height: 13 };
  }

  update(dt: number, level: Level): void {
    if (!this.alive) {
      this.squash -= dt;
      return;
    }

    this.bounds.x += this.velocityX * dt;

    if (level.collidesSolid(this.bounds) || this.shouldTurnAtEdge(level)) {
      this.bounds.x -= this.velocityX * dt;
      this.velocityX *= -1;
    }
  }

  stomp(): void {
    this.alive = false;
    this.squash = 0.35;
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    if (!this.alive && this.squash <= 0) {
      return;
    }

    const x = Math.round(this.bounds.x - cameraX);
    const y = Math.round(this.bounds.y - cameraY);
    ctx.fillStyle = this.alive ? "#7b4f32" : "#5e3b29";
    ctx.fillRect(x, y + (this.alive ? 2 : 8), this.bounds.width, this.alive ? 11 : 5);
    ctx.fillStyle = "#f1d8a8";
    ctx.fillRect(x + 2, y + 4, 2, 2);
    ctx.fillRect(x + 8, y + 4, 2, 2);
    ctx.fillStyle = "#24242d";
    ctx.fillRect(x + 2, y + 12, 3, 2);
    ctx.fillRect(x + 8, y + 12, 3, 2);
  }

  private shouldTurnAtEdge(level: Level): boolean {
    const facingRight = this.velocityX > 0;
    const footX = facingRight ? this.bounds.x + this.bounds.width + 1 : this.bounds.x - 1;
    const footY = this.bounds.y + this.bounds.height + 2;
    return !level.isSolidAt(footX, footY);
  }
}

export class Level {
  readonly width: number;
  readonly height: number;
  readonly playerStart: Vec2;
  readonly tiles: TileKind[][];
  readonly coins: Coin[];
  readonly enemies: Enemy[];
  readonly blocks: BonusBlock[];
  readonly goal: Rect;

  constructor() {
    const spawned = this.parse();
    this.tiles = spawned.tiles;
    this.playerStart = spawned.playerStart;
    this.coins = spawned.coins;
    this.enemies = spawned.enemies;
    this.blocks = spawned.blocks;
    this.goal = spawned.goal;
    this.width = this.tiles[0].length * TILE_SIZE;
    this.height = this.tiles.length * TILE_SIZE;
  }

  update(dt: number): void {
    for (const coin of this.coins) {
      coin.update(dt);
    }

    for (const block of this.blocks) {
      block.update(dt);
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, this);
    }
  }

  collidesSolid(rect: Rect): boolean {
    return this.getSolidTiles(rect).length > 0 || this.blocks.some((block) => rectsOverlap(rect, block.bounds));
  }

  isSolidAt(x: number, y: number): boolean {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    return this.getTile(tileX, tileY) !== "empty" || this.blocks.some((block) => rectsOverlap({ x, y, width: 1, height: 1 }, block.bounds));
  }

  getSolidTiles(rect: Rect): Rect[] {
    const tiles: Rect[] = [];
    const startX = Math.floor(rect.x / TILE_SIZE);
    const endX = Math.floor((rect.x + rect.width - 1) / TILE_SIZE);
    const startY = Math.floor(rect.y / TILE_SIZE);
    const endY = Math.floor((rect.y + rect.height - 1) / TILE_SIZE);

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.getTile(x, y);
        if (tile !== "empty" && tile !== "spike") {
          tiles.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
        }
      }
    }

    for (const block of this.blocks) {
      if (rectsOverlap(rect, block.bounds)) {
        tiles.push(block.bounds);
      }
    }

    return tiles;
  }

  getTile(tileX: number, tileY: number): TileKind {
    if (tileY >= this.tiles.length) {
      return "empty";
    }

    if (tileX < 0 || tileX >= this.tiles[0].length || tileY < 0) {
      return "ground";
    }

    return this.tiles[tileY][tileX];
  }

  isHazard(rect: Rect): boolean {
    const startX = Math.floor(rect.x / TILE_SIZE);
    const endX = Math.floor((rect.x + rect.width - 1) / TILE_SIZE);
    const startY = Math.floor(rect.y / TILE_SIZE);
    const endY = Math.floor((rect.y + rect.height - 1) / TILE_SIZE);

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        if (this.getTile(x, y) === "spike") {
          return true;
        }
      }
    }

    return false;
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    this.renderBackground(ctx, cameraX, cameraY);
    this.renderTiles(ctx, cameraX, cameraY);

    for (const block of this.blocks) {
      block.render(ctx, cameraX, cameraY);
    }

    for (const coin of this.coins) {
      coin.render(ctx, cameraX, cameraY);
    }

    for (const enemy of this.enemies) {
      enemy.render(ctx, cameraX, cameraY);
    }

    this.renderGoal(ctx, cameraX, cameraY);
  }

  private parse(): SpawnedLevel {
    const tiles: TileKind[][] = [];
    const coins: Coin[] = [];
    const enemies: Enemy[] = [];
    const blocks: BonusBlock[] = [];
    let playerStart: Vec2 = { x: TILE_SIZE * 3, y: TILE_SIZE * 12 };
    let goal: Rect = { x: TILE_SIZE * 90, y: TILE_SIZE * 4, width: TILE_SIZE, height: TILE_SIZE * 11 };

    MAP.forEach((row, y) => {
      const tileRow: TileKind[] = [];
      [...row].forEach((cell, x) => {
        const worldX = x * TILE_SIZE;
        const worldY = y * TILE_SIZE;
        let tile: TileKind = "empty";

        if (cell === "#") {
          tile = "ground";
        } else if (cell === "=") {
          tile = "platform";
        } else if (cell === "^") {
          tile = "spike";
        } else if (cell === "P") {
          playerStart = { x: worldX, y: worldY };
        } else if (cell === "C") {
          coins.push(new Coin(worldX, worldY));
        } else if (cell === "E") {
          enemies.push(new Enemy(worldX, worldY));
        } else if (cell === "B") {
          blocks.push(new BonusBlock(worldX, worldY));
        } else if (cell === "G") {
          goal = { x: worldX + 4, y: worldY, width: 8, height: TILE_SIZE * 4 };
        }

        tileRow.push(tile);
      });
      tiles.push(tileRow);
    });

    return { tiles, playerStart, coins, enemies, blocks, goal };
  }

  private renderBackground(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, 225);
    gradient.addColorStop(0, "#69bfe3");
    gradient.addColorStop(1, "#a7e07f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 225);

    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 12; i += 1) {
      const x = Math.round((i * 83 - cameraX * 0.22) % 520) - 80;
      const y = 24 + ((i * 29) % 42) - cameraY * 0.05;
      ctx.fillRect(x, y, 30, 7);
      ctx.fillRect(x + 8, y - 5, 22, 6);
      ctx.fillRect(x + 23, y + 2, 22, 5);
    }

    ctx.fillStyle = "#5aa86d";
    for (let i = 0; i < 8; i += 1) {
      const x = Math.round((i * 140 - cameraX * 0.45) % 760) - 120;
      const baseY = 165 - cameraY * 0.16;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 58, baseY - 56 - (i % 3) * 12);
      ctx.lineTo(x + 124, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderTiles(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const startX = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
    const endX = Math.min(this.tiles[0].length - 1, Math.floor((cameraX + 400) / TILE_SIZE) + 1);
    const startY = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
    const endY = Math.min(this.tiles.length - 1, Math.floor((cameraY + 225) / TILE_SIZE) + 1);

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.tiles[y][x];
        if (tile === "empty") {
          continue;
        }

        const drawX = Math.round(x * TILE_SIZE - cameraX);
        const drawY = Math.round(y * TILE_SIZE - cameraY);

        if (tile === "ground") {
          ctx.fillStyle = "#6c9d44";
          ctx.fillRect(drawX, drawY, TILE_SIZE, 5);
          ctx.fillStyle = "#8b5e3c";
          ctx.fillRect(drawX, drawY + 5, TILE_SIZE, 11);
          ctx.fillStyle = "#5e3c27";
          ctx.fillRect(drawX + 1, drawY + 9, 4, 2);
          ctx.fillRect(drawX + 9, drawY + 13, 5, 2);
        }
      }
    }
  }

  private renderGoal(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const x = Math.round(this.goal.x - cameraX);
    const y = Math.round(this.goal.y - cameraY);
    ctx.fillStyle = "#f4f1de";
    ctx.fillRect(x, y, 3, 66);
    ctx.fillStyle = "#ef476f";
    ctx.fillRect(x + 3, y + 5, 26, 14);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x + 8, y + 9, 9, 6);
  }
}
