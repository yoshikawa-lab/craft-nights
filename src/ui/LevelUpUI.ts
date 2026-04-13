import Phaser from 'phaser';
import { GAME } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';

export class LevelUpUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 40)
      .setScrollFactor(0).setDepth(300).setVisible(false);

    const bg   = scene.add.rectangle(0, 0, 200, 60, 0x000000, 0.85).setStrokeStyle(2, 0xffdd44);
    const txt  = scene.add.text(0, -10, 'LEVEL UP!', { fontSize: '20px', color: '#ffdd44', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    const sub  = scene.add.text(0, 14, '', { fontSize: '10px', color: '#ffffff' }).setOrigin(0.5);

    this.container.add([bg, txt, sub]);

    EventBus.on(EV.PLAYER_LEVEL_UP, () => {
      sub.setText(`Lv.${GameState.level}  HP +${20}`);
      this.show();
    }, this);
  }

  private show() {
    this.container.setVisible(true).setAlpha(1).setScale(0.5);
    this.scene.tweens.add({
      targets: this.container, scale: 1, duration: 300, ease: 'Back.easeOut',
    });
    this.scene.time.delayedCall(2500, () => {
      this.scene.tweens.add({
        targets: this.container, alpha: 0, duration: 400,
        onComplete: () => this.container.setVisible(false),
      });
    });
  }

  destroy() {
    EventBus.off(EV.PLAYER_LEVEL_UP, undefined, this);
    this.container.destroy();
  }
}
