// ============================
// CraftNights — Constants.ts
// ALL magic numbers live here
// ============================

export const DPR = Math.min(window.devicePixelRatio || 1, 2);
const _designW = 960;
const _designH = 540;
const _deviceW = window.innerWidth * DPR;
const _deviceH = window.innerHeight * DPR;
const _designAspect = _designW / _designH;
let _canvasW: number, _canvasH: number;
if (_deviceW / _deviceH > _designAspect) {
    _canvasW = Math.round(_deviceH * _designAspect);
    _canvasH = _deviceH;
} else {
    _canvasW = _deviceW;
    _canvasH = Math.round(_deviceW / _designAspect);
}
export const PX = _canvasW / _designW;

export const GAME = {
    WIDTH: _canvasW,
    HEIGHT: _canvasH,
    BACKGROUND_COLOR: '#5ec8e5',
    TILE_SIZE: 32 as number,
    WORLD_TILES_W: 256 as number,
    WORLD_TILES_H: 80 as number,
    SURFACE_Y: 38 as number,
};

// タイルピクセルサイズ（整数保証）
export const TILE_PX = Math.round(GAME.TILE_SIZE * PX);

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
    ANCIENT_BRICK: 10,  // 古代都市の壁（とても硬い）
    ORE:           11,  // 鉄鉱石（鉄鉱石アイテムをドロップ）
    LAVA:          12,  // 溶岩（接触でダメージ）
    BOX:           13,  // アイテムボックス（設置型収納）
    COAL_ORE:      14,  // 石炭鉱石
    DIAMOND_ORE:   15,  // ダイヤ鉱石（深部のみ）
    GOLD_ORE:      16,  // 金鉱石
    EMERALD_ORE:   17,  // エメラルド鉱石（村周辺）
    FURNACE:       18,  // かまど（設置型）
} as const;
export type TileType = typeof TILE[keyof typeof TILE];

// タイルが固体かどうか（衝突判定）
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
    [TILE.ORE]:           true,
    [TILE.LAVA]:          false,
    [TILE.BOX]:           true,
    [TILE.COAL_ORE]:      true,
    [TILE.DIAMOND_ORE]:   true,
    [TILE.GOLD_ORE]:      true,
    [TILE.EMERALD_ORE]:   true,
    [TILE.FURNACE]:       true,
};

// ---- アイテム種類 ----
export const ITEM = {
    WOOD:           'wood',
    STONE:          'stone',
    WOOL:           'wool',
    SWORD:          'sword',
    AXE:            'axe',
    PICKAXE:        'pickaxe',
    BOW:            'bow',
    ARROW:          'arrow',
    BED:            'bed',
    DIRT:           'dirt',
    GRASS:          'grass',
    IRON_ORE:       'iron_ore',       // 鉄鉱石（鉱山・古代都市で入手）
    BOX:            'box',            // アイテムボックス（設置型収納）
    COAL:           'coal',
    DIAMOND:        'diamond',
    EMERALD:        'emerald',
    GOLD:           'gold',
    IRON_INGOT:     'iron_ingot',     // 鉄インゴット（かまどで精錬）
    GOLD_INGOT:     'gold_ingot',     // 金インゴット（かまどで精錬）
    IRON_ARMOR:     'iron_armor',     // 防具（20%ダメージ軽減）
    DIAMOND_ARMOR:  'diamond_armor',  // 防具（40%軽減）
    GOLD_ARMOR:     'gold_armor',     // 防具（15%軽減、速度+10%）
    IRON_SWORD:     'iron_sword',     // 鉄の剣（ダメージ17）
    IRON_PICK:          'iron_pick',          // 鉄のツルハシ（採掘速度+）
    DIAMOND_SWORD:      'diamond_sword',      // ダメージ35
    DIAMOND_PICK:       'diamond_pick',       // 全ブロック即採掘
    GOLD_SWORD:         'gold_sword',         // ダメージ25
    FURNACE_ITEM:       'furnace_item',       // かまどアイテム（設置用）
    BUCKET:             'bucket',             // バケツ（水/溶岩を汲める）
    NETHERITE:          'netherite',          // ネザーライト（最強素材）
    NETHERITE_SWORD:    'netherite_sword',    // ネザーライトの剣（ダメージ55）
    NETHERITE_ARMOR:    'netherite_armor',    // ネザーライトの鎧（60%軽減）
    NETHERITE_PICK:     'netherite_pick',     // ネザーライトのツルハシ（最速採掘）
    NETHERITE_BLOCK:    'netherite_block',    // ネザーライトブロック（装飾/建築）
} as const;
export type ItemType = typeof ITEM[keyof typeof ITEM];

