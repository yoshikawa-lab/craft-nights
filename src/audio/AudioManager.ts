import Phaser from 'phaser';

// ============================================================
// AudioManager — 効果音の一元管理
// ============================================================

const SFX_MAP: Record<string, string> = {
  jump:           'sfx_jump',
  mine_hit:       'sfx_mine_hit',
  item_pickup:    'sfx_item_pickup',
  item_drop:      'sfx_item_drop',
  player_hurt:    'sfx_player_hurt',
  enemy_hit:      'sfx_enemy_hit',
  footstep_grass: 'sfx_footstep_grass',
  footstep_stone: 'sfx_footstep_stone',
  footstep_wood:  'sfx_footstep_wood',
  ui_click:       'sfx_ui_click',
  ui_open:        'sfx_ui_open',
  ui_close:       'sfx_ui_close',
  ui_confirm:     'sfx_ui_confirm',
  ui_error:       'sfx_ui_error',
  ui_select:      'sfx_ui_select',
  level_up:       'sfx_level_up',
};

export class AudioManager {
  private scene: Phaser.Scene;
  private muted = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(key: string, volume = 0.5) {
    if (this.muted) return;
    const k = SFX_MAP[key] ?? key;
    if (this.scene.cache.audio.has(k)) {
      this.scene.sound.play(k, { volume });
    }
  }

  toggleMute() { this.muted = !this.muted; }
  get isMuted() { return this.muted; }
}
