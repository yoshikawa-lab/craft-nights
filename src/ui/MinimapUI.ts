// ============================
// MinimapUI — ミニマップ（Terraria スタイル）
// 右上コーナーに地形・プレイヤー・敵を表示
// ============================
import Phaser from 'phaser';
import { GAME, PX, TILE_PX } from '../core/Constants';
import { gameState } from '../core/GameState';
import { WorldMap } from '../systems/WorldMap';

export class MinimapUI {
    private scene: Phaser.Scene;
    private world: WorldMap;

    // ミニマップサイズ（設計px）
    private readonly MW = 118;
    private readonly MH = 52;

    // 配置（右上コーナー）
    private mx: number;
    private my: number;

    private dynamicGfx!: Phaser.GameObjects.Graphics;
    private playerDot!: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene, world: WorldMap) {
        this.scene = scene;
        this.world  = world;
        this.mx = GAME.WIDTH - (this.MW + 8) * PX;
        this.my = 8 * PX;
        this._buildStatic();
        this._buildDynamic();
    }

    /** 地形など変わらない部分を一度だけ描画 */
    private _buildStatic(): void {
        const mw = this.MW * PX;
        const mh = this.MH * PX;
        const mx = this.mx;
        const my = this.my;
        const W = this.world.W;
        const H = this.world.H;

        // 背景パネル
        const bg = this.scene.add.graphics().setScrollFactor(0).setDepth(988);
        bg.fillStyle(0x000000, 0.65);
        bg.lineStyle(1 * PX, 0x446688, 0.8);
        bg.fillRoundedRect(mx - 1, my - 1, mw + 2, mh + 2, 3 * PX);
        bg.strokeRoundedRect(mx - 1, my - 1, mw + 2, mh + 2, 3 * PX);

        // ラベル
        this.scene.add.text(mx + mw / 2, my + mh + 3 * PX, 'MAP', {
            fontSize: `${6 * PX}px`,
            fontFamily: '"Courier New", monospace',
            color: '#557799',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(989);

        // 地形（高さプロファイル）
        const terrain = this.scene.add.graphics().setScrollFactor(0).setDepth(989);
        const tileW = mw / W;

        for (let tx = 0; tx < W; tx++) {
            const surfY = this.world.heights[tx] ?? 38;
            const sx = mx + tx * tileW;
            const sy = my + (surfY / H) * mh;
            const sh = mh - (sy - my);
            // 深度によって色を変える
            terrain.fillStyle(0x336622, 0.85);
            terrain.fillRect(sx, sy, Math.max(1, tileW), Math.min(sh, mh * 0.15));
            terrain.fillStyle(0x5a3a1a, 0.8);
            terrain.fillRect(sx, sy + mh * 0.15, Math.max(1, tileW), Math.min(sh * 0.85, mh * 0.35));
            terrain.fillStyle(0x666666, 0.7);
            terrain.fillRect(sx, sy + mh * 0.5, Math.max(1, tileW), sh * 0.5);
        }

        // 村マーカー（緑の旗）
        if (this.world.villageChestPos) {
            const vc = this.world.villageChestPos;
            const vx = mx + (vc.tx / W) * mw;
            const surfY = this.world.heights[Math.min(vc.tx, W - 1)] ?? 38;
            const vy = my + (surfY / H) * mh;
            terrain.fillStyle(0x44ff66, 1);
            terrain.fillRect(vx - 0.5 * PX, vy - 6 * PX, 1 * PX, 6 * PX);
            terrain.fillRect(vx - 0.5 * PX, vy - 6 * PX, 4 * PX, 3 * PX);
        }

        // 古代都市マーカー（赤い頭蓋骨的な印）
        if (this.world.cityBounds) {
            const city = this.world.cityBounds;
            const cityCX = (city.x1 + city.x2) / 2;
            const cityCY = (city.y1 + city.y2) / 2;
            const cx = mx + (cityCX / W) * mw;
            const cy = my + (cityCY / H) * mh;
            terrain.fillStyle(0xff2200, 0.9);
            terrain.fillCircle(cx, cy, 2.5 * PX);
            terrain.lineStyle(1 * PX, 0xff6600, 0.8);
            terrain.strokeCircle(cx, cy, 4 * PX);
        }
    }

    /** 毎フレーム更新する動的要素 */
    private _buildDynamic(): void {
        this.dynamicGfx = this.scene.add.graphics()
            .setScrollFactor(0).setDepth(991);

        // プレイヤードット
        this.playerDot = this.scene.add.arc(0, 0, 2.5 * PX, 0, 360, false, 0xffffff, 1)
            .setScrollFactor(0).setDepth(992);
    }

    update(
        playerX: number, playerY: number,
        enemies: Array<{ x: number; y: number; active2: boolean; kind: string }>,
    ): void {
        const mw  = this.MW * PX;
        const mh  = this.MH * PX;
        const mx  = this.mx;
        const my  = this.my;
        const mapW = this.world.W * TILE_PX;
        const mapH = this.world.H * TILE_PX;

        // プレイヤードット（夜は赤みがかる）
        const px = mx + Math.min(1, playerX / mapW) * mw;
        const py = my + Math.min(1, playerY / mapH) * mh;
        const clampedPx = Math.max(mx, Math.min(mx + mw, px));
        const clampedPy = Math.max(my, Math.min(my + mh, py));
        this.playerDot.setPosition(clampedPx, clampedPy);
        this.playerDot.setFillStyle(gameState.isNight ? 0xffaaaa : 0xffffff);

        // 敵ドット
        this.dynamicGfx.clear();
        for (const e of enemies) {
            if (!e.active2) continue;
            const ex = mx + (e.x / mapW) * mw;
            const ey = my + (e.y / mapH) * mh;
            if (ex < mx || ex > mx + mw || ey < my || ey > my + mh) continue;
            const color = e.kind === 'ANCIENT_BOSS' ? 0xff4400 : 0xff2222;
            this.dynamicGfx.fillStyle(color, 0.9);
            this.dynamicGfx.fillCircle(ex, ey, 1.5 * PX);
        }
    }
}
