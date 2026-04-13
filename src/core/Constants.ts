// ============================================================
// CraftNights — Constants.ts
// ============================================================

export const DESIGN_W = 960;
export const DESIGN_H = 540;

export const GAME = {
  WIDTH:            DESIGN_W,
  HEIGHT:           DESIGN_H,
  BG_COLOR:         '#1a1a2e',
  TILE_SIZE:        32,           // 表示サイズ 32x32 (16pxスプライト × 2スケール)
  SPRITE_SIZE:      16,           // スプライトシートの元サイズ
  WORLD_W:          256,          // ワールド横幅（タイル数）
  WORLD_H:          80,           // ワールド縦幅（タイル数）
  SURFACE_Y:        28,           // 地表 Y（タイル座標）
  GRAVITY:          900,
  PIXEL_ART:        true,
} as const;

// ---- タイル種類 ----
export const TILE = {
  AIR:           0,
  GRASS:         1,
  DIRT:          2,
  STONE:         3,
  WOOD_LOG:      4,
  LEAVES:        5,
  WATER:         6,
  SAND:          7,
  BED:           8,
  CHEST:         9,
  ANCIENT_BRICK: 10,
  IRON_ORE:      11,
  LAVA:          12,
  BOX:           13,
  COAL_ORE:      14,
  DIAMOND_ORE:   15,
  GOLD_ORE:      16,
  EMERALD_ORE:   17,
  FURNACE:       18,
} as const;
export type TileType = typeof TILE[keyof typeof TILE];

export const TILE_SOLID: Record<TileType, boolean> = {
  [TILE.AIR]:           false,
  [TILE.GRASS]:         true,
  [TILE.DIRT]:          true,
  [TILE.STONE]:         true,
  [TILE.WOOD_LOG]:      true,
  [TILE.LEAVES]:        false,
  [TILE.WATER]:         false,
  [TILE.SAND]:          true,
  [TILE.BED]:           false,
  [TILE.CHEST]:         true,
  [TILE.ANCIENT_BRICK]: true,
  [TILE.IRON_ORE]:      true,
  [TILE.LAVA]:          false,
  [TILE.BOX]:           true,
  [TILE.COAL_ORE]:      true,
  [TILE.DIAMOND_ORE]:   true,
  [TILE.GOLD_ORE]:      true,
  [TILE.EMERALD_ORE]:   true,
  [TILE.FURNACE]:       true,
};

// 採掘時間 (ms)
export const MINE_TIME: Partial<Record<TileType, number>> = {
  [TILE.GRASS]:         300,
  [TILE.DIRT]:          300,
  [TILE.SAND]:          300,
  [TILE.LEAVES]:        150,
  [TILE.WOOD_LOG]:      600,
  [TILE.STONE]:         900,
  [TILE.BOX]:           500,
  [TILE.BED]:           400,
  [TILE.FURNACE]:       600,
  [TILE.COAL_ORE]:     1100,
  [TILE.IRON_ORE]:     1200,
  [TILE.GOLD_ORE]:     1300,
  [TILE.EMERALD_ORE]:  1400,
  [TILE.DIAMOND_ORE]:  1800,
  [TILE.ANCIENT_BRICK]:3000,
};

// ---- アイテム ----
export const ITEM = {
  WOOD:           'wood',
  STONE:          'stone',
  DIRT:           'dirt',
  COAL:           'coal',
  IRON_ORE:       'iron_ore',
  GOLD:           'gold',
  DIAMOND:        'diamond',
  EMERALD:        'emerald',
  WOOL:           'wool',
  SWORD:          'sword',
  AXE:            'axe',
  PICKAXE:        'pickaxe',
  BOW:            'bow',
  ARROW:          'arrow',
  BED:            'bed',
  BOX:            'box',
  IRON_INGOT:     'iron_ingot',
  GOLD_INGOT:     'gold_ingot',
  IRON_SWORD:     'iron_sword',
  IRON_PICK:      'iron_pick',
  IRON_ARMOR:     'iron_armor',
  DIAMOND_SWORD:  'diamond_sword',
  DIAMOND_PICK:   'diamond_pick',
  DIAMOND_ARMOR:  'diamond_armor',
  GOLD_SWORD:     'gold_sword',
  GOLD_ARMOR:     'gold_armor',
  FURNACE_ITEM:   'furnace_item',
  BUCKET:         'bucket',
  NETHERITE:      'netherite',
  NETHERITE_SWORD:'netherite_sword',
  NETHERITE_ARMOR:'netherite_armor',
  NETHERITE_PICK: 'netherite_pick',
} as const;
export type ItemType = typeof ITEM[keyof typeof ITEM];