// ---- プレイヤー ----
export const PLAYER = {
    BASE_MAX_HP:        100,
    SPEED:              160,         // 水平速度 px/s (設計)
    JUMP_FORCE:        -480,         // ジャンプ初速度 (設計、負=上方向)
    GRAVITY:            700,         // 重力加速度 (設計)
    ATTACK_DAMAGE_BASE:  15,
    ATTACK_RANGE:        52,         // 攻撃範囲 (設計px)
    ATTACK_COOLDOWN:    400,         // ms
    INVULNERABLE_MS:    800,
    SIZE_W:              24,         // 横サイズ (設計px)
    SIZE_H:              30,         // 縦サイズ (設計px)
    HP_PER_LEVEL:        20,
    XP_PER_LEVEL_BASE:    1,
    REACH_TILES:          4,         // ブロック破壊リーチ (タイル数)
    ARMOR_DEFENSE: {
        iron_armor:       0.20,
        gold_armor:       0.15,
        diamond_armor:    0.40,
        netherite_armor:  0.60,
    } as Record<string, number>,
} as const;

// ---- 敵 ----
export const ENEMY_TYPES = {
    ZOMBIE: {
        hp: 100, damage: 8, speed: 55, xp: 1, size: 26,
        color: 0x3a7a3a, eyeColor: 0xff0000, label: 'ゾンビ',
    },
    SKELETON: {
        hp: 80, damage: 8, speed: 75, xp: 1, size: 24,
        color: 0xd4d4c8, eyeColor: 0x000080, label: 'スケルトン',
    },
    SPIDER: {
        hp: 60, damage: 6, speed: 100, xp: 1, size: 22,
        color: 0x222222, eyeColor: 0xff3300, label: 'スパイダー',
    },
    BAT: {
        hp: 35, damage: 4, speed: 130, xp: 1, size: 18,
        color: 0x5522aa, eyeColor: 0xff2200, label: 'コウモリ',
    },
    GOLEM: {
        hp: 280, damage: 14, speed: 38, xp: 3, size: 32,
        color: 0x4a5a6a, eyeColor: 0x00ffaa, label: 'ゴーレム',
    },
    ANCIENT_BOSS: {
        hp: 2000, damage: 20, speed: 50, xp: 50, size: 56,
        color: 0x220033, eyeColor: 0xff6600, label: 'ANCIENT BOSS',
    },
} as const;
export type EnemyKind = keyof typeof ENEMY_TYPES;

// ---- ボス ----
export const BOSS = {
    PHASE2_HP_RATIO:      0.5,    // 残HP比でフェーズ2開始
    STOMP_DAMAGE:          30,    // 踏みつけダメージ
    STOMP_RADIUS_TILES:     4,    // 踏みつけ範囲（タイル数）
    STOMP_INTERVAL_MS:   5000,    // フェーズ1 踏みつけ間隔
    STOMP_INTERVAL2_MS:  2800,    // フェーズ2 踏みつけ間隔
    CHARGE_SPEED_MULT:    3.5,    // 突進速度倍率
    CHARGE_DURATION_MS:  1200,    // 突進持続時間
    CHARGE_INTERVAL_MS:  9000,    // 突進間隔
    ATTACK_RANGE_TILES:     2,    // 通常攻撃範囲
} as const;

// ---- 羊 ----
export const SHEEP = {
    HP: 40, SPEED: 50, SIZE_W: 30, SIZE_H: 22,
    COLOR: 0xf0f0f0, WOOL_DROP: 1, FLEE_RANGE: 100,
} as const;

