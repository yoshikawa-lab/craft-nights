import Phaser from 'phaser';
import { GAME, TILE, PALETTE } from '../core/Constants';
import type { WorldMap } from '../systems/WorldMap';

export class MinimapUI {
  private scene: Phaser.Scene;
  private world: WorldMap;
  private rt: Phaser.GameObjects.RenderTexture;
  private cursor: Phaser.GameObjects.Rectangle;
  private readonly MMW = 96;
  private readonly MMH = 48;
  private readonly PX  = GAME.WIDTH - 8;
  private readonly PY  = 36;

  constructor(scene: Phaser.Scene, world: WorldMap) {
    this.scene = scene;
    this.world = world;

    this.rt = scene.add.renderTexture(this.PX - this.MMW, this.PY, this.MMW, this.MMH)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(105).setAlpha(0.8);

    scene.add.rectangle(this.PX - this.MMW - 1, this.PY - 1, this.MMW + 2, this.MMH + 2)
      .setStrokeStyle(1, 0x555555).setFillStyle()
      .setOrigin(0, 0).setScrollFactor(0).setDepth(104);

    this.cursor = scene.add.rectangle(0, 0, 2, 2, 0xffffff)
      .setScrollFactor(0).setDepth(106);

    this.renderMap();
  }

  private renderMap() {
    const g  = this.scene.make.graphics({ x: 0, y: 0 });
    const W  = this.world.W;
    const H  = this.world.H;
    const pw = this.MMW / W;
    const ph = this.MMH / H;

    const COLORS: Record<number, number> = {
      [TILE.AIR]:           0x87ceeb,
      [TILE.GRASS]:         0x228b22,
      [TILE.DIRT]:          0x8b5e3c,
      [TILE.STONE]:         0x666688,
      [TILE.WOOD_LOG]:      0x8b4513,
      [TILE.LEAVES]:        0x2d6b2d,
      [TILE.WATER]:         0x1e90ff,
      [TILE.SAND]:          0xdaa520,
      [TILE.COAL_ORE]:      0x333333,
      [TILE.IRON_ORE]:      0xaa8866,
      [TILE.GOLD_ORE]:      0xffd700,
      [TILE.DIAMOND_ORE]:   0x00ffff,
      [TILE.EMERALD_ORE]:   0x00cc44,
      [TILE.ANCIENT_BRICK]: 0x885522,
      [TILE.LAVA]:          0xff4400,
    };

    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        const t = this.world.get(x, y);
        g.fillStyle(COLORS[t] ?? 0x444444);
        g.fillRect(x * pw, y * ph, Math.max(1, pw), Math.max(1, ph));
      }
    }
    this.rt.draw(g, 0, 0);
    g.destroy();
  }

  update(playerX: number, playerY: number) {
    const W  = this.world.W * GAME.TILE_SIZE;
    const H  = this.world.H * GAME.TILE_SIZE;
    const rx  = (playerX / W) * this.MMW;
    const ry  = (playerY / H) * this.MMH;
    this.cursor.setPosition(this.PX - this.MMW + rx, this.PY + ry);
  }

  destroy() {
    this.rt.destroy();
    this.cursor.destroy();
  }
}
