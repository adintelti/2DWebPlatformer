import type { InputSnapshot } from "./types";

const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
const JUMP_KEYS = new Set(["Space", "KeyW", "ArrowUp", "KeyZ", "KeyK"]);
const RUN_KEYS = new Set(["ShiftLeft", "ShiftRight", "KeyX", "KeyJ"]);

export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
  }

  snapshot(): InputSnapshot {
    const jump = this.hasAny(this.down, JUMP_KEYS);

    return {
      left: this.hasAny(this.down, LEFT_KEYS),
      right: this.hasAny(this.down, RIGHT_KEYS),
      jump,
      run: this.hasAny(this.down, RUN_KEYS),
      restart: this.pressed.has("KeyR"),
      start: this.down.has("Enter") || this.down.has("Space"),
      startPressed: this.pressed.has("Enter") || this.pressed.has("Space"),
      jumpPressed: this.hasAny(this.pressed, JUMP_KEYS),
      pausePressed: this.pressed.has("Escape"),
    };
  }

  endFrame(): void {
    this.pressed.clear();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (
      LEFT_KEYS.has(event.code) ||
      RIGHT_KEYS.has(event.code) ||
      JUMP_KEYS.has(event.code) ||
      RUN_KEYS.has(event.code) ||
      event.code === "Enter" ||
      event.code === "KeyR" ||
      event.code === "Escape"
    ) {
      event.preventDefault();
    }

    if (!this.down.has(event.code)) {
      this.pressed.add(event.code);
    }

    this.down.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.down.delete(event.code);
  };

  private readonly clear = (): void => {
    this.down.clear();
    this.pressed.clear();
  };

  private hasAny(source: Set<string>, keys: Set<string>): boolean {
    for (const key of keys) {
      if (source.has(key)) {
        return true;
      }
    }

    return false;
  }
}
