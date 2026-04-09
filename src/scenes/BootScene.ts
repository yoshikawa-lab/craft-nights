import Phaser from 'phaser';
import { GAME, PX, UI, TILE, TILE_PX, PALETTE } from '../core/Constants';

// タイルテクスチャのキー
export const TILE_TEXTURE_KEY = 'tileset';

// タイルごとの描画色（インデックス = TILE値）
const TILE_DRAW: Array<{ color: number; topColor?: number; alpha?: number }> = [
    { color: 0x000000, alpha: 0 },             // 0: AIR (透明)
    { color: PALETTE.TILE_GRASS, topColor: PALETTE.TILE_GRASS_TOP }, // 1: GRASS
    { color: PALETTE.TILE_DIRT },              // 2: DIRT
    { color: PALETTE.TILE_STONE },             // 3: STONE
    { color: PALETTE.TILE_WOOD },              // 4: WOOD_LOG
    { color: PALETTE.TILE_LEAVES, alpha: 0.85 }, // 5: LEAVES
    { color: PALETTE.TILE_WATER, alpha: 0.7 }, // 6: WATER
    { color: PALETTE.TILE_SAND },              // 7: SAND
    { color: PALETTE.TILE_BED },               // 8: BED
    { color: PALETTE.TILE_CHEST },             // 9: CHEST
    { color: PALETTE.TILE_ANCIENT_BRICK },     // 10: ANCIENT_BRICK
    { color: PALETTE.TILE_ORE },               // 11: ORE
    { color: PALETTE.TILE_LAVA },              // 12: LAVA
    { color: PALETTE.TILE_BOX },               // 13: BOX
    { color: PALETTE.TILE_COAL_ORE },          // 14: COAL_ORE
    { color: PALETTE.TILE_DIAMOND_ORE },       // 15: DIAMOND_ORE
    { color: PALETTE.TILE_GOLD_ORE },          // 16: GOLD_ORE
    { color: PALETTE.TILE_EMERALD_ORE },       // 17: EMERALD_ORE
    { color: PALETTE.TILE_FURNACE },           // 18: FURNACE
];