// アイテム表示名
export const ITEM_NAME: Record<string, string> = {
  wood: '木材', stone: '石', dirt: '土', coal: '石炭',
  iron_ore: '鉄鉱石', gold: '金鉱石', diamond: 'ダイヤ', emerald: 'エメラルド',
  wool: '羊毛', sword: '石の剣', axe: '石の斧', pickaxe: '石のツルハシ',
  bow: '弓', arrow: '矢×8', bed: 'ベッド', box: '収納箱',
  iron_ingot: '鉄インゴット', gold_ingot: '金インゴット',
  iron_sword: '鉄の剣', iron_pick: '鉄のツルハシ', iron_armor: '鉄の鎧',
  diamond_sword: 'ダイヤの剣', diamond_pick: 'ダイヤのツルハシ', diamond_armor: 'ダイヤの鎧',
  gold_sword: '金の剣', gold_armor: '金の鎧',
  furnace_item: 'かまど', bucket: 'バケツ',
  netherite: 'ネザーライト',
  netherite_sword: 'ネザーライトの剣',
  netherite_armor: 'ネザーライトの鎧',
  netherite_pick: 'ネザーライトのツルハシ',
};

// ---- プレイヤー ----
export const PLAYER = {
  BASE_HP:        100,
  SPEED:          220,
  JUMP_VY:       -620,
  ATTACK_DAMAGE:   15,
  ATTACK_RANGE:    80,
  ATTACK_CD:      400,
  INVULN_MS:      800,
  SIZE_W:          22,   // 32px タイルに合わせたヒットボックス
  SIZE_H:          28,
  HP_PER_LEVEL:    20,
  XP_BASE:          1,
  REACH:            5,       // ブロック採掘リーチ（タイル数）
  ARMOR_DEF: {
    iron_armor:      0.20,
    gold_armor:      0.15,
    diamond_armor:   0.40,
    netherite_armor: 0.60,
  } as Record<string, number>,
} as const;

// ---- 敵 ----
export const ENEMY_DEF = {
  ZOMBIE:  { hp: 100, dmg:  8, speed:  80, xp: 1, w: 22, h: 28, label: 'ゾンビ' },
  SKELETON:{ hp:  80, dmg:  8, speed: 100, xp: 1, w: 22, h: 28, label: 'スケルトン' },
  SPIDER:  { hp:  60, dmg:  6, speed: 140, xp: 1, w: 26, h: 20, label: 'スパイダー' },
  BAT:     { hp:  35, dmg:  4, speed: 160, xp: 1, w: 20, h: 18, label: 'コウモリ' },
  GOLEM:   { hp: 280, dmg: 14, speed:  55, xp: 3, w: 30, h: 38, label: 'ゴーレム' },
  ANCIENT_BOSS: { hp: 2000, dmg: 20, speed: 70, xp: 50, w: 52, h: 62, label: 'ANCIENT BOSS' },
} as const;
export type EnemyKind = keyof typeof ENEMY_DEF;

// ---- ボス ----
export const BOSS = {
  PHASE2_HP:      0.5,
  STOMP_DMG:       30,
  STOMP_RADIUS:     4,
  STOMP_CD:      5000,
  STOMP_CD2:     2800,
  CHARGE_MULT:    3.5,
  CHARGE_DUR:    1200,
  CHARGE_CD:     9000,
} as const;

