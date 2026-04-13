import Phaser from 'phaser';
import { CRAFT_RECIPE, ITEM_NAME, GAME, UI, PALETTE } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';

export class CraftingUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isOpen = false;
  private rows: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.buildPanel();
  }

  private buildPanel() {
    const sc = this.scene;
    const W  = 280, H = 340;
    const cx = (GAME.WIDTH - W) / 2;
    const cy = (GAME.HEIGHT - H) / 2;

    const bg    = sc.add.rectangle(cx, cy, W, H, 0x1a1a1a, 0.95).setOrigin(0, 0).setStrokeStyle(1, 0x555555);
    const title = sc.add.text(cx + W / 2, cy + 8, 'クラフト', { fontSize: '12px', color: '#ffdd44' }).setOrigin(0.5, 0);
    const closeBtn = sc.add.text(cx + W - 8, cy + 4, '✕', { fontSize: '12px', color: '#ff4444' }).setOrigin(1, 0).setInteractive();
    closeBtn.on('pointerdown', () => this.close());

    this.container.add([bg, title, closeBtn]);
    this.buildRecipes(cx + 8, cy + 28);
  }

  private buildRecipes(startX: number, startY: number) {
    const sc = this.scene;
    const recipes = Object.entries(CRAFT_RECIPE);

    recipes.forEach(([result, req], i) => {
      const row = i;
      const y   = startY + row * 28;
      if (y > GAME.HEIGHT - 40) return;

      const name  = ITEM_NAME[result] ?? result;
      const reqStr= Object.entries(req).map(([k, v]) => `${ITEM_NAME[k] ?? k}×${v}`).join(', ');
      const canCraft = GameState.hasItems(req);

      const rowBg  = sc.add.rectangle(startX, y, 264, 26, canCraft ? 0x1e3a1e : 0x2a1a1a, 0.8).setOrigin(0, 0);
      const nameTxt= sc.add.text(startX + 4, y + 4, name, { fontSize: '9px', color: canCraft ? '#88ff88' : '#aaaaaa' }).setOrigin(0, 0);
      const reqTxt = sc.add.text(startX + 4, y + 14, reqStr, { fontSize: '7px', color: '#777777' }).setOrigin(0, 0);
      const btn    = sc.add.text(startX + 250, y + 8, 'CRAFT', {
        fontSize: '8px', color: canCraft ? '#ffdd44' : '#555',
        backgroundColor: canCraft ? '#333' : '#111',
        padding: { x: 3, y: 2 },
      }).setOrigin(1, 0);

      if (canCraft) {
        btn.setInteractive();
        btn.on('pointerdown', () => this.craft(result, req));
      }

      const rowContainer = sc.add.container(0, 0, [rowBg, nameTxt, reqTxt, btn]);
      this.rows.push(rowContainer);
      this.container.add(rowContainer);
    });
  }

  private craft(result: string, req: Record<string, number>) {
    if (!GameState.hasItems(req)) {
      EventBus.emit(EV.SHOW_TOAST, '素材が足りません');
      return;
    }
    for (const [k, v] of Object.entries(req)) GameState.consumeItem(k as never, v);
    GameState.addItem(result as never);
    EventBus.emit(EV.ITEM_CRAFTED, result);
    EventBus.emit(EV.INVENTORY_CHANGED);
    EventBus.emit(EV.SHOW_TOAST, `${ITEM_NAME[result] ?? result} をクラフト！`);
    this.close();
    this.open(); // refresh
  }

  open() {
    this.isOpen = true;
    // 古いレシピ行を削除して再構築
    this.rows.forEach(r => r.destroy());
    this.rows = [];
    const W = 280;
    const cx = (GAME.WIDTH - W) / 2;
    const cy = (GAME.HEIGHT - 340) / 2;
    this.buildRecipes(cx + 8, cy + 28);
    this.container.setVisible(true);
    EventBus.emit(EV.UI_OPEN, 'crafting');
  }

  close() {
    this.isOpen = false;
    this.container.setVisible(false);
    EventBus.emit(EV.UI_CLOSE, 'crafting');
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  get visible() { return this.isOpen; }

  destroy() {
    this.container.destroy();
  }
}
