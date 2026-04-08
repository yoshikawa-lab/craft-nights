// ============================
// WorldMap — タイルマップデータ管理
// バイオーム: 地表 / 洞窟 / 廃鉱山 / 村 / 古代都市
// ============================
import { GAME, TILE, TileType, ITEM, ItemType, PALETTE, TILE_SOLID } from '../core/Constants';

export interface TileCell {
    type: TileType;
    solid: boolean;
    breakable: boolean;
    drops: ItemType | null;
    dropCount?: number;
}

const TILE_META: Record<TileType, { breakable: boolean; drops: ItemType | null; dropCount?: number }> = {
    [TILE.AIR]:           { breakable: false, drops: null },
    [TILE.GRASS]:         { breakable: true,  drops: ITEM.DIRT },
    [TILE.DIRT]:          { breakable: true,  drops: ITEM.DIRT },
    [TILE.STONE]:         { breakable: true,  drops: ITEM.STONE },
    [TILE.WOOD_LOG]:      { breakable: true,  drops: ITEM.WOOD },
    [TILE.LEAVES]:        { breakable: true,  drops: null },
    [TILE.WATER]:         { breakable: false, drops: null },
    [TILE.SAND]:          { breakable: true,  drops: ITEM.DIRT },
    [TILE.BED]:           { breakable: true,  drops: ITEM.BED },
    [TILE.CHEST]:         { breakable: false, drops: null },
    [TILE.ANCIENT_BRICK]: { breakable: true,  drops: ITEM.STONE, dropCount: 2 },
    [TILE.ORE]:           { breakable: true,  drops: ITEM.IRON_ORE },
    [TILE.LAVA]:          { breakable: false, drops: null },
    [TILE.BOX]:           { breakable: true,  drops: ITEM.BOX },
    [TILE.COAL_ORE]:      { breakable: true,  drops: ITEM.COAL },
    [TILE.DIAMOND_ORE]:   { breakable: true,  drops: ITEM.DIAMOND },
    [TILE.GOLD_ORE]:      { breakable: true,  drops: ITEM.GOLD },
    [TILE.EMERALD_ORE]:   { breakable: true,  drops: ITEM.EMERALD },
    [TILE.FURNACE]:       { breakable: true,  drops: ITEM.FURNACE_ITEM },
};

export const TILE_COLORS: Record<TileType, number> = {
    [TILE.AIR]:           0x000000,
    [TILE.GRASS]:         PALETTE.TILE_GRASS,
    [TILE.DIRT]:          PALETTE.TILE_DIRT,
    [TILE.STONE]:         PALETTE.TILE_STONE,
    [TILE.WOOD_LOG]:      PALETTE.TILE_WOOD,
    [TILE.LEAVES]:        PALETTE.TILE_LEAVES,
    [TILE.WATER]:         PALETTE.TILE_WATER,
    [TILE.SAND]:          PALETTE.TILE_SAND,
    [TILE.BED]:           PALETTE.TILE_BED,
    [TILE.CHEST]:         PALETTE.TILE_CHEST,
    [TILE.ANCIENT_BRICK]: PALETTE.TILE_ANCIENT_BRICK,
    [TILE.ORE]:           PALETTE.TILE_ORE,
    [TILE.LAVA]:          PALETTE.TILE_LAVA,
    [TILE.BOX]:           PALETTE.TILE_BOX,
    [TILE.COAL_ORE]:      PALETTE.TILE_COAL_ORE,
    [TILE.DIAMOND_ORE]:   PALETTE.TILE_DIAMOND_ORE,
    [TILE.GOLD_ORE]:      PALETTE.TILE_GOLD_ORE,
    [TILE.EMERALD_ORE]:   PALETTE.TILE_EMERALD_ORE,
    [TILE.FURNACE]:       PALETTE.TILE_FURNACE,
};