// ---- 昼夜 ----
export const DAY_NIGHT = {
  DAY_MS:          90_000,
  NIGHT_MS:        60_000,
  SLEEP_MS:        10_000,
  SPAWN_INTERVAL:   4_000,
  MAX_ENEMIES:         18,
  SPAWN_DIST_MIN:     300,
  SPAWN_DIST_MAX:     500,
} as const;

// ---- クラフトレシピ ----
export const CRAFT_RECIPE: Record<string, Record<string, number>> = {
  sword:          { stone: 2,      wood: 1      },
  pickaxe:        { stone: 3,      wood: 2      },
  axe:            { stone: 2,      wood: 2      },
  arrow:          { wood: 1,       stone: 1     },  // 矢×8
  bed:            { wood: 3,       wool: 3      },
  box:            { wood: 5                     },
  furnace_item:   { stone: 8                    },
  iron_sword:     { iron_ore: 3,   wood: 1      },
  iron_pick:      { iron_ore: 3,   wood: 2      },
  iron_armor:     { iron_ingot: 5, stone: 2     },
  diamond_sword:  { diamond: 2,    wood: 1      },
  diamond_pick:   { diamond: 3,    wood: 2      },
  diamond_armor:  { diamond: 5,    wood: 1      },
  gold_sword:     { gold_ingot: 2, wood: 1      },
  gold_armor:     { gold_ingot: 5, wood: 1      },
  bucket:         { iron_ingot: 3               },
  bow:            { wood: 3,       wool: 1      },
  netherite:      { diamond: 4,    iron_ingot: 4},
  netherite_sword:{ netherite: 2,  wood: 1      },
  netherite_pick: { netherite: 3,  wood: 2      },
  netherite_armor:{ netherite: 5,  wood: 1      },
};

// かまどレシピ：素材→精錬結果
export const SMELT_RECIPE: Record<string, { result: ItemType; fuel: string; fuelCount: number }> = {
  iron_ore: { result: ITEM.IRON_INGOT, fuel: 'coal', fuelCount: 1 },
  gold:     { result: ITEM.GOLD_INGOT, fuel: 'coal', fuelCount: 1 },
};

// ---- 武器ダメージ ----
export const WEAPON_DMG: Record<string, number> = {
  sword:           15,
  axe:             12,
  pickaxe:         10,
  bow:             20,
  iron_sword:      17,
  diamond_sword:   35,
  gold_sword:      25,
  netherite_sword: 55,
};

// ---- 採掘ボーナス（ツルハシ種別） ----
export const PICK_BONUS: Record<string, number> = {
  pickaxe:     0.5,   // 50%速度アップ
  iron_pick:   0.7,
  diamond_pick:0.9,
  netherite_pick: 1.0,
};

// ---- UI ----
export const UI = {
  HOTBAR_SLOTS:    9,
  SLOT_SIZE:       44,
  PADDING:          6,
  FONT:            '"Helvetica Neue","Hiragino Sans","Arial",sans-serif',
} as const;

