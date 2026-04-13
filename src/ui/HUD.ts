import Phaser from 'phaser';
import { GAME, UI, PALETTE, ITEM_NAME, DUNGEON_FRAME } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';
import type { DayNightSystem } from '../systems/DayNightSystem';

export class HUD {
  private scene: Phaser.Scene;
  private dn: DayNightSystem;
  private container: Phaser.GameObjects.Container;

  // HP/XP バー
  private hpFill!: Phaser.GameObjects.Rectangle;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  // ホットバー
  private hotbarSlots: Phaser.GameObjects.Container[] = [];
  private hotbarCursor!: Phaser.GameObjects.Rectangle;

  // トースト
  private toast!: Phaser.GameObjects.Text;
  private toastTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, dn: DayNightSystem) {
    this.scene = scene;
    this.dn    = dn;

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);
    this.buildHpXp();
    this.buildHotbar();
    this.buildDayInfo();
    this.buildToast();

    EventBus.on(EV.INVENTORY_CHANGED, this.refreshHotbar, this);
    EventBus.on(EV.HOTBAR_SELECT,     this.refreshHotbar, this);
    EventBus.on(EV.PLAYER_DAMAGED,    this.refreshHp,     this);
    EventBus.on(EV.PLAYER_HEALED,     this.refreshHp,     this);
    EventBus.on(EV.PLAYER_LEVEL_UP,   this.refreshHp,     this);
    EventBus.on(EV.SHOW_TOAST,        this.showToast,     this);
    EventBus.on(EV.DAY_START,         this.refreshDay,    this);
  }

  destroy() {
    EventBus.off(EV.INVENTORY_CHANGED, this.refreshHotbar, this);
    EventBus.off(EV.HOTBAR_SELECT,     this.refreshHotbar, this);
    EventBus.off(EV.PLAYER_DAMAGED,    this.refreshHp,     this);
    EventBus.off(EV.PLAYER_HEALED,     this.refreshHp,     this);
    EventBus.off(EV.PLAYER_LEVEL_UP,   this.refreshHp,     this);
    EventBus.off(EV.SHOW_TOAST,        this.showToast,     this);
    EventBus.off(EV.DAY_START,         this.refreshDay,    this);
    this.container.destroy();
  }

  private buildHpXp() {
    const sc = this.scene;
    const W  = GAME.WIDTH;

    // HP バー
    const hpBg = sc.add.rectangle(8, 8, 160, 12, 0x333333).setOrigin(0, 0);
    this.hpFill = sc.add.rectangle(8, 8, 160, 12, 0x44dd44).setOrigin(0, 0);
    this.hpText = sc.add.text(12, 9, '', { fontSize: '8px', color: '#fff' });

    // XP バー
    const xpBg  = sc.add.rectangle(8, 22, 160, 5, 0x222244).setOrigin(0, 0);
    this.xpFill = sc.add.rectangle(8, 22, 0, 5, 0x4488ff).setOrigin(0, 0);

    // レベル
    this.levelText = sc.add.text(172, 8, '', { fontSize: '9px', color: '#ffdd44' });

    this.container.add([hpBg, this.hpFill, this.hpText, xpBg, this.xpFill, this.levelText]);
    this.refreshHp();
  }

  private buildDayInfo() {
    const sc = this.scene;
    const W  = GAME.WIDTH;

    this.dayText  = sc.add.text(W - 4, 8, '', { fontSize: '9px', color: '#ffffff', align: 'right' }).setOrigin(1, 0);
    this.timeText = sc.add.text(W - 4, 20, '', { fontSize: '8px', color: '#aaaaaa', align: 'right' }).setOrigin(1, 0);

    this.container.add([this.dayText, this.timeText]);
    this.refreshDay();
  }

  private buildHotbar() {
    const sc    = this.scene;
    const slots = UI.HOTBAR_SLOTS;
    const sz    = UI.SLOT_SIZE;
    const pad   = UI.PADDING;
    const totalW = slots * (sz + pad) - pad;
    const startX = (GAME.WIDTH - totalW) / 2;
    const y      = GAME.HEIGHT - sz - 8;

    for (let i = 0; i < slots; i++) {
      const cx = startX + i * (sz + pad);
      const bg = sc.add.rectangle(cx, y, sz, sz, PALETTE.UI_SLOT).setOrigin(0, 0);
      const bdr= sc.add.rectangle(cx, y, sz, sz).setStrokeStyle(1, PALETTE.UI_BORDER).setOrigin(0, 0).setFillStyle();
      const numTxt = sc.add.text(cx + 2, y + 2, `${i + 1}`, { fontSize: '7px', color: '#888' });
      const itemTxt= sc.add.text(cx + sz / 2, y + sz - 4, '', { fontSize: '7px', color: '#fff', align: 'center' }).setOrigin(0.5, 1);

      const slot = sc.add.container(0, 0, [bg, bdr, numTxt, itemTxt]);
      this.hotbarSlots.push(slot as unknown as Phaser.GameObjects.Container);
      this.container.add(slot);
    }

    this.hotbarCursor = sc.add.rectangle(0, 0, sz + 2, sz + 2)
      .setStrokeStyle(2, PALETTE.UI_SELECTED).setFillStyle()
      .setOrigin(0, 0).setDepth(101);
    this.container.add(this.hotbarCursor);

    this.refreshHotbar();
  }

  private buildToast() {
    this.toast = this.scene.add.text(GAME.WIDTH / 2, GAME.HEIGHT - 80, '', {
      fontSize: '11px', color: '#ffdd44',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setAlpha(0).setDepth(110);
    this.container.add(this.toast);
  }

  update() {
    this.refreshHp();
    const phase = this.dn.currentPhase;
    const prog  = this.dn.progress;
    const icon  = phase === 'day' ? '☀️' : phase === 'night' ? '🌙' : '💤';
    this.timeText.setText(`${icon} ${Math.round(prog * 100)}%`);
  }

  private refreshHp() {
    const hp    = GameState.hp;
    const max   = GameState.maxHp;
    const ratio = hp / max;
    const barW  = 160;

    this.hpFill.setSize(barW * ratio, 12);
    this.hpFill.setFillStyle(ratio > 0.5 ? 0x44dd44 : ratio > 0.25 ? 0xffaa00 : 0xff4444);
    this.hpText.setText(`${hp}/${max}`);

    const xp     = GameState.xp;
    const needed = GameState.xpForNextLevel();
    this.xpFill.setSize(barW * (xp / needed), 5);
    this.levelText.setText(`Lv.${GameState.level}`);
  }

  private refreshDay() {
    this.dayText.setText(`Day ${GameState.dayCount}`);
  }

  refreshHotbar() {
    const slots  = GameState.hotbarSlots();
    const sz     = UI.SLOT_SIZE;
    const pad    = UI.PADDING;
    const totalW = UI.HOTBAR_SLOTS * (sz + pad) - pad;
    const startX = (GAME.WIDTH - totalW) / 2;
    const y      = GAME.HEIGHT - sz - 8;

    for (let i = 0; i < UI.HOTBAR_SLOTS; i++) {
      const slot   = slots[i];
      const cx     = startX + i * (sz + pad);
      const slot3d = this.hotbarSlots[i];
      const txtObj = slot3d.getAt(3) as Phaser.GameObjects.Text;

      if (slot?.item && slot.count > 0) {
        const name = ITEM_NAME[slot.item] ?? slot.item;
        const shortName = name.length > 4 ? name.substring(0, 4) : name;
        txtObj.setText(slot.count > 1 ? `${shortName}\n×${slot.count}` : shortName);
        txtObj.setColor('#ffffff');
      } else {
        txtObj.setText('');
      }
    }

    // カーソル位置
    const idx = GameState.hotbarIndex;
    const cx  = startX + idx * (sz + pad) - 1;
    this.hotbarCursor.setPosition(cx, y - 1);
  }

  showToast(msg: string) {
    this.toastTween?.stop();
    this.toast.setText(msg).setAlpha(1);
    this.toastTween = this.scene.tweens.add({
      targets: this.toast, alpha: 0, delay: 1800, duration: 400,
    });
  }
}