/** 廃鉱山の位置情報 */
export interface MineBounds {
    entryX: number;    // 地上からの入口X
    entryY: number;    // 地上入口Y
    shaftY: number;    // メイン横坑道Y
    x1: number;        // 坑道西端
    x2: number;        // 坑道東端
}

/** 古代都市の位置情報 */
export interface CityBounds {
    x1: number; y1: number;
    x2: number; y2: number;
    bossX1: number; bossY1: number;
    bossX2: number; bossY2: number;
}

export class WorldMap {
    readonly W = GAME.WORLD_TILES_W;
    readonly H = GAME.WORLD_TILES_H;
    private data: Uint8Array;

    sheepSpawns: Array<{ tx: number; ty: number }> = [];
    chestPos: { tx: number; ty: number } | null = null;
    playerStart: { tx: number; ty: number } = { tx: 64, ty: 37 };
    mineBounds: MineBounds | null = null;
    cityBounds: CityBounds | null = null;
    villagerSpawns: Array<{ tx: number; ty: number }> = [];
    villageChestPos: { tx: number; ty: number } | null = null;

    // 地表高さマップ（各X列の地表タイルY座標）
    heights: number[] = [];

    constructor() {
        this.data = new Uint8Array(this.W * this.H);
        this._generate();
    }

    private idx(tx: number, ty: number) { return ty * this.W + tx; }

    get(tx: number, ty: number): TileType {
        if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return TILE.STONE;
        return this.data[this.idx(tx, ty)] as TileType;
    }

    set(tx: number, ty: number, type: TileType): void {
        if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return;
        this.data[this.idx(tx, ty)] = type;
    }

    getCell(tx: number, ty: number): TileCell {
        const type = this.get(tx, ty);
        const meta = TILE_META[type];
        return {
            type,
            solid: TILE_SOLID[type],
            breakable: meta.breakable,
            drops: meta.drops,
            dropCount: meta.dropCount,
        };
    }

    isSolid(tx: number, ty: number): boolean {
        return TILE_SOLID[this.get(tx, ty)];
    }

    /** Phaser Tilemapが必要とする2D配列。AIR=-1 */
    getData2D(): number[][] {
        const rows: number[][] = [];
        for (let ty = 0; ty < this.H; ty++) {
            const row: number[] = [];
            for (let tx = 0; tx < this.W; tx++) {
                const t = this.data[this.idx(tx, ty)];
                row.push(t === TILE.AIR ? -1 : t);
            }
            rows.push(row);
        }
        return rows;
    }