export class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }

    preload(): void {
        const w = GAME.WIDTH, h = GAME.HEIGHT;
        this.add.rectangle(w / 2, h / 2, w, h, 0x111111);
        this.add.text(w / 2, h * 0.35, '⛏ CraftNights', {
            fontSize: `${28 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffdd44', stroke: '#000', strokeThickness: 4 * PX,
        }).setOrigin(0.5);
        this.add.text(w / 2, h * 0.48, '🌙 夜を生き延びろ', {
            fontSize: `${12 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#aaaaaa',
        }).setOrigin(0.5);

        const barW = 300 * PX;
        const barH = 12 * PX;
        this.add.rectangle(w / 2, h * 0.62, barW, barH, 0x333333).setOrigin(0.5);
        const barFill = this.add.rectangle(w / 2 - barW / 2, h * 0.62, 0, barH, 0xffdd44).setOrigin(0, 0.5);
        const pct = this.add.text(w / 2, h * 0.62 + barH + 6 * PX, '0%', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#aaaaaa',
        }).setOrigin(0.5, 0);
        this.load.on('progress', (v: number) => {
            barFill.setSize(barW * v, barH);
            pct.setText(`${Math.round(v * 100)}%`);
        });
    }

    create(): void {
        this._generateTileTexture();
        this.scene.start('TitleScene');
    }

    private _generateTileTexture(): void {
        const ts = TILE_PX;
        const numTiles = TILE_DRAW.length;
        const texW = numTiles * ts;
        const texH = ts;

        // Graphicsでタイルシートを描画
        const g = this.make.graphics({ x: 0, y: 0 });

        for (let i = 0; i < numTiles; i++) {
            const def = TILE_DRAW[i];
            const ox = i * ts;
            const alpha = def.alpha ?? 1;
            if (alpha === 0) continue; // AIRは描画なし

            // ---- 立体タイル: グラジエント + ベベルエッジ ----
            const col       = Phaser.Display.Color.IntegerToColor(def.color);
            const lightC    = col.clone().lighten(20).color;
            const darkC     = col.clone().darken(24).color;
            // タイル本体（左上→右下グラジエントで奥行き感）
            g.fillGradientStyle(lightC, def.color, def.color, darkC, alpha);
            g.fillRect(ox, 0, ts, ts);

            // 上辺ハイライト（草など）
            if (def.topColor) {
                g.fillStyle(def.topColor, 1);
                g.fillRect(ox, 0, ts, Math.max(3, Math.round(ts * 0.1)));
            }

            // ベベルエッジ（右辺・下辺シャドウ ＋ 左辺・上辺ハイライト）
            const edgeDark  = col.clone().darken(38).color;
            const edgeLight = col.clone().lighten(35).color;
            g.fillStyle(edgeDark, alpha * 0.85);
            g.fillRect(ox,          ts - 3, ts, 3);     // 下辺シャドウ
            g.fillRect(ox + ts - 3, 0,      3, ts - 3); // 右辺シャドウ
            g.fillStyle(edgeLight, alpha * 0.42);
            g.fillRect(ox, 0,  ts, 2);                   // 上辺ハイライト
            g.fillRect(ox, 2,  2,  ts - 4);              // 左辺ハイライト

            // 特殊デコレーション
            if (i === TILE.WOOD_LOG) {
                // 木の輪っか
                g.lineStyle(1, 0x6B4A08, 0.5);
                g.strokeCircle(ox + ts / 2, ts / 2, ts * 0.3);
                g.strokeCircle(ox + ts / 2, ts / 2, ts * 0.15);
            } else if (i === TILE.STONE) {
                // 石の亀裂
                g.lineStyle(1, 0x606060, 0.4);
                g.beginPath();
                g.moveTo(ox + ts * 0.2, ts * 0.3);
                g.lineTo(ox + ts * 0.5, ts * 0.6);
                g.lineTo(ox + ts * 0.7, ts * 0.4);
                g.strokePath();
            } else if (i === TILE.CHEST) {
                // チェストの金具
                g.fillStyle(0xc0900a, 1);
                g.fillRect(ox + ts * 0.15, ts * 0.15, ts * 0.7, ts * 0.55);
                g.fillStyle(0xffd700, 1);
                g.fillRect(ox + ts * 0.38, ts * 0.35, ts * 0.24, ts * 0.18);
            } else if (i === TILE.BED) {
                // ベッドの布
                g.fillStyle(0xffffff, 0.5);
                g.fillRect(ox + ts * 0.1, ts * 0.25, ts * 0.8, ts * 0.5);
                g.fillStyle(0x8844cc, 0.8);
                g.fillRect(ox + ts * 0.1, ts * 0.25, ts * 0.3, ts * 0.5);
            } else if (i === TILE.WATER) {
                // 水の波線
                g.lineStyle(2, 0x44ccff, 0.6);
                for (let wy = ts * 0.25; wy < ts; wy += ts * 0.3) {
                    g.beginPath();
                    for (let wx = 0; wx <= ts; wx += ts * 0.2) {
                        const wwy = wy + Math.sin(wx / ts * Math.PI * 2) * ts * 0.05;
                        if (wx === 0) g.moveTo(ox + wx, wwy);
                        else g.lineTo(ox + wx, wwy);
                    }
                    g.strokePath();
                }
            } else if (i === TILE.ANCIENT_BRICK) {
                // 古代レンガの目地（横線・縦線）
                g.lineStyle(1, 0x1a0a2a, 0.8);
                // 横目地（2本）
                g.beginPath(); g.moveTo(ox, ts * 0.33); g.lineTo(ox + ts, ts * 0.33); g.strokePath();
                g.beginPath(); g.moveTo(ox, ts * 0.67); g.lineTo(ox + ts, ts * 0.67); g.strokePath();
                // 縦目地（市松）
                g.beginPath(); g.moveTo(ox + ts * 0.5, 0); g.lineTo(ox + ts * 0.5, ts * 0.33); g.strokePath();
                g.beginPath(); g.moveTo(ox + ts * 0.25, ts * 0.33); g.lineTo(ox + ts * 0.25, ts * 0.67); g.strokePath();
                g.beginPath(); g.moveTo(ox + ts * 0.75, ts * 0.33); g.lineTo(ox + ts * 0.75, ts * 0.67); g.strokePath();
                g.beginPath(); g.moveTo(ox + ts * 0.5, ts * 0.67); g.lineTo(ox + ts * 0.5, ts); g.strokePath();
                // 古代のルーン文様
                g.lineStyle(1, 0x8844aa, 0.5);
                g.strokeCircle(ox + ts * 0.5, ts * 0.5, ts * 0.12);
            } else if (i === TILE.ORE) {
                // 鉄鉱石のキラキラ（石 + 金属の光点）
                g.fillStyle(0xcc9944, 0.9);
                const oreSpots = [[0.25, 0.3], [0.6, 0.55], [0.4, 0.7], [0.7, 0.25], [0.15, 0.65]];
                for (const [fx, fy] of oreSpots) {
                    g.fillCircle(ox + ts * fx, ts * fy, ts * 0.08);
                }
                g.fillStyle(0xffdd88, 0.7);
                g.fillCircle(ox + ts * 0.5, ts * 0.45, ts * 0.06);
            } else if (i === TILE.BOX) {
                // 木箱の板目と金具
                g.lineStyle(1, 0x6B3410, 0.7);
                g.beginPath(); g.moveTo(ox, ts * 0.5); g.lineTo(ox + ts, ts * 0.5); g.strokePath();
                g.beginPath(); g.moveTo(ox + ts * 0.5, 0); g.lineTo(ox + ts * 0.5, ts); g.strokePath();
                g.fillStyle(0xcc8844, 0.9);
                g.fillCircle(ox + ts * 0.25, ts * 0.25, ts * 0.07);
                g.fillCircle(ox + ts * 0.75, ts * 0.25, ts * 0.07);
                g.fillCircle(ox + ts * 0.25, ts * 0.75, ts * 0.07);
                g.fillCircle(ox + ts * 0.75, ts * 0.75, ts * 0.07);
            } else if (i === TILE.LAVA) {
                // 溶岩（オレンジ→赤のグロー）
                // 明るい中心
                g.fillStyle(0xff8800, 0.8);
                g.fillRoundedRect(ox + ts * 0.1, ts * 0.1, ts * 0.8, ts * 0.6, 2);
                // 白熱光
                g.fillStyle(0xffdd44, 0.6);
                g.fillCircle(ox + ts * 0.35, ts * 0.35, ts * 0.15);
                g.fillCircle(ox + ts * 0.65, ts * 0.45, ts * 0.1);
                // 暗い溶岩池
                g.fillStyle(0x880000, 0.6);
                g.fillRect(ox, ts * 0.75, ts, ts * 0.25);
                // 波紋
                g.lineStyle(1, 0xff6600, 0.5);
                g.beginPath(); g.moveTo(ox + ts * 0.1, ts * 0.8); g.lineTo(ox + ts * 0.9, ts * 0.8); g.strokePath();
            } else if (i === TILE.COAL_ORE) {
                // 石炭鉱石（黒い石点）
                g.fillStyle(0x111122, 0.95);
                const coalSpots = [[0.3, 0.35], [0.65, 0.25], [0.45, 0.65], [0.2, 0.6], [0.7, 0.6]];
                for (const [fx, fy] of coalSpots) {
                    g.fillCircle(ox + ts * fx, ts * fy, ts * 0.09);
                }
                g.fillStyle(0x555566, 0.6);
                g.fillCircle(ox + ts * 0.5, ts * 0.45, ts * 0.07);
            } else if (i === TILE.DIAMOND_ORE) {
                // ダイヤ鉱石（シアン色の菱形）
                g.fillStyle(0x00ffff, 0.95);
                const diaPoints = [
                    [0.35, 0.2], [0.65, 0.2],
                    [0.5, 0.45],
                    [0.25, 0.55], [0.75, 0.55],
                    [0.5, 0.75],
                ];
                for (const [fx, fy] of diaPoints) {
                    const pr = ts * 0.1;
                    // 菱形描画
                    g.beginPath();
                    g.moveTo(ox + ts * fx, ts * fy - pr);
                    g.lineTo(ox + ts * fx + pr * 0.7, ts * fy);
                    g.lineTo(ox + ts * fx, ts * fy + pr);
                    g.lineTo(ox + ts * fx - pr * 0.7, ts * fy);
                    g.closePath();
                    g.fillPath();
                }
                g.fillStyle(0xaaffff, 0.7);
                g.fillCircle(ox + ts * 0.5, ts * 0.45, ts * 0.06);
            } else if (i === TILE.GOLD_ORE) {
                // 金鉱石（金色の点）
                g.fillStyle(0xffdd00, 0.95);
                const goldSpots = [[0.3, 0.3], [0.65, 0.4], [0.4, 0.65], [0.7, 0.65], [0.2, 0.55]];
                for (const [fx, fy] of goldSpots) {
                    g.fillCircle(ox + ts * fx, ts * fy, ts * 0.09);
                }
                g.fillStyle(0xffffff, 0.7);
                g.fillCircle(ox + ts * 0.5, ts * 0.45, ts * 0.055);
            } else if (i === TILE.EMERALD_ORE) {
                // エメラルド鉱石（緑のひし形）
                g.fillStyle(0x00ff66, 0.95);
                const emerPositions = [[0.35, 0.3], [0.65, 0.55], [0.35, 0.65]];
                for (const [fx, fy] of emerPositions) {
                    const pr = ts * 0.1;
                    g.beginPath();
                    g.moveTo(ox + ts * fx, ts * fy - pr);
                    g.lineTo(ox + ts * fx + pr * 0.6, ts * fy);
                    g.lineTo(ox + ts * fx, ts * fy + pr);
                    g.lineTo(ox + ts * fx - pr * 0.6, ts * fy);
                    g.closePath();
                    g.fillPath();
                }
                g.fillStyle(0xaaffcc, 0.7);
                g.fillCircle(ox + ts * 0.5, ts * 0.45, ts * 0.05);
            } else if (i === TILE.FURNACE) {
                // かまど（炉口 + オレンジの火）
                // 炉口（暗い四角）
                g.fillStyle(0x221100, 0.95);
                g.fillRect(ox + ts * 0.2, ts * 0.3, ts * 0.6, ts * 0.45);
                // 炉の枠
                g.lineStyle(2, 0x886644, 0.9);
                g.strokeRect(ox + ts * 0.2, ts * 0.3, ts * 0.6, ts * 0.45);
                // 火（オレンジ）
                g.fillStyle(0xff6600, 0.9);
                g.fillCircle(ox + ts * 0.5, ts * 0.52, ts * 0.14);
                g.fillStyle(0xffdd44, 0.8);
                g.fillCircle(ox + ts * 0.5, ts * 0.52, ts * 0.08);
                // 煙突の縦線
                g.lineStyle(1, 0x443322, 0.6);
                g.beginPath(); g.moveTo(ox + ts * 0.35, ts * 0.15); g.lineTo(ox + ts * 0.35, ts * 0.3); g.strokePath();
                g.beginPath(); g.moveTo(ox + ts * 0.65, ts * 0.15); g.lineTo(ox + ts * 0.65, ts * 0.3); g.strokePath();
            }
        }

        g.generateTexture(TILE_TEXTURE_KEY, texW, texH);
        g.destroy();
    }
}
