import { GAME, TILE, TileType } from '../core/Constants';

// ============================================================
// WorldMap — 手続き生成ワールド
// ============================================================

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** 1D simplex-like noise */
function smoothNoise(rng: () => number, len: number, scale = 0.05): number[] {
  const pts = Math.ceil(len * scale) + 2;
  const cp: number[] = Array.from({ length: pts }, () => rng() * 20 - 10);
  const out: number[] = [];
  for (let x = 0; x < len; x++) {
    const t  = x * scale;
    const i  = Math.floor(t);
    const f  = t - i;
    const a  = cp[Math.min(i,     pts - 1)];
    const b  = cp[Math.min(i + 1, pts - 1)];
    const sf = f * f * (3 - 2 * f);
    out.push(a + (b - a) * sf);
  }
  return out;
}

export class WorldMap {
  readonly W   = GAME.WORLD_W;
  readonly H   = GAME.WORLD_H;
  readonly SY  = GAME.SURFACE_Y;       // 地表基準 Y（タイル）
  readonly T   = GAME.TILE_SIZE;

  /** tiles[y][x] */
  readonly tiles: Uint8Array[];

  private rng: () => number;

  constructor(seed: number) {
    this.rng   = mulberry32(seed);
    this.tiles = Array.from({ length: this.H }, () => new Uint8Array(this.W));
    this.generate();
  }

  // ---- 生成 ----
  private generate() {
    const rng = this.rng;

    // 地表の高さ変動（-4 ~ +4）
    const surfaceNoise = smoothNoise(rng, this.W, 0.04);
    const surfaceY = surfaceNoise.map(n => Math.round(this.SY + n));

    // --- 地形配置 ---
    for (let x = 0; x < this.W; x++) {
      const sy = Math.max(5, Math.min(this.H - 10, surfaceY[x]));

      for (let y = 0; y < this.H; y++) {
        if      (y < sy)     this.set(x, y, TILE.AIR);
        else if (y === sy)   this.set(x, y, TILE.GRASS);
        else if (y < sy + 5) this.set(x, y, TILE.DIRT);
        else                 this.set(x, y, TILE.STONE);
      }
    }

    // --- 鉱石 ---
    this.scatterOre(TILE.COAL_ORE,    400, this.SY + 6,  this.H - 5);
    this.scatterOre(TILE.IRON_ORE,    220, this.SY + 12, this.H - 5);
    this.scatterOre(TILE.GOLD_ORE,    100, this.SY + 20, this.H - 5);
    this.scatterOre(TILE.EMERALD_ORE,  50, this.SY + 30, this.H - 5);
    this.scatterOre(TILE.DIAMOND_ORE,  35, this.SY + 35, this.H - 5);

    // --- 溶岩 (深部) ---
    for (let x = 0; x < this.W; x++) {
      for (let y = this.H - 8; y < this.H; y++) {
        if (this.get(x, y) === TILE.STONE && rng() < 0.08) {
          this.set(x, y, TILE.LAVA);
        }
      }
    }

    // --- 洞窟 (cellular automata) ---
    this.carveCaves(surfaceY);

    // --- 木 ---
    this.plantTrees(surfaceY);

    // --- 砂ゾーン（右端）---
    const sandStart = Math.floor(this.W * 0.7);
    for (let x = sandStart; x < this.W; x++) {
      const sy = surfaceY[x];
      for (let y = sy; y < Math.min(sy + 6, this.H); y++) {
        if (this.get(x, y) !== TILE.AIR) this.set(x, y, TILE.SAND);
      }
    }

    // --- 古代都市（深部中央） ---
    this.placeAncientCity();

    // --- 水 (左端の窪み) ---
    this.placeWater(surfaceY);
  }

