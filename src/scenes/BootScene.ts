import Phaser from 'phaser';
import { GAME, PX, UI, TILE_PX } from '../core/Constants';

export const TILE_TEXTURE_KEY = 'tileset';

// tile alphas are now baked into canvas drawing (globalAlpha)
const TILE_ALPHA: number[] = [
    0,    // 0: AIR
    1,    // 1: GRASS
    1,    // 2: DIRT
    1,    // 3: STONE
    1,    // 4: WOOD_LOG
    0.85, // 5: LEAVES
    0.75, // 6: WATER
    1,    // 7: SAND
    1,    // 8: BED
    1,    // 9: CHEST
    1,    // 10: ANCIENT_BRICK
    1,    // 11: ORE (iron)
    1,    // 12: LAVA
    1,    // 13: BOX
    1,    // 14: COAL_ORE
    1,    // 15: DIAMOND_ORE
    1,    // 16: GOLD_ORE
    1,    // 17: EMERALD_ORE
    1,    // 18: FURNACE
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

        // Kenney Pixel Platformer tileset (CC0)
        this.load.image('kenney_tiles', '/assets/kenney/tilemap_packed.png');
    }

    create(): void {
        this._generateTileTexture();
        this.scene.start('TitleScene');
    }

    private _generateTileTexture(): void {
        const ts  = TILE_PX;
        const NUM = TILE_ALPHA.length;

        // ---- HTML Canvas ベースのテクスチャ生成 ----
        // imageSmoothingEnabled = false でピクセルアートをシャープに拡大
        const canvas = document.createElement('canvas');
        canvas.width  = NUM * ts;
        canvas.height = ts;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        // Kenney タイルの取得: 20列×9行, 1タイル=18×18px
        const src = this.textures.get('kenney_tiles').getSourceImage() as HTMLImageElement;
        const KT = 18; // Kenney ソースのタイルサイズ (px)

        // --- ヘルパー: Kenney タイル(row, col)を dest タイルインデックスに描画 ---
        const dk = (di: number, kr: number, kc: number, alpha = 1) => {
            ctx.globalAlpha = alpha;
            ctx.drawImage(src, kc * KT, kr * KT, KT, KT, di * ts, 0, ts, ts);
            ctx.globalAlpha = 1;
        };

        // --- ヘルパー: タイル内ローカル座標で矩形を塗る ---
        const fr = (di: number, lx: number, ly: number, lw: number, lh: number, color: string, alpha = 1) => {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillRect(di * ts + lx, ly, lw, lh);
            ctx.globalAlpha = 1;
        };

        // --- ヘルパー: 石ベース + 鉱石クラスター (ORE系共通) ---
        const drawOre = (di: number, c1: string, c2: string) => {
            dk(di, 4, 0);  // 石ベース
            const r = ts * 0.18;
            for (const [fx, fy] of [[0.27, 0.3], [0.65, 0.65]] as [number,number][]) {
                const cx = di * ts + fx * ts;
                const cy = fy * ts;
                ctx.fillStyle = c1;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = c2;
                ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.55, 0, Math.PI * 2); ctx.fill();
                // エッジ
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = ts * 0.04;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            }
        };

        // === 0: AIR — 透明のまま ===

        // === 1: GRASS — Kenney row0 col2 ===
        dk(1, 0, 2);

        // === 2: DIRT — Kenney row2 col2 ===
        dk(2, 2, 2);

        // === 3: STONE — Kenney row4 col0 (白ハイライト付き岩) ===
        dk(3, 4, 0);

        // === 4: WOOD_LOG — Kenney row6 col2 (均一ブラウン) + 横木目 ===
        dk(4, 6, 2);
        {
            // 左右の樹皮
            fr(4, 0, 0, ts * 0.09, ts, '#3c1804', 0.6);
            fr(4, ts * 0.91, 0, ts * 0.09, ts, '#3c1804', 0.6);
            // 横木目ライン
            const grain = ts / 5.5;
            for (let y = grain * 0.5; y < ts; y += grain) {
                fr(4, ts * 0.09, y, ts * 0.82, Math.max(1, ts * 0.06), '#3c1804', 0.3);
                fr(4, ts * 0.09, y + ts * 0.07, ts * 0.82, Math.max(1, ts * 0.04), '#ffcc88', 0.2);
            }
        }

        // === 5: LEAVES — Kenney row1 col18 (葉, 半透明) ===
        dk(5, 1, 18, 0.85);

        // === 6: WATER — Kenney row2 col14 (水, 半透明) ===
        dk(6, 2, 14, 0.75);

        // === 7: SAND — Kenney row3 col2 + 温かいイエロートーン ===
        dk(7, 3, 2);
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 180, 60, 0.22)';
        ctx.fillRect(7 * ts, 0, ts, ts);
        ctx.globalCompositeOperation = 'source-over';

        // === 8: BED — カスタム (パープル/ホワイト) ===
        {
            const di = 8;
            fr(di, 0, 0, ts, ts, '#7733aa');
            fr(di, ts * 0.08, ts * 0.08, ts * 0.84, ts * 0.84, '#9955cc');
            // シーツ
            fr(di, ts * 0.15, ts * 0.28, ts * 0.7, ts * 0.45, '#f0f0f0');
            fr(di, ts * 0.15, ts * 0.4, ts * 0.7, ts * 0.25, '#d8d8e8');
            // 枕 ×2
            fr(di, ts * 0.18, ts * 0.15, ts * 0.28, ts * 0.2, '#eeeeee');
            fr(di, ts * 0.54, ts * 0.15, ts * 0.28, ts * 0.2, '#eeeeee');
            // フレーム
            fr(di, ts * 0.08, ts * 0.74, ts * 0.84, ts * 0.18, '#5a2288');
        }

        // === 9: CHEST — Kenney row0 col9 (ゴールド) + 留め金 ===
        dk(9, 0, 9);
        {
            const di = 9;
            // 木箱風の枠
            fr(di, 0, 0, ts, ts * 0.12, '#7a4c1c', 0.6);
            fr(di, 0, ts * 0.88, ts, ts * 0.12, '#7a4c1c', 0.6);
            // 留め金
            fr(di, ts * 0.38, ts * 0.35, ts * 0.24, ts * 0.3, '#cc9900');
            fr(di, ts * 0.44, ts * 0.42, ts * 0.12, ts * 0.16, '#ffe066');
        }

        // === 10: ANCIENT_BRICK — Kenney row2 col7 (ダークマルーン) + 紫オーラ ===
        dk(10, 2, 7);
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(120, 0, 180, 0.28)';
        ctx.fillRect(10 * ts, 0, ts, ts);
        ctx.globalCompositeOperation = 'source-over';
        // 紫ルーン文様
        ctx.strokeStyle = 'rgba(180, 80, 255, 0.45)';
        ctx.lineWidth = Math.max(1, ts * 0.06);
        ctx.strokeRect(10 * ts + ts * 0.2, ts * 0.2, ts * 0.6, ts * 0.6);
        ctx.beginPath();
        ctx.moveTo(10 * ts + ts * 0.5, ts * 0.2);
        ctx.lineTo(10 * ts + ts * 0.5, ts * 0.8);
        ctx.moveTo(10 * ts + ts * 0.2, ts * 0.5);
        ctx.lineTo(10 * ts + ts * 0.8, ts * 0.5);
        ctx.stroke();

        // === 11: IRON_ORE — 石ベース + オレンジ鉱脈 ===
        drawOre(11, '#cc8844', '#ffcc88');

        // === 12: LAVA — Kenney row0 col12 (赤橙ソリッド) ===
        dk(12, 0, 12);

        // === 13: BOX — Kenney row6 col2 (ブラウン) + 木箱模様 ===
        dk(13, 6, 2);
        {
            const di = 13;
            // 十字の板
            fr(di, ts * 0.44, 0, ts * 0.12, ts, '#5a3010', 0.55);
            fr(di, 0, ts * 0.44, ts, ts * 0.12, '#5a3010', 0.55);
            // 四隅の金具
            for (const [cx, cy] of [[0, 0], [0.85, 0], [0, 0.85], [0.85, 0.85]] as [number,number][]) {
                fr(di, ts * cx, ts * cy, ts * 0.15, ts * 0.15, '#9c5820', 0.8);
            }
        }

        // === 14: COAL_ORE — 石ベース + 炭黒 ===
        drawOre(14, '#1a1a2a', '#3a3a50');

        // === 15: DIAMOND_ORE — 石ベース + シアン ===
        drawOre(15, '#00aacc', '#88eeff');

        // === 16: GOLD_ORE — 石ベース + ゴールド ===
        drawOre(16, '#cc9900', '#ffee44');

        // === 17: EMERALD_ORE — 石ベース + グリーン ===
        drawOre(17, '#009933', '#44ff88');

        // === 18: FURNACE — 石ベース + 炉口 ===
        dk(18, 4, 0);
        {
            const di = 18;
            // 炉口 (暗い開口部)
            fr(di, ts * 0.18, ts * 0.22, ts * 0.64, ts * 0.56, '#110e00');
            // 炎
            fr(di, ts * 0.27, ts * 0.3, ts * 0.18, ts * 0.38, '#ff6600', 0.9);
            fr(di, ts * 0.5, ts * 0.3, ts * 0.18, ts * 0.32, '#ffcc22', 0.85);
            fr(di, ts * 0.35, ts * 0.24, ts * 0.14, ts * 0.14, '#ffee88', 0.75);
            // 煤 (上部)
            fr(di, ts * 0.18, ts * 0.22, ts * 0.64, ts * 0.08, '#1a1208', 0.7);
        }

        // ---- Phaser テクスチャとして登録 ----
        this.textures.addCanvas(TILE_TEXTURE_KEY, canvas);
    }
}
