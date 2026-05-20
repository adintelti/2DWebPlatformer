# Canvas Ridge

A small browser-playable 2D platformer demo built with Vanilla TypeScript and HTML5 Canvas.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Controls

- Move: Arrow keys or WASD
- Jump: Space, Z, or K
- Run: Shift, X, or J
- Pause/unpause: Escape
- Restart: R

## Implemented Demo Systems

- Fixed timestep game loop
- Responsive pixel-art canvas scaling
- Tile-based level parsing and collisions
- Platformer movement with acceleration, friction, coyote time, jump buffering, and variable jump height
- Camera follow with look-ahead and bounds
- Coins, bonus block, walking enemy, stomp behavior, goal marker, score, timer, and simple Web Audio sound cues
