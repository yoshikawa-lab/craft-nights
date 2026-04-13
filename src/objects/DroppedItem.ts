import Phaser from 'phaser';
import { ItemType, DUNGEON_FRAME, GAME } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';

export class DroppedItem extends Phaser.Physics.Arcade.Sprite {
  readonly itemType: ItemType;
  readonly count: number;
  private label: Phaser.GameObjects.Text;
  private pickupDelay = 800; // ms 生成直後は拾えない

  constructor(scene: Phaser.Scene, x: number, y: number, item: ItemType, count = 1) {
    super(scene, x, y, 'dungeon', DUNGEON_FRAME.COIN_GOLD);
    this.itemType = item;
    this.count    = count;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setFrame(this.itemFrame());
    this.setScale(1.5);
    this.setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(300);
    body.setVelocity((Math.random() - 0.5) * 80, -120);
    body.setSize(10, 10);

    // カウントラベル
    this.label = scene.add.text(x, y - 8, count > 1 ? `×${count}` : '', {
      fontSize: '8px', color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    // 浮遊アニメ
    scene.tweens.add({
      targets: this,
      y: y - 4,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut',
    });
  }

  private itemFrame(): number {
    // アイテム種類に応じてフレームを返す
    const map: Partial<Record<string, number>> = {
      wood:           DUNGEON_FRAME.CRATE,
      stone:          DUNGEON_FRAME.WALL_MID,
      coal:           DUNGEON_FRAME.GEM_BLUE,
      iron_ore:       DUNGEON_FRAME.SHIELD_ITEM,
      gold:           DUNGEON_FRAME.COIN_GOLD,
      diamond:        DUNGEON_FRAME.GEM_BLUE,
      emerald:        DUNGEON_FRAME.GEM_GREEN,
      iron_ingot:     DUNGEON_FRAME.SHIELD_ITEM,
      gold_ingot:     DUNGEON_FRAME.COIN_GOLD,
      sword:          DUNGEON_FRAME.SWORD_ITEM,
      iron_sword:     DUNGEON_FRAME.SWORD_ITEM,
      diamond_sword:  DUNGEON_FRAME.SWORD_ITEM,
      gold_sword:     DUNGEON_FRAME.SWORD_ITEM,
      netherite_sword:DUNGEON_FRAME.SWORD_ITEM,
      pickaxe:        DUNGEON_FRAME.PICK_ITEM,
      iron_pick:      DUNGEON_FRAME.PICK_ITEM,
      diamond_pick:   DUNGEON_FRAME.PICK_ITEM,
      netherite_pick: DUNGEON_FRAME.PICK_ITEM,
      axe:            DUNGEON_FRAME.AXE_ITEM,
      bow:            DUNGEON_FRAME.BOW_ITEM,
      arrow:          DUNGEON_FRAME.ARROW_ITEM,
      iron_armor:     DUNGEON_FRAME.ARMOR_ITEM,
      diamond_armor:  DUNGEON_FRAME.ARMOR_ITEM,
      gold_armor:     DUNGEON_FRAME.ARMOR_ITEM,
      netherite_armor:DUNGEON_FRAME.ARMOR_ITEM,
      wool:           DUNGEON_FRAME.SCROLL,
      dirt:           DUNGEON_FRAME.FLOOR_DARK,
      key:            DUNGEON_FRAME.KEY,
    };
    return map[this.itemType] ?? DUNGEON_FRAME.GEM_RED;
  }

  update(delta: number) {
    this.pickupDelay -= delta;
    this.label.setPosition(this.x, this.y - 10);
  }

  canPickup() { return this.pickupDelay <= 0; }

  pickup() {
    const ok = GameState.addItem(this.itemType, this.count);
    if (ok) {
      EventBus.emit(EV.ITEM_PICKED_UP, { item: this.itemType, count: this.count });
      EventBus.emit(EV.INVENTORY_CHANGED);
    }
    this.label.destroy();
    this.destroy();
  }
}
