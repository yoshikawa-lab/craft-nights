import Phaser from 'phaser';
import { GAME, PX, UI, TILE, TILE_PX, PALETTE } from '../core/Constants';

export const TILE_TEXTURE_KEY = 'tileset';

// ---- alpha値のみ参照（互換維持）----
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
    }

    create(): void {
        this._generateTileTexture();
        this.scene.start('TitleScene');
    }

    private _generateTileTexture(): void {
        const ts  = TILE_PX;
        const NUM = TILE_ALPHA.length;
        const g   = this.make.graphics({ x: 0, y: 0 });

        // ピクセルアートグリッド: 各タイルを 8×8 "デザインピクセル" で描画
        // p = タイルサイズ / 8 (1ピクセル単位)
        const p = ts / 8;

        // 透明は 0、実色は 0x以上
        const T = 0; // transparent

        // ---- カラーパレット ----
        // Grass
        const GA = 0x6ec840, GB = 0x50a030, GC = 0x3a7820, GD = 0x2a5810;
        // Dirt
        const DA = 0x9a6030, DB = 0x7a4820, DC = 0x5a3010, DL = 0xba7848;
        // Stone
        const SA = 0x8c8c8c, SB = 0x707070, SC = 0x505050, SL = 0xaaaaaa;
        // Wood (side)
        const WK = 0x3c1804, WD = 0x6a3810, WB = 0x9c5820, WL = 0xca7838;
        // Leaves
        const LA = 0x3a8c20, LB = 0x2a6a14, LC = 0x50ac2c, LD = 0x1e4e0c;
        // Water
        const WA = 0x1a58b0, WS = 0x2878d8, WH = 0x50aaff, WX = 0x0a3880;
        // Sand
        const NA = 0xe8c870, NB = 0xd0a84c, NC = 0xf8e092, ND = 0xb88830;
        // Bed
        const BA = 0x8844cc, BB = 0xaa66ee, BW = 0xf0f0f0, BG = 0xd0d0d8;
        // Chest
        const CA = 0xb47030, CB = 0xd89050, CC = 0x8a4c1c, CG = 0xffd700;
        // Ancient Brick
        const AA = 0x2a1038, AB = 0x3e1e54, AC = 0x180828, AP = 0x7c3ab8;
        // Iron ore base = stone + orange
        const OI = 0xcc8844, OJ = 0xeead66;
        // Lava
        const LV = 0xcc2200, LO = 0xff6600, LY = 0xffcc22, LW = 0xffee88;
        // Box
        const XA = 0xa07030, XB = 0xc89050, XC = 0x784c18, XD = 0x5a3810;
        // Coal ore base = stone + dark
        const KA = 0x111128, KB = 0x333348;
        // Diamond ore
        const DIA = 0x00ddff, DIB = 0x88eeff, DIC = 0x0088bb;
        // Gold ore
        const GOA = 0xffcc00, GOB = 0xffe066, GOC = 0xcc9900;
        // Emerald ore
        const EMA = 0x00dd44, EMB = 0x66ff88, EMC = 0x009932;
        // Furnace
        const FA = 0x888888, FB = 0xaaaaaa, FC = 0x606060, FF = 0xff6600, FY = 0xffcc22, FK = 0x110e00;

        // ---- ピクセルアート定義（8×8） ----
        type Row8 = [number,number,number,number,number,number,number,number];
        type Tile8 = [Row8,Row8,Row8,Row8,Row8,Row8,Row8,Row8];

        const TILES: (Tile8 | null)[] = [
            // 0: AIR
            null,

            // 1: GRASS
            [
                [GA, GA, GB, GA, GA, GB, GA, GA],
                [GB, GA, GC, GA, GB, GA, GC, GB],
                [GC, GB, GC, GC, GC, GB, GC, GC],
                [DA, DL, DA, DA, DL, DA, DA, DL],
                [DB, DA, DL, DB, DA, DL, DB, DA],
                [DA, DB, DA, DA, DB, DA, DA, DB],
                [DC, DA, DB, DC, DA, DB, DC, DA],
                [DB, DC, DA, DB, DC, DA, DB, DC],
            ],

            // 2: DIRT
            [
                [DA, DL, DA, DA, DL, DA, DA, DL],
                [DL, DA, DB, DL, DA, DB, DL, DA],
                [DA, DB, DA, DA, DB, DA, DA, DB],
                [DB, DA, DL, DB, DA, DL, DB, DA],
                [DA, DL, DA, DA, DL, DA, DA, DL],
                [DL, DB, DA, DL, DB, DA, DL, DB],
                [DC, DA, DB, DC, DA, DB, DC, DA],
                [DA, DC, DA, DA, DC, DA, DA, DC],
            ],

            // 3: STONE — 2×2のブロック目地パターン
            [
                [SC, SC, SC, SC, SC, SC, SC, SC],
                [SC, SL, SL, SA, SC, SL, SL, SA],
                [SC, SL, SA, SA, SC, SA, SA, SA],
                [SC, SA, SA, SB, SC, SB, SB, SB],
                [SC, SC, SC, SC, SC, SC, SC, SC],
                [SC, SL, SL, SA, SC, SL, SL, SA],
                [SC, SA, SA, SB, SC, SA, SA, SB],
                [SC, SB, SB, SC, SC, SB, SC, SC],
            ],

            // 4: WOOD_LOG — 横木目（サイドビュー）
            [
                [WK, WK, WK, WK, WK, WK, WK, WK],
                [WK, WD, WB, WL, WB, WL, WB, WK],
                [WK, WB, WL, WB, WD, WB, WL, WK],
                [WK, WL, WD, WB, WL, WD, WB, WK],
                [WK, WD, WL, WD, WB, WL, WD, WK],
                [WK, WB, WD, WL, WD, WB, WL, WK],
                [WK, WL, WB, WD, WL, WB, WD, WK],
                [WK, WK, WK, WK, WK, WK, WK, WK],
            ],

            // 5: LEAVES
            [
                [ T, LB,  T, LA,  T, LB,  T, LA],
                [LB, LA, LC, LA, LB, LA, LC, LB],
                [ T, LC, LA, LB, LC, LB, LA,  T],
                [LD, LA, LB, LC, LA, LC, LB, LD],
                [LA, LB, LC, LA, LB, LA, LC, LA],
                [ T, LA, LB, LC, LA, LB, LC,  T],
                [LD, LC, LA, LB, LC, LA, LB, LD],
                [ T, LD, LC, LA, LB, LD, LA,  T],
            ],

            // 6: WATER
            [
                [WH, WH, WS, WH, WH, WS, WH, WH],
                [WS, WA, WA, WS, WA, WA, WS, WA],
                [WA, WA, WX, WA, WA, WX, WA, WA],
                [WH, WS, WH, WH, WS, WH, WH, WS],
                [WA, WA, WA, WS, WA, WA, WA, WS],
                [WX, WA, WS, WA, WX, WA, WS, WX],
                [WA, WS, WA, WA, WS, WA, WA, WS],
                [WS, WA, WX, WA, WA, WX, WA, WA],
            ],

            // 7: SAND
            [
                [NA, NC, NA, NA, NC, NA, NA, NC],
                [NC, NA, NB, NC, NA, NB, NC, NA],
                [NB, NA, NC, NA, NB, NC, NA, NB],
                [NA, NB, NA, NA, NA, NA, NB, NA],
                [NC, NA, NA, NB, NC, NA, NA, NB],
                [NA, NA, NC, NA, NA, NC, NA, NA],
                [NB, NC, NA, NA, NB, NA, NC, NA],
                [NA, ND, NA, NC, NA, ND, NA, NC],
            ],

            // 8: BED
            [
                [BA, BA, BA, BA, BA, BA, BA, BA],
                [BA, BB, BB, BB, BB, BB, BB, BA],
                [BA, BB, BW, BW, BW, BW, BB, BA],
                [BA, BB, BW, BG, BG, BW, BB, BA],
                [BA, BB, BW, BG, BG, BW, BB, BA],
                [BA, BB, BW, BW, BW, BW, BB, BA],
                [BA, BB, BB, BB, BB, BB, BB, BA],
                [BA, BA, BA, BA, BA, BA, BA, BA],
            ],

            // 9: CHEST
            [
                [CC, CA, CA, CA, CA, CA, CA, CC],
                [CA, CB, CB, CB, CB, CB, CB, CA],
                [CA, CB, CA, CA, CA, CA, CB, CA],
                [CA, CA, CA, CG, CG, CA, CA, CA],
                [CA, CA, CA, CG, CG, CA, CA, CA],
                [CA, CB, CA, CA, CA, CA, CB, CA],
                [CA, CA, CC, CC, CC, CC, CA, CA],
                [CC, CC, CC, CC, CC, CC, CC, CC],
            ],

            // 10: ANCIENT_BRICK
            [
                [AC, AC, AC, AC, AC, AC, AC, AC],
                [AC, AB, AB, AA, AC, AB, AB, AC],
                [AC, AB, AA, AP, AB, AP, AA, AC],
                [AC, AC, AC, AC, AC, AC, AC, AC],
                [AC, AA, AC, AB, AA, AB, AC, AC],
                [AC, AB, AA, AP, AB, AA, AP, AC],
                [AC, AP, AB, AA, AP, AB, AA, AC],
                [AC, AC, AC, AC, AC, AC, AC, AC],
            ],

            // 11: ORE (鉄鉱石) — 石ベース + オレンジ鉱石
            [
                [SC, SA, SA, SB, SC, SA, SA, SB],
                [SA, OI, OI, SA, SA, OI, OI, SA],
                [SA, OI, OJ, OI, SA, OI, OJ, OI],
                [SA, OI, OI, SB, SA, SB, OI, SA],
                [SC, SA, SB, SA, SC, SA, SB, SA],
                [SA, SA, OI, OJ, SA, OI, OJ, SA],
                [SA, OI, OJ, OI, OI, OJ, OI, SA],
                [SB, SA, OI, SB, SB, OI, SA, SB],
            ],

            // 12: LAVA
            [
                [LO, LY, LO, LO, LY, LO, LO, LY],
                [LY, LW, LY, LY, LW, LY, LW, LY],
                [LO, LY, LV, LO, LY, LV, LO, LY],
                [LV, LO, LO, LV, LO, LO, LV, LO],
                [LO, LV, LO, LO, LV, LO, LO, LV],
                [LV, LO, LV, LV, LO, LV, LV, LO],
                [LO, LV, LO, LV, LV, LO, LV, LO],
                [LV, LV, LV, LO, LV, LV, LO, LV],
            ],

            // 13: BOX (木箱)
            [
                [XD, XD, XD, XD, XD, XD, XD, XD],
                [XD, XB, XB, XB, XB, XB, XB, XD],
                [XD, XB, XA, XA, XA, XA, XB, XD],
                [XD, XB, XA, XC, XA, XC, XB, XD],
                [XD, XD, XD, XD, XD, XD, XD, XD],
                [XD, XB, XA, XC, XA, XC, XB, XD],
                [XD, XB, XA, XA, XA, XA, XB, XD],
                [XD, XD, XD, XD, XD, XD, XD, XD],
            ],

            // 14: COAL_ORE — 石ベース + 黒炭
            [
                [SC, SA, SA, SB, SC, SA, SA, SB],
                [SA, KA, KA, SA, SA, KA, KA, SA],
                [SA, KA, KB, KA, SA, KA, KB, KA],
                [SA, KA, KA, SB, SA, SB, KA, SA],
                [SC, SA, SB, SA, SC, SA, SB, SA],
                [SA, SA, KA, KB, SA, KA, KB, SA],
                [SA, KA, KB, KA, KA, KB, KA, SA],
                [SB, SA, KA, SB, SB, KA, SA, SB],
            ],

            // 15: DIAMOND_ORE — 石ベース + シアンダイヤ
            [
                [SC, SA, SA, SB, SC, SA, SA, SB],
                [SA, DIA, DIA, SA, SA, DIA, DIA, SA],
                [SA, DIA, DIB, DIA, SA, DIA, DIB, DIA],
                [SA, DIC, DIA, SB, SA, SB, DIA, SA],
                [SC, SA, SB, SA, SC, SA, SB, SA],
                [SA, SA, DIA, DIB, SA, DIA, DIB, SA],
                [SA, DIA, DIB, DIA, DIA, DIB, DIA, SA],
                [SB, SA, DIC, SB, SB, DIC, SA, SB],
            ],

            // 16: GOLD_ORE — 石ベース + 金
            [
                [SC, SA, SA, SB, SC, SA, SA, SB],
                [SA, GOA, GOA, SA, SA, GOA, GOA, SA],
                [SA, GOA, GOB, GOA, SA, GOA, GOB, GOA],
                [SA, GOC, GOA, SB, SA, SB, GOA, SA],
                [SC, SA, SB, SA, SC, SA, SB, SA],
                [SA, SA, GOA, GOB, SA, GOA, GOB, SA],
                [SA, GOA, GOB, GOA, GOA, GOB, GOA, SA],
                [SB, SA, GOC, SB, SB, GOC, SA, SB],
            ],

            // 17: EMERALD_ORE — 石ベース + 緑
            [
                [SC, SA, SA, SB, SC, SA, SA, SB],
                [SA, EMA, EMA, SA, SA, EMA, EMA, SA],
                [SA, EMA, EMB, EMA, SA, EMA, EMB, EMA],
                [SA, EMC, EMA, SB, SA, SB, EMA, SA],
                [SC, SA, SB, SA, SC, SA, SB, SA],
                [SA, SA, EMA, EMB, SA, EMA, EMB, SA],
                [SA, EMA, EMB, EMA, EMA, EMB, EMA, SA],
                [SB, SA, EMC, SB, SB, EMC, SA, SB],
            ],

            // 18: FURNACE — 石外壁 + 炉口
            [
                [FC, FA, FA, FA, FA, FA, FA, FC],
                [FA, FB, FA, FA, FA, FA, FB, FA],
                [FA, FA, FK, FK, FK, FK, FA, FA],
                [FA, FA, FK, FF, FF, FK, FA, FA],
                [FA, FA, FK, FF, FY, FK, FA, FA],
                [FA, FA, FK, FK, FK, FK, FA, FA],
                [FA, FB, FA, FA, FA, FA, FB, FA],
                [FC, FA, FA, FA, FA, FA, FA, FC],
            ],
        ];

        // ---- 描画 ----
        for (let i = 0; i < NUM; i++) {
            const ox    = i * ts;
            const data  = TILES[i];
            const alpha = TILE_ALPHA[i] ?? 1;
            if (!data) continue;

            // ピクセルアート描画
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const col = data[r][c];
                    if (col === T) continue;
                    g.fillStyle(col, alpha);
                    g.fillRect(ox + c * p, r * p, p + 0.5, p + 0.5);
                }
            }

            // 薄いベベルエッジ（全タイル共通）
            g.fillStyle(0xffffff, alpha * 0.18);
            g.fillRect(ox,     0, ts,  1);   // top highlight
            g.fillRect(ox,     1,  1, ts - 1); // left highlight
            g.fillStyle(0x000000, alpha * 0.30);
            g.fillRect(ox, ts - 1, ts,  1);     // bottom shadow
            g.fillRect(ox + ts - 1, 0,  1, ts); // right shadow
        }

        g.generateTexture(TILE_TEXTURE_KEY, NUM * ts, ts);
        g.destroy();
    }
}
