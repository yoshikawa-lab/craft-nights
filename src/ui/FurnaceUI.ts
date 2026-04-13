import Phaser from 'phaser';
import { SMELT_RECIPE, ITEM_NAME, GAME, PALETTE } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';

export class FurnaceUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.buildPanel();
  }

  private buildPanel() {
    const sc = this.scene;
    const W = 200, H = 220;
    const cx = (GAME.WIDTH - W) / 2;
    const cy = (GAME.HEIGHT - H) / 2;

    const bg    = sc.add.rectangle(cx, cy, W, H, 0x1a1a1a, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x555555);
    const title = sc.add.text(cx + W / 2, cy + 8, '🔥 かまど', { fontSize: '12px', color: '#ff8800' }).setOrigin(0.5, 0);
    const closeBtn = sc.add.text(cx + W - 8, cy + 4, '✕', { fontSize: '12px', color: '#ff4444' }).setOrigin(1, 0).setInteractive();
    closeBtn.on('pointerdown', () => this.close());

    this.container.add([bg, title, closeBtn]);

    let row = 0;
    for (const [ore, recipe] of Object.entries(SMELT_RECIPE)) {
      const y = cy + 36 + row * 46;
      const oreName    = ITEM_NAME[ore]           ?? ore;
      const resultName = ITEM_NAME[recipe.result] ?? recipe.result;
      const fuelName   = ITEM_NAME[recipe.fuel]   ?? recipe.fuel;

      const hasOre  = GameState.countItem(ore as never) > 0;
      const hasFuel = GameState.countItem(recipe.fuel as never) >= recipe.fuelCount;
      const canSmelt= hasOre && hasFuel;

      const rowBg = sc.add.rectangle(cx + 6, y, W - 12, 42, canSmelt ? 0x1e2e1a : 0x1a1a1a).setOrigin(0, 0);
      const txt   = sc.add.text(cx + 10, y + 4,
        `${oreName}+${fuelName}×${recipe.fuelCount} → ${resultName}`,
        { fontSize: '8px', color: canSmelt ? '#ccffcc' : '#777' });
      const btn   = sc.add.text(cx + W - 14, y + 14, 'Smelt', {
        fontSize: '9px', color: canSmelt ? '#ffdd44' : '#444',
        backgroundColor: canSmelt ? '#333' : '#111',
        padding: { x: 4, y: 2 },
      }).setOrigin(1, 0);

      if (canSmelt) {
        btn.setInteractive();
        btn.on('pointerdown', () => {
          GameState.consumeItem(ore as never, 1);
          GameState.consumeItem(recipe.fuel as never, recipe.fuelCount);
          GameState.addItem(recipe.result);
          EventBus.emit(EV.ITEM_SMELTED, recipe.result);
          EventBus.emit(EV.INVENTORY_CHANGED);
          EventBus.emit(EV.SHOW_TOAST, `${resultName} を精錬！`);
          this.close();
          this.open();
        });
      }
      this.container.add([rowBg, txt, btn]);
      row++;
    }
  }

  open() {
    this.isOpen = true;
    this.container.setVisible(true);
    EventBus.emit(EV.UI_OPEN, 'furnace');
  }

  close() {
    this.isOpen = false;
    this.container.setVisible(false);
    EventBus.emit(EV.UI_CLOSE, 'furnace');
  }

  toggle() { this.isOpen ? this.close() : this.open(); }
  get visible() { return this.isOpen; }

  destroy() { this.container.destroy(); }
}
