export const VIRTUAL_WIDTH = 400;
export const VIRTUAL_HEIGHT = 225;
export const TILE_SIZE = 16;
export const FIXED_TIMESTEP = 1 / 60;

export type GameMode = "title" | "playing" | "paused" | "dead" | "complete";

export type Vec2 = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Camera = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LevelStats = {
  coins: number;
  score: number;
  time: number;
};

export type InputSnapshot = {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  restart: boolean;
  start: boolean;
  startPressed: boolean;
  jumpPressed: boolean;
  pausePressed: boolean;
};

export type TileKind = "empty" | "ground" | "brick" | "platform" | "spike";

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function approach(value: number, target: number, step: number): number {
  if (value < target) {
    return Math.min(value + step, target);
  }

  if (value > target) {
    return Math.max(value - step, target);
  }

  return value;
}
