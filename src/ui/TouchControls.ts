import Phaser from 'phaser';
import { GAME } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';

/**
 * モバイル向けタッチコントロール
 * 左側: 十字キー (移動+ジャンプ)
 * 右側: 攻撃・採掘ボタン
 */
export class TouchControls {
  readonly left  = { isDown: false };
  readonly right = { isDown: false };
  readonly jump  = { isDown: false };
  readonly attack= { isDown: false };

  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    // タッチデバイスのみ表示
    if (!scene.sys.game.device.input.touch) {
      this.container = scene.add.container(0, 0).setVisible(false);
      return;
    }

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(150);

    const H = GAME.HEIGHT;
    const alpha = 0.5;

    // Dpad
    const btnSz = 50;
    const dpadX = 60, dpadY = H - 80;

    const leftBtn  = scene.add.rectangle(dpadX - btnSz, dpadY, btnSz, btnSz, 0xffffff, alpha).setInteractive();
    const rightBtn = scene.add.rectangle(dpadX + btnSz, dpadY, btnSz, btnSz, 0xffffff, alpha).setInteractive();
    const jumpBtn  = scene.add.rectangle(dpadX, dpadY - btnSz, btnSz, btnSz, 0xffffff, alpha).setInteractive();

    const leftLbl  = scene.add.text(dpadX - btnSz, dpadY, '◀', { fontSize: '20px' }).setOrigin(0.5);
    const rightLbl = scene.add.text(dpadX + btnSz, dpadY, '▶', { fontSize: '20px' }).setOrigin(0.5);
    const jumpLbl  = scene.add.text(dpadX, dpadY - btnSz, '▲', { fontSize: '20px' }).setOrigin(0.5);

    leftBtn.on('pointerdown',  () => { this.left.isDown  = true; });
    leftBtn.on('pointerup',    () => { this.left.isDown  = false; });
    leftBtn.on('pointerout',   () => { this.left.isDown  = false; });
    rightBtn.on('pointerdown', () => { this.right.isDown = true; });
    rightBtn.on('pointerup',   () => { this.right.isDown = false; });
    rightBtn.on('pointerout',  () => { this.right.isDown = false; });
    jumpBtn.on('pointerdown',  () => { this.jump.isDown  = true; });
    jumpBtn.on('pointerup',    () => { this.jump.isDown  = false; });
    jumpBtn.on('pointerout',   () => { this.jump.isDown  = false; });

    // 攻撃ボタン
    const atkX = GAME.WIDTH - 60, atkY = H - 80;
    const atkBtn = scene.add.circle(atkX, atkY, 30, 0xff4444, alpha).setInteractive();
    const atkLbl = scene.add.text(atkX, atkY, '⚔️', { fontSize: '20px' }).setOrigin(0.5);
    atkBtn.on('pointerdown', () => { this.attack.isDown = true; });
    atkBtn.on('pointerup',   () => { this.attack.isDown = false; });
    atkBtn.on('pointerout',  () => { this.attack.isDown = false; });

    // クラフトボタン
    const craftBtn = scene.add.rectangle(GAME.WIDTH - 120, H - 30, 60, 24, 0x444444, 0.7).setInteractive();
    const craftLbl = scene.add.text(GAME.WIDTH - 120, H - 30, 'CRAFT', { fontSize: '8px', color: '#fff' }).setOrigin(0.5);
    craftBtn.on('pointerdown', () => EventBus.emit('touch:craft'));

    this.container.add([
      leftBtn, rightBtn, jumpBtn, atkBtn, craftBtn,
      leftLbl, rightLbl, jumpLbl, atkLbl, craftLbl,
    ]);
  }

  destroy() { this.container.destroy(); }
}
