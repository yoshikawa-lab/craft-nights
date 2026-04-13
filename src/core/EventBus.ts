import Phaser from 'phaser';

// ============================================================
// EventBus — シーン間通信の唯一の窓口
// ============================================================
export const EventBus = new Phaser.Events.EventEmitter();

export const EV = {
  // Player
  PLAYER_DAMAGED:     'player:damaged',
  PLAYER_HEALED:      'player:healed',
  PLAYER_DIED:        'player:died',
  PLAYER_LEVEL_UP:    'player:levelup',
  PLAYER_MOVED:       'player:moved',

  // Mining / Placing
  TILE_MINED:         'tile:mined',
  TILE_PLACED:        'tile:placed',
  ITEM_DROPPED:       'item:dropped',
  ITEM_PICKED_UP:     'item:pickedup',

  // Combat
  ENEMY_DIED:         'enemy:died',
  ENEMY_SPAWNED:      'enemy:spawned',

  // Inventory / Hotbar
  HOTBAR_SELECT:      'hotbar:select',
  INVENTORY_CHANGED:  'inventory:changed',
  ITEM_CRAFTED:       'item:crafted',
  ITEM_SMELTED:       'item:smelted',

  // Day/Night
  DAY_START:          'day:start',
  NIGHT_START:        'night:start',
  SLEEP_START:        'sleep:start',
  SLEEP_END:          'sleep:end',

  // UI
  UI_OPEN:            'ui:open',
  UI_CLOSE:           'ui:close',
  SHOW_TOAST:         'ui:toast',

  // Scene
  GAME_OVER:          'game:over',
  GAME_RESTART:       'game:restart',
} as const;
