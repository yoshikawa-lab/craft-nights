import Phaser from 'phaser';

export const EventBus = new Phaser.Events.EventEmitter();

export const Events = {
    // プレイヤー
    PLAYER_DAMAGED: 'player:damaged',
    PLAYER_DIED: 'player:died',
    PLAYER_HEALED: 'player:healed',
    PLAYER_LEVEL_UP: 'player:levelUp',
    PLAYER_ATTACK: 'player:attack',

    // インベントリ
    INVENTORY_CHANGED: 'inventory:changed',
    HOTBAR_SELECT: 'hotbar:select',
    ITEM_PICKED: 'item:picked',

    // ワールド
    BLOCK_BREAK: 'block:break',
    BLOCK_PLACE: 'block:place',
    CHEST_OPEN: 'chest:open',
    BED_USE: 'bed:use',

    // 昼夜
    DAY_START: 'day:start',
    NIGHT_START: 'night:start',
    SLEEP_START: 'sleep:start',
    SLEEP_END: 'sleep:end',

    // 敵
    ENEMY_SPAWN: 'enemy:spawn',
    ENEMY_DIED: 'enemy:died',
    ENEMY_ATTACK: 'enemy:attack',

    // 羊
    SHEEP_DIED: 'sheep:died',

    // ゲーム
    GAME_OVER: 'game:over',
    GAME_RESTART: 'game:restart',
    SCORE_CHANGED: 'score:changed',

    // クラフト
    CRAFT_SUCCESS: 'craft:success',
    CRAFT_OPEN: 'craft:open',
    CRAFT_CLOSE: 'craft:close',

    // オーディオ
    SFX_PLAY: 'sfx:play',

    // ボス
    BOSS_STOMP:    'boss:stomp',     // {x, y}
    BOSS_CHARGE:   'boss:charge',    // {x, facing}
    BOSS_PHASE2:   'boss:phase2',    // {}
    BOSS_DEFEATED: 'boss:defeated',  // {x, y}

    // スペクタクル
    SPECTACLE_ENTRANCE: 'spectacle:entrance',
    SPECTACLE_ACTION: 'spectacle:action',
    SPECTACLE_HIT: 'spectacle:hit',
    SPECTACLE_COMBO: 'spectacle:combo',
    SPECTACLE_STREAK: 'spectacle:streak',

    // プレイヤーアクション
    PLAYER_DASH:    'player:dash',       // {x, y, dir}

    // キルストリーク
    KILL_STREAK:    'kill:streak',       // {count, multiplier}
    STREAK_RESET:   'streak:reset',

    // 夜生存報酬
    NIGHT_SURVIVED: 'night:survived',   // {day}

    // ゲームポーズ
    GAME_PAUSED:    'game:paused',
    GAME_RESUMED:   'game:resumed',
} as const;

export type EventKey = typeof Events[keyof typeof Events];
