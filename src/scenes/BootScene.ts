import Phaser from 'phaser';
import { GAME, TILE, PALETTE } from '../core/Constants';

/**
 * BootScene
 * - アセットのロード
 * - タイルテクスチャの生成（フォールバック）
 */
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // --- ローディングバー ---
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    const bar = this.add.rectangle(W / 2 - 150, H / 2 - 10, 0, 20, 0x44dd44).setOrigin(0, 0);
    const bg  = this.add.rectangle(W / 2 - 152, H / 2 - 12, 304, 24).setStrokeStyle(1, 0x888888).setOrigin(0, 0).setFillStyle();
    const txt = this.add.text(W / 2, H / 2 + 20, 'Loading...', { fontSize: '12px', color: '#fff' }).setOrigin(0.5, 0);

    this.load.on('progress', (v: number) => {
      bar.setSize(300 * v, 20);
      txt.setText(`Loading... ${Math.floor(v * 100)}%`);
    });

    // --- スプライトシート ---
    // Tiny Dungeon (12×11 フレーム, 16×16 px) — 敵・NPC用
    this.load.spritesheet('dungeon', 'assets/sprites/dungeon.png', { frameWidth: 16, frameHeight: 16 });
    // Kenney Pixel Platformer world tileset (20×9 フレーム, 18×18 px)
    this.load.spritesheet('world', 'assets/sprites/world.png', { frameWidth: 18, frameHeight: 18 });
    // Characters (9×3, 24×24 px)
    this.load.spritesheet('world_chars', 'assets/sprites/world_chars.png', { frameWidth: 24, frameHeight: 24 });

    // --- プレイヤーキャラクター (Kenney Adventurer, 80×110 px 個別ポーズ) ---
    const advBase = 'assets/kenney/kenney_platformer-characters/PNG/Adventurer/Poses/';
    this.load.image('hero_idle',   advBase + 'adventurer_idle.png');
    this.load.image('hero_walk1',  advBase + 'adventurer_walk1.png');
    this.load.image('hero_walk2',  advBase + 'adventurer_walk2.png');
    this.load.image('hero_jump',   advBase + 'adventurer_jump.png');
    this.load.image('hero_hurt',   advBase + 'adventurer_hurt.png');
    this.load.image('hero_action', advBase + 'adventurer_action1.png');
    this.load.image('hero_fall',   advBase + 'adventurer_fall.png');

    // --- 効果音 ---
    const sfx = [
      'jump', 'mine_hit', 'item_pickup', 'item_drop', 'player_hurt',
      'enemy_hit', 'footstep_grass', 'footstep_stone', 'footstep_wood',
      'ui_click', 'ui_open', 'ui_close', 'ui_confirm', 'ui_error', 'ui_select', 'level_up',
    ];
    for (const k of sfx) {
      this.load.audio(`sfx_${k}`, `assets/audio/sfx/${k}.ogg`);
    }
  }

  create() {
    // フォールバック: スプライトシートが無い場合も動くようにプログラム生成テクスチャを作成
    this.createFallbackTextures();
    this.scene.start('TitleScene');
  }

  /**
   * アセットが無くてもゲームが動作するよう、シンプルな色付きテクスチャを生成する。
   * 実際のスプライトシートがある場合は使われない。
   */
  private createFallbackTextures() {
    // タイル色マップ (フォールバック)
    const tileColors: Record<number, number> = {
      0:  0x87ceeb, // AIR
      1:  0x2d8c2d, // GRASS
      2:  0x8b5e3c, // DIRT
      3:  0x777799, // STONE
      4:  0x8b4513, // WOOD_LOG
      5:  0x228b22, // LEAVES
      6:  0x1e90ff, // WATER
      7:  0xdaa520, // SAND
      8:  0xcc4444, // BED
      9:  0xcc8800, // CHEST
      10: 0x885522, // ANCIENT_BRICK
      11: 0xaa8866, // IRON_ORE
      12: 0xff4400, // LAVA
      13: 0xaa6622, // BOX
      14: 0x333333, // COAL_ORE
      15: 0x00ffff, // DIAMOND_ORE
      16: 0xffd700, // GOLD_ORE
      17: 0x00cc44, // EMERALD_ORE
      18: 0xff6600, // FURNACE
    };

    if (!this.textures.exists('tiles_fallback')) {
      const sz  = 16;
      const cols= 19;
      const g   = this.make.graphics({ x: 0, y: 0 });

      for (let i = 0; i < cols; i++) {
        const col = tileColors[i] ?? 0x444444;
        g.fillStyle(col);
        g.fillRect(i * sz, 0, sz, sz);
        g.lineStyle(1, 0x00000033);
        g.strokeRect(i * sz, 0, sz, sz);
      }
      g.generateTexture('tiles_fallback', sz * cols, sz);
      g.destroy();
    }
  }
}
