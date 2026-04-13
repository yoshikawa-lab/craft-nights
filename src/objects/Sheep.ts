import Phaser from 'phaser';
import { DUNGEON_FRAME, GAME, ITEM } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';

export class Sheep extends Phaser.Physics.Arcade.Sprite {
  private walkTimer = 0;
  private dir = 1;
  private hp = 8;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dungeon', DUNGEON_FRAME.SHEEP_IDLE);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 12);
    body.setGravityY(600);
    body.setCollideWorldBounds(false);

    this.setScale(2).setDepth(8);

    if (!scene.anims.exists('sheep_idle'))
      scene.anims.create({ key: 'sheep_idle', frames: [{ key: 'dungeon', frame: DUNGEON_FRAME.SHEEP_IDLE }], frameRate: 2, repeat: -1 });
    if (!scene.anims.exists('sheep_walk'))
      scene.anims.create({ key: 'sheep_walk', frames: scene.anims.generateFrameNumbers('dungeon', { frames: [DUNGEON_FRAME.SHEEP_WALK, DUNGEON_FRAME.SHEEP_IDLE] }), frameRate: 4, repeat: -1 });

    this.play('sheep_idle');
  }

  update(delta: number) {
    this.walkTimer -= delta;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.walkTimer <= 0) {
      this.walkTimer = 2000 + Math.random() * 3000;
      const roll = Math.random();
      if (roll < 0.4) {
        this.dir = Math.random() < 0.5 ? 1 : -1;
        body.setVelocityX(this.dir * 35);
        this.setFlipX(this.dir < 0);
        this.play('sheep_walk', true);
      } else {
        body.setVelocityX(0);
        this.play('sheep_idle', true);
      }
    }

    if (body.blocked.right || body.blocked.left) {
      this.dir *= -1;
      body.setVelocityX(0);
    }
  }

  takeDamage(dmg: number) {
    this.hp -= dmg;
    this.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) {
      EventBus.emit(EV.ITEM_DROPPED, { item: ITEM.WOOL, count: 1 + Math.floor(Math.random() * 2), x: this.x, y: this.y });
      this.destroy();
    }
  }
}
