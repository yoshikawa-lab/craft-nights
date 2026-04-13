import Phaser from 'phaser';
import { GAME } from '../core/Constants';
import { GameState } from '../core/GameState';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  create(data: { dayCount: number; level: number }) {
    const W = GAME.WIDTH, H = GAME.HEIGHT;

    this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0, 0);

    this.add.text(W / 2, H * 0.3, 'GAME OVER', {
      fontSize: '48px', color: '#ff4444',
      stroke: '#880000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.45, `${data?.dayCount ?? GameState.dayCount} 日目  Lv.${data?.level ?? GameState.level}`, {
      fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // RETRY
    const retryBtn = this.add.rectangle(W / 2, H * 0.62, 180, 40, 0xaa2222).setInteractive();
    this.add.text(W / 2, H * 0.62, 'もう一度', { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
    retryBtn.on('pointerdown', () => {
      GameState.reset();
      this.scene.start('GameScene');
    });

    // TITLE
    const titleBtn = this.add.rectangle(W / 2, H * 0.72, 180, 40, 0x224488).setInteractive();
    this.add.text(W / 2, H * 0.72, 'タイトルへ', { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
    titleBtn.on('pointerdown', () => {
      this.scene.start('TitleScene');
    });

    this.cameras.main.fadeIn(600);
  }
}
