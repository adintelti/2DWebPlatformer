import { Game } from "./game/Game";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const game = new Game(canvas);
canvas.focus();
canvas.addEventListener("pointerdown", () => canvas.focus());
game.start();
