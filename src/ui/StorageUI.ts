import Phaser from 'phaser';
import { GAME, ITEM_NAME, PALETTE, UI } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState, InventorySlot } from '../core/GameState';

export class StorageUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isOpen = false;
  /** チェスト固有のスロット (27スロット) */
  private chestInventory: InventorySlot[] = Array.from({ length: 27 }, () => ({ item: null, count: 0 }));
  private slotObjs: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.buildPanel();
  }

  private buildPanel() {
    const sc = this.scene;
    const W = 300, H = 260;
    const cx = (GAME.WIDTH - W) / 2;
    const cy = (GAME.HEIGHT - H) / 2;
    const slotSz = 30, pad = 4;
    const cols = 9;

    const bg    = sc.add.rectangle(cx, cy, W, H, 0x1a1a1a, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x555555);
    const title = sc.add.text(cx + W / 2, cy + 6, '収納箱', { fontSize: '11px', color: '#ffdd44' }).setOrigin(0.5, 0);
    const closeBtn = sc.add.text(cx + W - 8, cy + 4, '✕', { fontSize: '12px', color: '#ff4444' }).setOrigin(1, 0).setInteractive();
    closeBtn.on('pointerdown', () => this.close());
    this.container.add([bg, title, closeBtn]);

    // チェストスロット表示
    for (let i = 0; i < 27; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sx  = cx + 8 + col * (slotSz + pad);
      const sy  = cy + 26 + row * (slotSz + pad);

      const bg2 = sc.add.rectangle(sx, sy, slotSz, slotSz, PALETTE.UI_SLOT).setOrigin(0, 0).setStrokeStyle(1, PALETTE.UI_BORDER);
      const txt = sc.add.text(sx + slotSz / 2, sy + slotSz / 2, '', { fontSize: '7px', color: '#fff', align: 'center' }).setOrigin(0.5);

      bg2.setInteractive();
      bg2.on('pointerdown', () => this.onSlotClick(i));
      this.container.add([bg2, txt]);
      this.slotObjs.push(txt);
    }
  }

  private onSlotClick(i: number) {
    const slot = this.chestInventory[i];
    if (!slot.item) return;
    // アイテムをプレイヤーインベントリに移動
    if (GameState.addItem(slot.item, slot.count)) {
      slot.item = null; slot.count = 0;
      EventBus.emit(EV.INVENTORY_CHANGED);
      this.refresh();
    }
  }

  refresh() {
    for (let i = 0; i < 27; i++) {
      const slot = this.chestInventory[i];
      if (slot.item) {
        const name = ITEM_NAME[slot.item] ?? slot.item;
        this.slotObjs[i].setText(name.substring(0, 4) + (slot.count > 1 ? `\n×${slot.count}` : ''));
      } else {
        this.slotObjs[i].setText('');
      }
    }
  }

  open() {
    this.isOpen = true;
    this.refresh();
    this.container.setVisible(true);
    EventBus.emit(EV.UI_OPEN, 'storage');
  }

  close() {
    this.isOpen = false;
    this.container.setVisible(false);
    EventBus.emit(EV.UI_CLOSE, 'storage');
  }

  toggle() { this.isOpen ? this.close() : this.open(); }
  get visible() { return this.isOpen; }
  destroy() { this.container.destroy(); }
}