// ---- 昼夜サイクル ----
export const DAY_NIGHT = {
    DAY_DURATION_MS:        90_000,
    NIGHT_DURATION_MS:      60_000,
    SLEEP_DURATION_MS:      10_000,
    ENEMY_SPAWN_INTERVAL:    4_000,
    MAX_ENEMIES:                18,
    ENEMY_SPAWN_RADIUS_MIN:    300,
    ENEMY_SPAWN_RADIUS_MAX:    500,
} as const;

// ---- クラフト ----
export const CRAFT = {
    BED:            { wood: 3,       wool: 3       },  // ベッド
    ARROW8:         { wood: 1,       stone: 1      },  // 矢×8
    SWORD:          { stone: 2,      wood: 1       },  // 石の剣
    PICKAXE:        { stone: 3,      wood: 2       },  // 石のツルハシ
    AXE:            { stone: 2,      wood: 2       },  // 石の斧
    IRON_SWORD:     { iron_ore: 3,   wood: 1       },  // 鉄の剣（高ダメージ）
    IRON_PICK:      { iron_ore: 3,   wood: 2       },  // 鉄のツルハシ（古代レンガを掘れる）
    BOX:            { wood: 5,       stone: 0      },  // アイテムボックス
    FURNACE:        { stone: 8,      wood: 0       },  // かまど
    IRON_ARMOR:     { iron_ingot: 5, stone: 2      },  // 鉄の鎧
    DIAMOND_SWORD:  { diamond: 2,    wood: 1       },  // ダイヤの剣
    DIAMOND_PICK:   { diamond: 3,    wood: 2       },  // ダイヤのツルハシ
    DIAMOND_ARMOR:  { diamond: 5,    wood: 1       },  // ダイヤの鎧
    GOLD_SWORD:         { gold_ingot: 2,  wood: 1       },  // 金の剣
    GOLD_ARMOR:         { gold_ingot: 5,  wood: 1       },  // 金の鎧
    BUCKET:             { iron_ingot: 3,  wood: 0       },  // バケツ
    NETHERITE:          { diamond: 4,     iron_ingot: 4 },  // ネザーライト精製
    NETHERITE_SWORD:    { netherite: 2,   wood: 1       },  // ネザーライトの剣
    NETHERITE_PICK:     { netherite: 3,   wood: 2       },  // ネザーライトのツルハシ
    NETHERITE_ARMOR:    { netherite: 5,   wood: 1       },  // ネザーライトの鎧
    NETHERITE_BLOCK:    { netherite: 9,   wood: 0       },  // ネザーライトブロック
} as const;

// ---- ボーナスチェスト ----
export const BONUS_CHEST = {
    SWORD_DAMAGE: 15, AXE_DAMAGE: 12, PICKAXE_DAMAGE: 10,
    BOW_DAMAGE: 20, ARROW_COUNT: 64,
} as const;

// ---- UI ----
export const UI = {
    HOTBAR_SLOTS: 9,
    SLOT_SIZE: 44,          // 40 → 44 (タップしやすく)
    PADDING: 6,
    HP_BAR_W: 190,
    HP_BAR_H: 15,
    BOSS_BAR_W: 360,
    BOSS_BAR_H: 18,
    FONT_FAMILY: '"Helvetica Neue", "Hiragino Sans", "Arial", sans-serif',
} as const;

