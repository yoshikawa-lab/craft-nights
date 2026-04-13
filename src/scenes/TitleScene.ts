import Phaser from 'phaser';
import { GAME, PALETTE } from '../core/Constants';
import { GameState } from '../core/GameState';

export class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;

    // 背景グラデーション
    const bg = this.add.rectangle(0, 0, W, H, 0x1a1a2e).setOrigin(0, 0);
    const stars = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H * 0.6;
      const r = Math.random() < 0.2 ? 1.5 : 1;
      stars.fillStyle(0xffffff, 0.5 + Math.random() * 0.5);
      stars.fillCircle(x, y, r);
    }

    // タイトル
    const title = this.add.text(W / 2, H * 0.28, 'CraftNights', {
      fontSize: '52px',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      color: '#ffffff',
      stroke: '#4488ff',
      strokeThickness: 6,
      shadow: { color: '#000066', fill: true, offsetX: 3, offsetY: 3, blur: 8 },
    }).setOrigin(0.5);

    const sub = this.add.text(W / 2, H * 0.38, '— 夜を生き延びろ —', {
      fontSize: '16px', color: '#88aaff', fontStyle: 'italic',
    }).setOrigin(0.5);

    // ピクセルアートキャラプレビュー（スプライトシートから）
    if (this.textures.exists('dungeon')) {
      for (let i = 0; i < 5; i++) {
        const frames = [24, 48, 51, 54, 60]; // hero, zombie, skeleton, spider, golem
        const sprite = this.add.sprite(
          W / 2 - 80 + i * 40, H * 0.5,
          'dungeon', frames[i]
        ).setScale(3);
        this.tweens.add({
          targets: sprite, y: H * 0.5 - 6, yoyo: true, repeat: -1,
          duration: 600 + i * 80, ease: 'Sine.easeInOut',
          delay: i * 120,
        });
      }
    }

    // NEW GAME ボタン
    const newBtn = this.createButton(W / 2, H * 0.65, 'NEW GAME', () => {
      GameState.reset();
      this.scene.start('GameScene');
    });

    // CONTINUE ボタン
    const hasSave = localStorage.getItem('craft_nights_save') !== null;
    const contBtn = this.createButton(W / 2, H * 0.74, 'CONTINUE', () => {
      if (GameState.load()) this.scene.start('GameScene');
      else this.showMessage('セーブデータがありません');
    }, hasSave ? 0x44dd44 : 0x555555);

    // 操作説明
    this.add.text(W / 2, H - 20, 'マウス左: 採掘/攻撃  右: 設置  C: クラフト  H: ヘルプ', {
      fontSize: '9px', color: '#667788',
    }).setOrigin(0.5);

    // タイトルアニメ
    this.tweens.add({ targets: title, y: H * 0.28 - 5, yoyo: true, repeat: -1, duration: 2000, ease: 'Sine.easeInOut' });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void, color = 0x4466aa) {
    const btn = this.add.rectangle(x, y, 200, 36, color).setInteractive();
    const txt = this.add.text(x, y, label, { fontSize: '14px', color: '#fff', fontFamily: 'Arial' }).setOrigin(0.5);
    btn.on('pointerover',  () => btn.setFillStyle(color + 0x222222));
    btn.on('pointerout',   () => btn.setFillStyle(color));
    btn.on('pointerdown',  onClick);
    this.tweens.add({ targets: [btn, txt], scaleX: 1.05, scaleY: 1.05, yoyo: true, repeat: -1, duration: 1500, ease: 'Sine.easeInOut' });
    return btn;
  }

  private showMessage(msg: string) {
    const t = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT * 0.85, msg, { fontSize: '12px', color: '#ff4444' }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, delay: 2000, duration: 500, onComplete: () => t.destroy() });
  }
}