    // ============================
    // プロシージャル地形生成
    // ============================
    private _generate(): void {
        const W = this.W;
        const H = this.H;
        const base = GAME.SURFACE_Y;

        // ---- ハイトマップ生成 ----
        const h: number[] = new Array(W).fill(0);
        let cur = base;
        for (let x = 0; x < W; x++) {
            cur += Math.floor((Math.random() - 0.5) * 2.5);
            cur = Math.max(base - 6, Math.min(base + 6, cur));
            h[x] = cur;
        }
        this.heights = h;

        // ---- タイル配置（地表・土・石） ----
        for (let tx = 0; tx < W; tx++) {
            const surfY = h[tx];
            for (let ty = 0; ty < H; ty++) {
                if (ty < surfY) {
                    this.set(tx, ty, TILE.AIR);
                } else if (ty === surfY) {
                    this.set(tx, ty, TILE.GRASS);
                } else if (ty < surfY + 5) {
                    this.set(tx, ty, TILE.DIRT);
                } else {
                    this.set(tx, ty, TILE.STONE);
                }
            }
        }

        // ---- 通常の洞窟（80個：ワールド拡張に合わせて増量） ----
        for (let i = 0; i < 80; i++) {
            const cx = Math.floor(Math.random() * (W - 10)) + 5;
            const minY = h[cx] + 8;
            if (minY >= H - 5) continue;
            const cy = minY + Math.floor(Math.random() * (H - minY - 5));
            const r = 2 + Math.floor(Math.random() * 4);
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (dx * dx + dy * dy <= r * r) {
                        this.set(cx + dx, cy + dy, TILE.AIR);
                    }
                }
            }
        }

        // ---- 鉄鉱石の鉱脈（石エリアに散在） ----
        this._generateOreVeins(h);

        // ---- 廃鉱山（西エリア: x=10〜54） ----
        this._generateMine(h);

        // ---- 村（プレイヤー開始点右: x=130〜175） ----
        this._generateVillage(h);

        // ---- 古代都市（東エリア: x=76〜122） ----
        this._generateAncientCity();

        // ---- 木を植える ----
        for (let i = 0; i < 80; i++) {
            const tx = Math.floor(Math.random() * (W - 16)) + 8;
            // 鉱山エリア・古代都市エリア上部を避ける
            if (tx >= 8 && tx <= 58) continue;
            if (tx >= 186 && tx <= 238) continue;
            const ty = h[tx];
            if (this.get(tx, ty) === TILE.GRASS) {
                this._plantTree(tx, ty);
            }
        }

        // ---- 水たまり ----
        for (let i = 0; i < 10; i++) {
            const px = Math.floor(Math.random() * (W - 20)) + 10;
            const py = h[px];
            for (let dx = -2; dx <= 2; dx++) {
                const nx = px + dx;
                if (nx < 0 || nx >= W) continue;
                if (this.get(nx, py) === TILE.GRASS) {
                    this.set(nx, py, TILE.WATER);
                    if (this.get(nx, py + 1) === TILE.DIRT) {
                        this.set(nx, py + 1, TILE.WATER);
                    }
                }
            }
        }

        // ---- 羊スポーン（地表） ----
        for (let i = 0; i < 20; i++) {
            const tx = Math.floor(Math.random() * (W - 10)) + 5;
            const ty = h[tx];
            if (this.get(tx, ty) === TILE.GRASS) {
                this.sheepSpawns.push({ tx, ty: ty - 1 });
            }
        }

        // ---- プレイヤー開始位置（中央） ----
        const startX = Math.floor(W / 2);
        this.playerStart = { tx: startX, ty: h[startX] - 1 };

        // ---- ボーナスチェスト（プレイヤーの右4タイル） ----
        const chestX = startX + 4;
        const chestY = h[Math.min(chestX, W - 1)];
        this.set(chestX, chestY, TILE.CHEST);
        this.chestPos = { tx: chestX, ty: chestY };
    }

    // ---- 鉱石の鉱脈生成 ----
    private _generateOreVeins(h: number[]): void {
        const W = this.W;
        const H = this.H;

        // 鉄鉱石（200箇所、石エリア全般）
        for (let i = 0; i < 200; i++) {
            const cx = Math.floor(Math.random() * W);
            const minY = h[cx] + 6;
            if (minY >= H - 2) continue;
            const cy = minY + Math.floor(Math.random() * (H - minY - 2));
            const r = 1 + Math.floor(Math.random() * 2);
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (dx * dx + dy * dy <= r * r) {
                        if (this.get(cx + dx, cy + dy) === TILE.STONE) {
                            this.set(cx + dx, cy + dy, TILE.ORE);
                        }
                    }
                }
            }
        }

        // 石炭鉱石（浅い〜中層: 地表+4〜H/2, 80箇所）
        for (let i = 0; i < 80; i++) {
            const cx = Math.floor(Math.random() * W);
            const surfY = h[Math.min(cx, W - 1)];
            const minY = surfY + 4;
            const maxY = Math.floor(H / 2);
            if (minY >= maxY) continue;
            const cy = minY + Math.floor(Math.random() * (maxY - minY));
            const r = 1 + Math.floor(Math.random() * 2);
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (dx * dx + dy * dy <= r * r) {
                        if (this.get(cx + dx, cy + dy) === TILE.STONE) {
                            this.set(cx + dx, cy + dy, TILE.COAL_ORE);
                        }
                    }
                }
            }
        }

        // ダイヤ鉱石（深層のみ: H*0.6〜H-3, 30箇所）
        for (let i = 0; i < 30; i++) {
            const cx = Math.floor(Math.random() * W);
            const minY = Math.floor(H * 0.6);
            const maxY = H - 3;
            if (minY >= maxY) continue;
            const cy = minY + Math.floor(Math.random() * (maxY - minY));
            const r = 1;
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (dx * dx + dy * dy <= r * r) {
                        if (this.get(cx + dx, cy + dy) === TILE.STONE) {
                            this.set(cx + dx, cy + dy, TILE.DIAMOND_ORE);
                        }
                    }
                }
            }
        }

        // 金鉱石（中〜深層: H*0.4〜H-3, 50箇所）
        for (let i = 0; i < 50; i++) {
            const cx = Math.floor(Math.random() * W);
            const minY = Math.floor(H * 0.4);
            const maxY = H - 3;
            if (minY >= maxY) continue;
            const cy = minY + Math.floor(Math.random() * (maxY - minY));
            const r = 1 + Math.floor(Math.random() * 2);
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (dx * dx + dy * dy <= r * r) {
                        if (this.get(cx + dx, cy + dy) === TILE.STONE) {
                            this.set(cx + dx, cy + dy, TILE.GOLD_ORE);
                        }
                    }
                }
            }
        }

        // エメラルド鉱石（村周辺: x=130-190, 中層, 40箇所）
        for (let i = 0; i < 40; i++) {
            const cx = 130 + Math.floor(Math.random() * 60);
            const surfY = h[Math.min(cx, W - 1)];
            const minY = surfY + 5;
            const maxY = Math.floor(H * 0.6);
            if (minY >= maxY) continue;
            const cy = minY + Math.floor(Math.random() * (maxY - minY));
            if (this.get(cx, cy) === TILE.STONE) {
                this.set(cx, cy, TILE.EMERALD_ORE);
                // 小さな鉱脈
                if (Math.random() < 0.4) {
                    for (let d = -1; d <= 1; d++) {
                        if (this.get(cx + d, cy) === TILE.STONE) {
                            this.set(cx + d, cy, TILE.EMERALD_ORE);
                        }
                    }
                }
            }
        }
    }

    // ---- 廃鉱山生成（x: 10〜54） ----
    private _generateMine(h: number[]): void {
        const shaftY = 50;   // メイン横坑道のY座標（固定）
        const x1 = 10;
        const x2 = 54;
        const entryX = 32;
        const entryY = h[entryX] + 1;  // 地表から1タイル下（入口）

        // メイン横坑道（2タイル高）
        for (let tx = x1; tx <= x2; tx++) {
            this.set(tx, shaftY,     TILE.AIR);
            this.set(tx, shaftY - 1, TILE.AIR);
        }

        // 地上からの縦入口（x=32）
        for (let ty = entryY; ty < shaftY; ty++) {
            this.set(entryX,     ty, TILE.AIR);
            this.set(entryX + 1, ty, TILE.AIR);
        }

        // 木製支柱（坑道の天井支え）
        for (let tx = x1 + 4; tx <= x2; tx += 6) {
            if (this.get(tx, shaftY - 2) !== TILE.AIR) {
                this.set(tx, shaftY - 2, TILE.WOOD_LOG);
            }
        }

        // 枝坑道（3本）
        const branchXs = [16, 28, 44];
        for (const bx of branchXs) {
            // 下方向の枝
            for (let ty = shaftY + 1; ty <= Math.min(shaftY + 6, this.H - 2); ty++) {
                this.set(bx,     ty, TILE.AIR);
                this.set(bx + 1, ty, TILE.AIR);
            }
            // 枝の横坑道
            for (let tx = bx - 3; tx <= bx + 4; tx++) {
                const ty = shaftY + 5;
                if (ty < this.H - 1) {
                    this.set(tx, ty, TILE.AIR);
                }
            }
        }

        // 鉱山内の鉱石密度を上げる（坑道周辺の石をORE化）
        for (let tx = x1; tx <= x2; tx++) {
            for (let ty = shaftY - 3; ty <= shaftY + 8; ty++) {
                if (this.get(tx, ty) === TILE.STONE && Math.random() < 0.18) {
                    this.set(tx, ty, TILE.ORE);
                }
            }
        }

        // 鉱山チェスト（東端奥に埋蔵）
        const mineChestX = x2 - 2;
        const mineChestY = shaftY;
        this.set(mineChestX, mineChestY, TILE.CHEST);

        this.mineBounds = { entryX, entryY, shaftY, x1, x2 };
    }

    // ---- 村生成（x: 130〜175） ----
    private _generateVillage(h: number[]): void {
        const W = this.W;

        // 3つの家を生成（各8タイル幅×5タイル高）
        const houseConfigs = [
            { startX: 132 },
            { startX: 143 },
            { startX: 154 },
        ];

        let chestPlaced = false;

        for (let hi = 0; hi < houseConfigs.length; hi++) {
            const { startX } = houseConfigs[hi];
            const endX = startX + 8;

            // 家の地表Y（スタート列の高さを使用）
            const groundY = h[Math.min(startX + 4, W - 1)];
            const houseBottom = groundY;  // 床
            const houseTop = groundY - 4; // 屋根

            // 家の床（DIRT）
            for (let tx = startX; tx <= endX; tx++) {
                if (this.get(tx, houseBottom) !== TILE.AIR) {
                    this.set(tx, houseBottom, TILE.DIRT);
                }
            }

            // 壁と屋根（WOOD_LOG）
            for (let ty = houseTop; ty < houseBottom; ty++) {
                for (let tx = startX; tx <= endX; tx++) {
                    const isWall = (tx === startX || tx === endX);
                    const isRoof = (ty === houseTop);
                    if (isWall || isRoof) {
                        this.set(tx, ty, TILE.WOOD_LOG);
                    } else {
                        // 内部はAIR
                        this.set(tx, ty, TILE.AIR);
                    }
                }
            }

            // ドア（前壁の真ん中2タイルをAIR）
            const doorX = startX + 3;
            this.set(doorX,     houseBottom - 1, TILE.AIR);
            this.set(doorX + 1, houseBottom - 1, TILE.AIR);
            this.set(doorX,     houseBottom - 2, TILE.AIR);
            this.set(doorX + 1, houseBottom - 2, TILE.AIR);

            // house1 の内部にチェストを設置
            if (hi === 0 && !chestPlaced) {
                const cx = startX + 2;
                const cy = houseBottom - 1;
                this.set(cx, cy, TILE.CHEST);
                this.villageChestPos = { tx: cx, ty: cy };
                chestPlaced = true;
            }

            // 村人スポーン位置（各家のドア前）
            this.villagerSpawns.push({ tx: doorX + 1, ty: houseBottom - 1 });
        }

        // 村の広場: 家の間をSTONEで舗装
        for (let tx = 130; tx <= 163; tx++) {
            const groundY = h[Math.min(tx, W - 1)];
            if (this.get(tx, groundY) === TILE.GRASS || this.get(tx, groundY) === TILE.DIRT) {
                this.set(tx, groundY, TILE.STONE);
            }
        }
    }

    // ---- 古代都市生成（x: 190〜234, y: 45〜62） ----
    private _generateAncientCity(): void {
        const cx1 = 190, cx2 = 234;
        const cy1 = 45, cy2 = 62;
        // ボス部屋（都市の最深部）
        const bx1 = 204, bx2 = 222;
        const by1 = 53, by2 = 62;

        // 外壁（ANCIENT_BRICK 2タイル厚）
        for (let tx = cx1; tx <= cx2; tx++) {
            for (let ty = cy1; ty <= cy2; ty++) {
                const onEdge = (tx <= cx1 + 1 || tx >= cx2 - 1 || ty === cy1 || ty === cy2);
                if (onEdge) {
                    this.set(tx, ty, TILE.ANCIENT_BRICK);
                } else {
                    // 内部は空洞に
                    this.set(tx, ty, TILE.AIR);
                }
            }
        }

        // メインホール（中間の仕切り壁）
        // 床仕切り（y=52に一段のれんが通路）
        for (let tx = cx1 + 2; tx <= cx2 - 2; tx++) {
            if (tx >= bx1 - 1 && tx <= bx2 + 1) {
                // ボス部屋入口（開口部）
                if (tx !== bx1 - 1 && tx !== bx2 + 1) continue;
            }
            this.set(tx, by1 - 1, TILE.ANCIENT_BRICK);
        }
        // 開口部（ボス部屋への入口）
        this.set(bx1,     by1 - 1, TILE.AIR);
        this.set(bx1 + 1, by1 - 1, TILE.AIR);
        this.set(bx2 - 1, by1 - 1, TILE.AIR);
        this.set(bx2,     by1 - 1, TILE.AIR);

        // 装飾柱（メインホール内）
        const pillarXs = [cx1 + 4, cx1 + 10, cx1 + 16, cx1 + 22, cx1 + 28, cx1 + 34, cx1 + 40];
        for (const px of pillarXs) {
            if (px > cx2 - 2) break;
            for (let ty = cy1 + 2; ty <= by1 - 2; ty++) {
                this.set(px, ty, TILE.ANCIENT_BRICK);
            }
        }

        // ボス部屋内部（きれいに空洞）
        for (let tx = bx1; tx <= bx2; tx++) {
            for (let ty = by1; ty <= by2 - 1; ty++) {
                this.set(tx, ty, TILE.AIR);
            }
        }

        // ボス部屋の床の一部に溶岩（演出）
        for (let tx = bx1 + 2; tx <= bx2 - 2; tx++) {
            if ((tx - bx1) % 4 === 2) {
                this.set(tx, by2, TILE.LAVA);
            }
        }

        // 都市への入口（地上から垂直シャフト x=211）
        const entryX = 211;
        const H = this.H;
        for (let ty = this.heights[Math.min(entryX, this.W - 1)] + 1; ty < cy1; ty++) {
            this.set(entryX,     ty, TILE.AIR);
            this.set(entryX + 1, ty, TILE.AIR);
        }

        // 都市周辺の鉱石を増やす（古代都市らしく）
        for (let tx = cx1 - 3; tx <= cx2 + 3; tx++) {
            for (let ty = cy1 - 5; ty <= cy1; ty++) {
                if (this.get(tx, ty) === TILE.STONE && Math.random() < 0.25) {
                    this.set(tx, ty, TILE.ORE);
                }
            }
        }

        this.cityBounds = { x1: cx1, y1: cy1, x2: cx2, y2: cy2, bossX1: bx1, bossY1: by1, bossX2: bx2, bossY2: by2 };
    }

    // ---- 木を植える ----
    private _plantTree(tx: number, baseY: number): void {
        const trunkH = 4 + Math.floor(Math.random() * 2);
        for (let i = 1; i <= trunkH; i++) {
            this.set(tx, baseY - i, TILE.WOOD_LOG);
        }
        const topY = baseY - trunkH;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 1; dy++) {
                if (Math.abs(dx) === 2 && dy >= 0) continue;
                if (this.get(tx + dx, topY + dy) === TILE.AIR) {
                    this.set(tx + dx, topY + dy, TILE.LEAVES);
                }
            }
        }
    }
}
