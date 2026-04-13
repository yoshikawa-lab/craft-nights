import Phaser from 'phaser';
import { DUNGEON_FRAME, ITEM } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';

export class Villager extends Phaser.Physics.Arcade.Sprite {
  private idleTimer = 0;
  private dir = 1;
  readonly trades = [
    { buy: ITEM.EMERALD, buyCount: 1, sell: ITEM.DIAMOND, sellCount: 1 },
    { buy: ITEM.GOLD,    buyCount: 3, sell: ITEM.IRON_INGOT, sellCount: 2 },
    { buy: ITEM.COAL,    buyCount: 5, sell: ITEM.STONE, sellCount: 10 },
  ];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dungeon', DUNGEON_FRAME.VILLAGER_IDLE);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 20);
    body.setGravityY(600);
    body.setImmovable(true);

    this.setScale(2).setDepth(8);

    if (!scene.anims.exists('villager_idle'))
      scene.anims.create({ key: 'villager_idle', frames: [{ key: 'dungeon', frame: DUNGEON_FRAME.VILLAGER_IDLE }], frameRate: 2, repeat: -1 });
    if (!scene.anims.exists('villager_walk'))
      scene.anims.create({ key: 'villager_walk', frames: scene.anims.generateFrameNumbers('dungeon', { frames: [DUNGEON_FRAME.VILLAGER_WALK, DUNGEON_FRAME.VILLAGER_IDLE] }), frameRate: 5, repeat: -1 });

    this.play('villager_idle');

    // 頭上に吹き出し
    scene.add.text(x, y - 24, '💬', { fontSize: '10px' }).setOrigin(0.5).setDepth(9);
  }

  update(delta: number) {
    this.idleTimer -= delta;
    if (this.idleTimer <= 0) {
      this.idleTimer = 4000 + Math.random() * 3000;
    }
  }
}
