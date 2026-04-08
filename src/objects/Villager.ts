// ============================
// Villager — 村人NPC
// 村内をランダムウォーク、夜は待機
// ============================
import Phaser from 'phaser';
import { PX, TILE_PX } from '../core/Constants';

const VILLAGER_COLORS: Record<string, number> = {
    '農民': 0x44aa44,
    '商人': 0x4488ff,
    '老人': 0xaa8844,
};

const VILLAGER_GREETS: Record<string, string> = {
    '農民': 'いらっしゃい、旅人よ',
    '商人': 'エメラルドで交易だ！',
    '老人': '遠い地から来たのか…',
};

export class Villager extends Phaser.GameObjects.Container {
    declare body: Phaser.Physics.Arcade.Body;
    private gfx!: Phaser.GameObjects.Graphics;

    active2 = true;
    name: string;
    greeting: string;

    private wanderTimer = 0;
    private wanderDir = 1;
    private readonly HOME_X: number;

    constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
        super(scene, x, y);
        this.name = name;
        this.greeting = VILLAGER_GREETS[name] ?? 'こんにちは';
        this.HOME_X = x;

        scene.add.existing(this);
        this.setDepth(10);  // タイルマップ(depth=0)より前面に描画
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(20 * PX, 28 * PX);
        body.setOffset(-10 * PX, -14 * PX);
        body.setCollideWorldBounds(true);
        body.setMaxVelocityY(800 * PX);  // 最大落下速度を制限（すり抜け防止）

        this.gfx = scene.add.graphics();
        this.add(this.gfx);
        this._draw(1);
    }

    private _draw(facing: number): void {
        const g = this.gfx;
        g.clear();
        const hw = 10 * PX;
        const hh = 14 * PX;
        const bodyColor = VILLAGER_COLORS[this.name] ?? 0x4488ff;

        // 体（服）
        g.fillStyle(bodyColor);
        g.fillRoundedRect(-hw, -hh * 0.2, hw * 2, hh * 1.2, 3 * PX);

        // 頭
        g.fillStyle(0xffe0bb);
        g.fillCircle(0, -hh * 0.55, hw * 0.85);

        // 目
        g.fillStyle(0x000000);
        g.fillCircle(facing * hw * 0.3, -hh * 0.6, 1.5 * PX);

        // 帽子
        g.fillStyle(bodyColor === 0x44aa44 ? 0x226622 : bodyColor === 0x4488ff ? 0x226699 : 0x664422);
        g.fillRect(-hw * 0.65, -hh - 5 * PX, hw * 1.3, 5 * PX);
        g.fillRect(-hw * 0.35, -hh - 12 * PX, hw * 0.7, 10 * PX);

        // 脚
        g.fillStyle(0x444444);
        g.fillRect(-hw * 0.35, hh * 0.8, hw * 0.3, hh * 0.5);
        g.fillRect(hw * 0.05,  hh * 0.8, hw * 0.3, hh * 0.5);

        // 名前タグ（毎フレーム描画しないようにテキストオブジェクトを別途管理してもよいが、
        //          Graphicsで描画するシンプル実装）
    }

    update(delta: number, playerX: number, _playerY: number): void {
        if (!this.active2) return;
        this.wanderTimer = Math.max(0, this.wanderTimer - delta);

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 村の範囲内（HOME_X ± 10タイル）に制限
        const rangeW = 10 * TILE_PX;
        const distFromHome = this.x - this.HOME_X;

        if (Math.abs(distFromHome) > rangeW) {
            // 範囲外なら家に戻る
            this.wanderDir = distFromHome > 0 ? -1 : 1;
            this.wanderTimer = 1200;
        }

        if (this.wanderTimer <= 0) {
            this.wanderTimer = 2000 + Math.random() * 3000;
            if (Math.random() < 0.3) {
                body.setVelocityX(0);
            } else {
                this.wanderDir = Math.random() < 0.5 ? 1 : -1;
                body.setVelocityX(this.wanderDir * 30 * PX);
            }
        }

        // 壁にぶつかったら反転
        if (body.blocked.left)  { this.wanderDir =  1; body.setVelocityX( 30 * PX); }
        if (body.blocked.right) { this.wanderDir = -1; body.setVelocityX(-30 * PX); }

        // プレイヤーに近づきすぎたら少し離れる
        const dx = this.x - playerX;
        if (Math.abs(dx) < TILE_PX * 1.5) {
            body.setVelocityX(dx > 0 ? 20 * PX : -20 * PX);
        }

        const vx = body.velocity.x;
        if (Math.abs(vx) > 5) {
            this._draw(vx > 0 ? 1 : -1);
        }
    }

    destroy(): void {
        this.active2 = false;
        super.destroy();
    }
}
