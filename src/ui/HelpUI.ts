import Phaser from 'phaser';
import { GAME } from '../core/Constants';

export class HelpUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cx = 40, cy = 30, W = GAME.WIDTH - 80, H = GAME.HEIGHT - 60;

    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(500).setVisible(false);

    // bg を最初に追加することで、テキスト類の背面に描画される
    const bg = scene.add.rectangle(cx, cy, W, H, 0x000000, 0.92).setOrigin(0, 0).setStrokeStyle(1, 0x555555);
    this.container.add(bg);

    const title = scene.add.text(cx + W / 2, cy + 8, '操作ガイド', { fontSize: '14px', color: '#ffdd44' }).setOrigin(0.5, 0);
    this.container.add(title);

    const lines = [
      'A / ←  D / →  :  左右移動',
      'W / ↑ / Space  :  ジャンプ',
      'Shift  :  ダッシュ',
      'マウス左クリック  :  採掘 / 攻撃',
      'マウス右クリック  :  ブロック設置',
      'C キー  :  クラフトメニュー',
      'E キー  :  インタラクション（かまど・チェスト・村人）',
      '1〜9 / マウスホイール  :  ホットバー切替',
      'F キー  :  かまど（かまどの前で）',
      'M キー  :  ミュート',
      'H キー  :  このヘルプを閉じる / 開く',
      '',
      '--- ゲームの流れ ---',
      '① 昼の間に木・石を集めてツールをクラフト',
      '② 夜は敵が出現！ベッドで朝まで待機できます',
      '③ 地下を掘って鉄→金→ダイヤ→ネザライトへ',
      '④ 深部の古代都市でボスを倒せ！',
    ];

    let y = cy + 30;
    for (const line of lines) {
      const t = scene.add.text(cx + 16, y, line, {
        fontSize: '10px',
        color: line.startsWith('---') ? '#ffdd44' : '#cccccc',
      });
      this.container.add(t);
      y += 15;
    }

    // ✕ボタンはすべての上に配置
    const close = scene.add.rectangle(cx + W - 28, cy + 4, 24, 20, 0x882222).setOrigin(0, 0).setInteractive();
    const closeTxt = scene.add.text(cx + W - 16, cy + 6, '✕', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5, 0);
    close.on('pointerdown', () => this.close());
    close.on('pointerover', () => close.setFillStyle(0xcc3333));
    close.on('pointerout',  () => close.setFillStyle(0x882222));
    this.container.add([close, closeTxt]);
  }

  open()  { this.isOpen = true;  this.container.setVisible(true); }
  close() { this.isOpen = false; this.container.setVisible(false); }
  toggle(){ this.isOpen ? this.close() : this.open(); }
  get visible() { return this.isOpen; }
  destroy() { this.container.destroy(); }
}