// ---- Tiny Dungeon スプライト位置 (tilemap_packed.png 12×11, 16×16px) ----
// col + row*12 = フレームインデックス
export const DUNGEON_FRAME = {
  // row0: 地面/壁タイル (0-11)
  FLOOR_DARK:      0,
  FLOOR_LIGHT:     1,
  WALL_MID:        2,
  WALL_TOP:        3,
  WALL_SIDE:       4,
  STAIRS_DOWN:     5,
  STAIRS_UP:       6,
  DOOR_CLOSED:     7,
  DOOR_OPEN:       8,
  CHEST_CLOSED:    9,
  CHEST_OPEN:     10,
  TRAP:           11,
  // row1: 環境 (12-23)
  CRATE:          12,
  BARREL:         13,
  TORCH:          14,
  SIGN:           15,
  BOOK:           16,
  SKULL:          17,
  // row2: ヒーロー (24-35)
  HERO_IDLE:      24,
  HERO_WALK:      25,
  HERO_SWORD:     26,
  HERO_BOW:       27,
  HERO_JUMP:      28,
  HERO_HURT:      29,
  WIZARD_IDLE:    30,
  WIZARD_WALK:    31,
  WIZARD_CAST:    32,
  ROGUE_IDLE:     33,
  ROGUE_WALK:     34,
  ROGUE_ATTACK:   35,
  // row3: ヒーロー続き (36-47)
  KNIGHT_IDLE:    36,
  KNIGHT_WALK:    37,
  KNIGHT_ATTACK:  38,
  // row4: 敵 (48-59)
  ZOMBIE_IDLE:    48,
  ZOMBIE_WALK:    49,
  ZOMBIE_ATTACK:  50,
  SKELETON_IDLE:  51,
  SKELETON_WALK:  52,
  SKELETON_ATTACK:53,
  SPIDER_IDLE:    54,
  SPIDER_WALK:    55,
  BAT_FLY:        56,
  BAT_FLY2:       57,
  GHOST_IDLE:     58,
  GHOST_MOVE:     59,
  // row5: ボス・強敵 (60-71)
  GOLEM_IDLE:     60,
  GOLEM_WALK:     61,
  GOLEM_ATTACK:   62,
  BOSS_IDLE:      63,
  BOSS_WALK:      64,
  BOSS_ATTACK:    65,
  // row6: アイテム (72-83)
  POTION_RED:     72,
  POTION_BLUE:    73,
  COIN_GOLD:      74,
  GEM_BLUE:       75,
  GEM_GREEN:      76,
  GEM_RED:        77,
  KEY:            78,
  SCROLL:         79,
  SWORD_ITEM:     80,
  SHIELD_ITEM:    81,
  BOW_ITEM:       82,
  ARROW_ITEM:     83,
  // row7: アイテム続き (84-95)
  ARMOR_ITEM:     84,
  HELMET_ITEM:    85,
  PICK_ITEM:      86,
  AXE_ITEM:       87,
  // row8: NPC (96-107)
  VILLAGER_IDLE:  96,
  VILLAGER_WALK:  97,
  SHEEP_IDLE:     98,
  SHEEP_WALK:     99,
} as const;

// ---- カラーパレット ----
export const PALETTE = {
  SKY_DAY_TOP:    0x87ceeb,
  SKY_DAY_BOT:    0xb0e0ff,
  SKY_NIGHT_TOP:  0x0a0a1e,
  SKY_NIGHT_BOT:  0x1a1a3e,
  UI_BG:          0x1a1a1a,
  UI_BORDER:      0x555555,
  UI_SLOT:        0x2a2a2a,
  UI_SELECTED:    0xffdd44,
  HP_FILL:        0x44dd44,
  HP_BG:          0x333333,
  XP_FILL:        0x4488ff,
  BOSS_FILL:      0xaa0000,
  TEXT_WHITE:     '#ffffff',
  TEXT_YELLOW:    '#ffdd44',
  TEXT_RED:       '#ff4444',
  TEXT_GREEN:     '#44dd44',
  TEXT_GRAY:      '#aaaaaa',
  TEXT_CYAN:      '#44ffff',
} as const;

// ---- クリティカル ----
export const CRIT = {
  CHANCE:     0.15,
  MULT:       1.8,
  SWORD_BONUS:0.05,
} as const;

// ---- ダッシュ ----
export const DASH = {
  SPEED:      420,
  DUR_MS:     140,
  CD_MS:     1800,
  IFRAMES_MS: 160,
  DBL_TAP_MS: 240,
} as const;

// ---- HP自動回復 ----
export const REGEN = {
  SAFE_MS:   5000,
  RATE:         2,
  MAX_RATIO:  0.35,
} as const;

// ---- エリート敵 ----
export const ELITE = {
  CHANCE:   0.12,
  HP_MULT:   2.5,
  DMG_MULT:  1.5,
  XP_MULT:     3,
} as const;
