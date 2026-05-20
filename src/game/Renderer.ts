import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "./types";

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private readonly buffer: HTMLCanvasElement;
  private readonly bufferCtx: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context is unavailable.");
    }

    this.ctx = context;
    this.buffer = document.createElement("canvas");
    this.buffer.width = VIRTUAL_WIDTH;
    this.buffer.height = VIRTUAL_HEIGHT;

    const bufferContext = this.buffer.getContext("2d");
    if (!bufferContext) {
      throw new Error("2D buffer context is unavailable.");
    }

    this.bufferCtx = bufferContext;
    this.bufferCtx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  destroy(): void {
    window.removeEventListener("resize", this.resize);
  }

  begin(): CanvasRenderingContext2D {
    this.bufferCtx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    return this.bufferCtx;
  }

  present(): void {
    this.ctx.fillStyle = "#101826";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.buffer,
      0,
      0,
      VIRTUAL_WIDTH,
      VIRTUAL_HEIGHT,
      this.offsetX,
      this.offsetY,
      VIRTUAL_WIDTH * this.scale,
      VIRTUAL_HEIGHT * this.scale,
    );
  }

  private readonly resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    this.scale = Math.max(
      1,
      Math.floor(Math.min(this.canvas.width / VIRTUAL_WIDTH, this.canvas.height / VIRTUAL_HEIGHT)),
    );
    this.offsetX = Math.floor((this.canvas.width - VIRTUAL_WIDTH * this.scale) / 2);
    this.offsetY = Math.floor((this.canvas.height - VIRTUAL_HEIGHT * this.scale) / 2);
  };
}