// ---- カラーパレット ----
export const PALETTE = {
    SKY_DAY_TOP:   0x5ec8e5,
    SKY_DAY_BOT:   0x87ceeb,
    SKY_NIGHT_TOP: 0x0a0a1e,
    SKY_NIGHT_BOT: 0x1a1a3e,
    // タイル
    TILE_GRASS:         0x5cb85c,
    TILE_GRASS_TOP:     0x48a248,
    TILE_DIRT:          0x9B6B3C,
    TILE_STONE:         0x888888,
    TILE_WOOD:          0x9B7010,
    TILE_LEAVES:        0x228B22,
    TILE_WATER:         0x2299ee,
    TILE_SAND:          0xe8d89a,
    TILE_BED:           0xcc4444,
    TILE_CHEST:         0xd4a017,
    TILE_ANCIENT_BRICK: 0x3a2a4a,  // 暗紫のれんが
    TILE_ORE:           0x888866,  // 石+金属光沢
    TILE_LAVA:          0xff4400,  // 溶岩
    TILE_BOX:           0xA0522D,  // アイテムボックス（シエナブラウン）
    TILE_COAL_ORE:      0x333344,  // 石炭鉱石
    TILE_DIAMOND_ORE:   0x44ddff,  // ダイヤ鉱石
    TILE_GOLD_ORE:      0xffcc00,  // 金鉱石
    TILE_EMERALD_ORE:   0x44ee66,  // エメラルド鉱石
    TILE_FURNACE:       0x554433,  // かまど
    // UI
    UI_BG:          0x1a1a1a,
    UI_BORDER:      0x555555,
    UI_SLOT:        0x333333,
    UI_SLOT_SELECT: 0xffdd44,
    HP_BAR_FILL:    0x44dd44,
    HP_BAR_BG:      0x333333,
    XP_BAR_FILL:    0x4488ff,
    BOSS_BAR_FILL:  0xaa0000,
    BOSS_BAR_BG:    0x330000,
    // テキスト
    TEXT_WHITE:  '#ffffff',
    TEXT_YELLOW: '#ffdd44',
    TEXT_RED:    '#ff4444',
    TEXT_GREEN:  '#44dd44',
    TEXT_GRAY:   '#aaaaaa',
    TEXT_CYAN:   '#44ffff',
    TEXT_PURPLE: '#cc44ff',
    // エフェクト
    ACCENT:        0xffcc00,
    NIGHT_OVERLAY: 0x000033,
} as const;

// ---- クリティカルヒット ----
export const CRIT = {
    CHANCE:        0.15,   // 15% 基本クリティカル率
    MULTIPLIER:    1.8,    // ダメージ倍率
    SWORD_BONUS:   0.05,   // 剣系武器 +5% クリット率
} as const;

// ---- ダッシュ/回避 ----
export const DASH = {
    SPEED:          420,   // ダッシュ速度 px/s（設計値）
    DURATION_MS:    140,   // ダッシュ持続時間
    COOLDOWN_MS:   1800,   // クールダウン
    IFRAMES_MS:     160,   // 無敵フレーム時間
    DBL_TAP_MS:     240,   // ダブルタップ判定ウィンドウ
} as const;

// ---- HP自動回復 ----
export const REGEN = {
    SAFE_TIME_MS:  5000,   // 被弾なし→回復開始まで
    RATE_PER_SEC:     2,   // 毎秒回復量
    MAX_RATIO:      0.35,  // 最大回復 HP比（35%まで）
} as const;

// ---- エリート敵 ----
export const ELITE = {
    SPAWN_CHANCE: 0.12,    // 12% でエリート出現
    HP_MULT:        2.5,   // HP倍率
    DMG_MULT:       1.5,   // ダメージ倍率
    XP_MULT:        3,     // XP倍率
    DROP_BONUS:     2,     // ドロップ追加個数
} as const;

// ---- ゲームパッド ----
export const GAMEPAD = {
    DEADZONE:      0.2,
    ATTACK_BTN:    0,  // A/Cross
    JUMP_BTN:      1,  // B/Circle
    INTERACT_BTN:  2,  // X/Square
    CRAFT_BTN:     3,  // Y/Triangle
} as const;

// ---- タッチ ----
export const TOUCH = {
    JOYSTICK_SIZE:       68,   // 60 → 68 (大きく)
    JOYSTICK_THUMB_SIZE: 30,
    JOYSTICK_ALPHA:      0.50,
    BTN_SIZE:            56,   // 52 → 56 (大きく)
    BTN_ALPHA:           0.65,
} as const;

// ---- Safe Zone ----
function _readSafeInsets() {
    const s = getComputedStyle(document.documentElement);
    const top    = parseInt(s.getPropertyValue('--ogp-safe-top-inset'))    || 0;
    const bottom = parseInt(s.getPropertyValue('--ogp-safe-bottom-inset')) || 0;
    return { top: top * DPR, bottom: bottom * DPR };
}
const _insets = _readSafeInsets();
export const SAFE_ZONE = {
    TOP:    Math.max(GAME.HEIGHT * 0.04, _insets.top),
    BOTTOM: _insets.bottom,
} as const;
