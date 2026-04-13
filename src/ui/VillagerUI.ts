import Phaser from 'phaser';
import { GAME, ITEM_NAME } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';
import type { Villager } from '../objects/Villager';

export class VillagerUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
  }

  open(villager: Villager) {
    this.container.removeAll(true);

    const sc = this.scene;
    const W  = 220, H = 160 + villager.trades.length * 36;
    const cx = (GAME.WIDTH - W) / 2;
    const cy = (GAME.HEIGHT - H) / 2;

    const bg    = sc.add.rectangle(cx, cy, W, H, 0x1a1a1a, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x555555);
    const title = sc.add.text(cx + W / 2, cy + 8, '村人と交易', { fontSize: '12px', color: '#ffdd44' }).setOrigin(0.5, 0);
    const closeBtn = sc.add.text(cx + W - 8, cy + 4, '✕', { fontSize: '12px', color: '#ff4444' }).setOrigin(1, 0).setInteractive();
    closeBtn.on('pointerdown', () => this.close());
    this.container.add([bg, title, closeBtn]);

    villager.trades.forEach((trade, i) => {
      const y = cy + 30 + i * 36;
      const buyName  = ITEM_NAME[trade.buy]  ?? trade.buy;
      const sellName = ITEM_NAME[trade.sell] ?? trade.sell;
      const hasItems = GameState.countItem(trade.buy as never) >= trade.buyCount;

      const rowBg = sc.add.rectangle(cx + 6, y, W - 12, 32, hasItems ? 0x1e3a1e : 0x222, 0.9).setOrigin(0, 0);
      const txt   = sc.add.text(cx + 12, y + 4,
        `${buyName}×${trade.buyCount} → ${sellName}×${trade.sellCount}`,
        { fontSize: '9px', color: hasItems ? '#ccffcc' : '#777' });

      const btn = sc.add.text(cx + W - 14, y + 8, '交換', {
        fontSize: '10px', color: hasItems ? '#ffdd44' : '#444',
        backgroundColor: hasItems ? '#333' : '#111',
        padding: { x: 4, y: 2 },
      }).setOrigin(1, 0);

      if (hasItems) {
        btn.setInteractive();
        btn.on('pointerdown', () => {
          GameState.consumeItem(trade.buy as never, trade.buyCount);
          GameState.addItem(trade.sell as never, trade.sellCount);
          EventBus.emit(EV.INVENTORY_CHANGED);
          EventBus.emit(EV.SHOW_TOAST, `${sellName} を入手！`);
          this.close();
          this.open(villager);
        });
      }
      this.container.add([rowBg, txt, btn]);
    });

    this.isOpen = true;
    this.container.setVisible(true);
    EventBus.emit(EV.UI_OPEN, 'villager');
  }

  close() {
    this.isOpen = false;
    this.container.setVisible(false);
    EventBus.emit(EV.UI_CLOSE, 'villager');
  }

  get visible() { return this.isOpen; }
  destroy() { this.container.destroy(); }
}