  private scatterOre(tile: TileType, count: number, yMin: number, yMax: number) {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(this.rng() * this.W);
      const y = Math.floor(this.rng() * (yMax - yMin) + yMin);
      if (this.get(x, y) === TILE.STONE) this.set(x, y, tile);
    }
  }

  private carveCaves(surfaceY: number[]) {
    const rng = this.rng;
    // ランダムウォークで洞窟を掘る
    for (let i = 0; i < 60; i++) {
      let cx = Math.floor(rng() * this.W);
      let cy = Math.floor(rng() * (this.H - this.SY - 10) + this.SY + 8);
      const steps = 80 + Math.floor(rng() * 120);
      for (let s = 0; s < steps; s++) {
        const r = 1 + Math.floor(rng() * 2);
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < this.W && ny > (surfaceY[nx] ?? this.SY) + 4 && ny < this.H - 4) {
              if (this.get(nx, ny) !== TILE.LAVA) this.set(nx, ny, TILE.AIR);
            }
          }
        }
        cx += Math.round((rng() - 0.5) * 4);
        cy += Math.round((rng() - 0.5) * 2);
        cx = Math.max(0, Math.min(this.W - 1, cx));
        cy = Math.max(this.SY + 6, Math.min(this.H - 6, cy));
      }
    }
  }

  private plantTrees(surfaceY: number[]) {
    const rng = this.rng;
    for (let x = 5; x < this.W - 5; x++) {
      if (rng() < 0.08) {
        const sy = surfaceY[x];
        if (this.get(x, sy) === TILE.GRASS) {
          const h = 4 + Math.floor(rng() * 3);
          for (let y = sy - h; y < sy; y++) {
            if (y >= 0) this.set(x, y, TILE.WOOD_LOG);
          }
          // 葉っぱ
          for (let dy = -2; dy <= 0; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const lx = x + dx, ly = sy - h + dy;
              if (lx >= 0 && lx < this.W && ly >= 0 && this.get(lx, ly) === TILE.AIR) {
                if (Math.abs(dx) + Math.abs(dy) <= 2) this.set(lx, ly, TILE.LEAVES);
              }
            }
          }
        }
      }
    }
  }

  private placeAncientCity() {
    const cx = Math.floor(this.W / 2);
    const cy = this.H - 15;
    const w = 30, h = 8;
    for (let x = cx - w; x < cx + w; x++) {
      for (let y = cy; y < cy + h; y++) {
        if (x >= 0 && x < this.W && y >= 0 && y < this.H) {
          this.set(x, y, TILE.ANCIENT_BRICK);
        }
      }
    }
    // 内部を空洞に
    for (let x = cx - w + 1; x < cx + w - 1; x++) {
      for (let y = cy + 1; y < cy + h - 1; y++) {
        this.set(x, y, TILE.AIR);
      }
    }
  }

  private placeWater(surfaceY: number[]) {
    const rng = this.rng;
    // 小さな水たまりをランダムに配置
    for (let i = 0; i < 8; i++) {
      const bx = Math.floor(rng() * this.W);
      const by = surfaceY[bx] ?? this.SY;
      for (let dx = -2; dx <= 2; dx++) {
        const nx = bx + dx;
        if (nx >= 0 && nx < this.W) {
          const sy = surfaceY[nx] ?? this.SY;
          if (this.get(nx, sy) === TILE.GRASS || this.get(nx, sy) === TILE.DIRT) {
            this.set(nx, sy, TILE.WATER);
          }
        }
      }
    }
  }

  // ---- アクセサ ----
  get(x: number, y: number): TileType {
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return TILE.AIR;
    return this.tiles[y][x] as TileType;
  }

  set(x: number, y: number, tile: TileType) {
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return;
    this.tiles[y][x] = tile;
  }

  /** 指定ピクセル座標のタイル */
  getTileAtPixel(px: number, py: number): TileType {
    return this.get(Math.floor(px / this.T), Math.floor(py / this.T));
  }

  /** 地表Yを返す（タイル座標） */
  getSurfaceY(tx: number): number {
    for (let y = 0; y < this.H; y++) {
      if (this.get(tx, y) !== TILE.AIR) return y;
    }
    return this.SY;
  }

  /** プレイヤーのスポーン地点（ピクセル） */
  spawnPoint(): { x: number; y: number } {
    const tx = Math.floor(this.W * 0.15);
    const ty = this.getSurfaceY(tx) - 2;
    return { x: tx * this.T + this.T / 2, y: ty * this.T };
  }
}
