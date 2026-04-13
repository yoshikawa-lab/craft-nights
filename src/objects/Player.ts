import Phaser from 'phaser';
import {
  PLAYER, GAME, TILE, TILE_SOLID, MINE_TIME, TileType,
  DUNGEON_FRAME, WEAPON_DMG, PICK_BONUS, CRIT, DASH,
  REGEN, ITEM, PALETTE, ItemType,
} from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';
import type { WorldMap } from '../systems/WorldMap';
import type { AudioManager } from '../audio/AudioManager';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private world: WorldMap;
  private audio: AudioManager;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  // 採掘
  private mineTarget: { tx: number; ty: number } | null = null;
  private mineTimer = 0;
  private mineBar: Phaser.GameObjects.Graphics;

  // 戦闘
  private attackCd = 0;
  private invulnTimer = 0;
  private combo = 0;
  private comboTimer = 0;

  // ダッシュ
  private dashCd = 0;
  private dashTimer = 0;
  private isDashing = false;
  private dashDir = 1;

  // HP自動回復
  private safeTimer = 0;
  private regenTimer = 0;

  // フットステップ
  private footTimer = 0;

  // アニメ状態
  private prevVelX = 0;
  private jumpPressed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: WorldMap,
    audio: AudioManager,
  ) {
    // Kenney Adventurer を使用 (80×110 px, scale 0.4 → 32×44 visual)
    super(scene, x, y, 'hero_idle', 0);
    this.world = world;
    this.audio = audio;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER.SIZE_W, PLAYER.SIZE_H);
    // hitbox をキャラの足元に合わせる (frame: 80×110px, scale: 0.4 → 32×44px)
    // offsetX: 水平中央揃え, offsetY: 110px の高さ方向で足元に合わせる
    body.setOffset((80 * 0.4 - PLAYER.SIZE_W) / 2, 110 * 0.4 - PLAYER.SIZE_H);
    body.setGravityY(100); // 追加重力 (GAME.GRAVITY=900 で合計1000)
    body.setMaxVelocityY(600);
    body.setCollideWorldBounds(false);

    this.setDepth(20);
    this.setScale(0.4); // 80*0.4=32px, 110*0.4=44px

    // アニメ定義
    this.buildAnimations();

    // 入力
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = {
      W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      E: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      Q: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      SHIFT: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      SPACE: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };

    this.mineBar = scene.add.graphics().setDepth(25);
  }

  private buildAnimations() {
    const sc = this.scene;
    // Kenney Adventurer: 各ポーズが独立したテクスチャキー
    if (!sc.anims.exists('hero_idle'))
      sc.anims.create({ key: 'hero_idle',  frames: [{ key: 'hero_idle',   frame: 0 }], frameRate: 4,  repeat: -1 });
    if (!sc.anims.exists('hero_walk'))
      sc.anims.create({ key: 'hero_walk',  frames: [{ key: 'hero_walk1',  frame: 0 }, { key: 'hero_walk2', frame: 0 }], frameRate: 8, repeat: -1 });
    if (!sc.anims.exists('hero_jump'))
      sc.anims.create({ key: 'hero_jump',  frames: [{ key: 'hero_jump',   frame: 0 }], frameRate: 4,  repeat: 0 });
    if (!sc.anims.exists('hero_fall'))
      sc.anims.create({ key: 'hero_fall',  frames: [{ key: 'hero_fall',   frame: 0 }], frameRate: 4,  repeat: -1 });
    if (!sc.anims.exists('hero_hurt'))
      sc.anims.create({ key: 'hero_hurt',  frames: [{ key: 'hero_hurt',   frame: 0 }], frameRate: 4,  repeat: 0 });
    if (!sc.anims.exists('hero_sword'))
      sc.anims.create({ key: 'hero_sword', frames: [{ key: 'hero_action', frame: 0 }], frameRate: 10, repeat: 0 });
    if (!sc.anims.exists('hero_bow'))
      sc.anims.create({ key: 'hero_bow',   frames: [{ key: 'hero_action', frame: 0 }], frameRate: 6,  repeat: 0 });
  }

  // タイル直下にソリッドブロックがあるか確認（Physicsのblocked.downはリセットされるため直接チェック）
  private isOnGround(): boolean {
    const ts   = GAME.TILE_SIZE;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const bx   = body.x;
    const bw   = body.width;
    const by   = body.y + body.height + 2;
    const tx1  = Math.floor(bx / ts);
    const tx2  = Math.floor((bx + bw - 1) / ts);
    const ty   = Math.floor(by / ts);
    for (let tx = tx1; tx <= tx2; tx++) {
      if (TILE_SOLID[this.world.get(tx, ty)]) return true;
    }
    return false;
  }

  // ============================================================
  update(delta: number, pointer: Phaser.Input.Pointer) {
    const body  = this.body as Phaser.Physics.Arcade.Body;
    const onGnd = this.isOnGround();

    this.attackCd   -= delta;
    this.invulnTimer -= delta;
    this.dashCd     -= delta;
    this.comboTimer  -= delta;
    this.footTimer   -= delta;
    if (this.comboTimer <= 0) this.combo = 0;

    // ---- ダッシュ ----
    if (this.isDashing) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        body.setVelocityX(0);
      } else {
        body.setVelocityX(this.dashDir * DASH.SPEED);
        return; // ダッシュ中は他操作無効
      }
    }

    // ---- 移動 ----
    const left  = this.cursors.left.isDown  || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;

    if (left) {
      body.setVelocityX(-PLAYER.SPEED);
      this.setFlipX(true);
    } else if (right) {
      body.setVelocityX(PLAYER.SPEED);
      this.setFlipX(false);
    } else {
      body.setVelocityX(body.velocity.x * 0.8);
    }

    // ---- ジャンプ ----
    const jumpDown = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;
    if (jumpDown && !this.jumpPressed && onGnd) {
      body.setVelocityY(PLAYER.JUMP_VY);
      this.audio.play('jump');
      this.play('hero_jump', true);
    }
    this.jumpPressed = jumpDown;

    // ---- ダッシュ発動 (Shift + 方向) ----
    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) && this.dashCd <= 0) {
      this.dashDir    = left ? -1 : 1;
      this.dashTimer  = DASH.DUR_MS;
      this.dashCd     = DASH.CD_MS;
      this.isDashing  = true;
      this.invulnTimer = DASH.IFRAMES_MS;
    }

    // ---- フットステップ ----
    if (onGnd && Math.abs(body.velocity.x) > 20 && this.footTimer <= 0) {
      this.footTimer = 300;
      const tx = Math.floor(this.x / GAME.TILE_SIZE);
      const ty = Math.floor((this.y + PLAYER.SIZE_H / 2 + 2) / GAME.TILE_SIZE);
      const under = this.world.get(tx, ty);
      const sfx = under === TILE.GRASS ? 'footstep_grass'
                : under === TILE.STONE || under === TILE.ANCIENT_BRICK ? 'footstep_stone'
                : under === TILE.WOOD_LOG ? 'footstep_wood'
                : 'footstep_grass';
      this.audio.play(sfx, 0.3);
    }

    // ---- 採掘 / ブロック設置 (マウス) ----
    if (pointer.isDown && pointer.leftButtonDown()) {
      this.handleMining(delta, pointer);
    } else {
      this.stopMining();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) || pointer.rightButtonDown()) {
      this.handlePlaceBlock(pointer);
    }

    // ---- 攻撃 ----
    if (pointer.leftButtonDown() && this.attackCd <= 0) {
      this.tryMeleeAttack();
    }

    // ---- 回復 ----
    this.updateRegen(delta);

    // ---- アニメーション ----
    this.updateAnimation(onGnd, body.velocity.x);
    this.prevVelX = body.velocity.x;
  }

  // ---- 採掘 ----
  private handleMining(delta: number, pointer: Phaser.Input.Pointer) {
    const cam  = this.scene.cameras.main;
    const wx   = pointer.worldX;
    const wy   = pointer.worldY;
    const tx   = Math.floor(wx / GAME.TILE_SIZE);
    const ty   = Math.floor(wy / GAME.TILE_SIZE);
    const dist = Phaser.Math.Distance.Between(
      this.x, this.y,
      (tx + 0.5) * GAME.TILE_SIZE, (ty + 0.5) * GAME.TILE_SIZE,
    ) / GAME.TILE_SIZE;

    if (dist > PLAYER.REACH) { this.stopMining(); return; }

    const tile = this.world.get(tx, ty);
    if (tile === TILE.AIR || tile === TILE.WATER || tile === TILE.LAVA) {
      this.stopMining(); return;
    }

    const baseTime = MINE_TIME[tile] ?? 500;
    // ツルハシボーナス
    const weapon = GameState.selectedItem();
    const bonus  = weapon ? (PICK_BONUS[weapon] ?? 0) : 0;
    const mineMs = baseTime / (1 + bonus);

    if (!this.mineTarget || this.mineTarget.tx !== tx || this.mineTarget.ty !== ty) {
      this.mineTarget = { tx, ty };
      this.mineTimer  = 0;
    }

    this.mineTimer += delta;
    this.drawMineBar(tx, ty, this.mineTimer / mineMs);

    if (this.mineTimer >= mineMs) {
      this.breakTile(tx, ty, tile);
      this.mineTarget = null;
      this.mineTimer  = 0;
    }
    this.audio.play('mine_hit', 0.2);
  }

  private stopMining() {
    this.mineTarget = null;
    this.mineTimer  = 0;
    this.mineBar.clear();
  }

  private drawMineBar(tx: number, ty: number, ratio: number) {
    const g  = this.mineBar;
    const px = tx * GAME.TILE_SIZE;
    const py = ty * GAME.TILE_SIZE + GAME.TILE_SIZE - 3;
    g.clear();
    g.fillStyle(0x000000, 0.5);
    g.fillRect(px, py, GAME.TILE_SIZE, 3);
    g.fillStyle(0xffdd44);
    g.fillRect(px, py, GAME.TILE_SIZE * Math.min(1, ratio), 3);
  }

  private breakTile(tx: number, ty: number, tile: TileType) {
    this.world.set(tx, ty, TILE.AIR);
    // ドロップ
    const drops = this.tileDrops(tile);
    EventBus.emit(EV.TILE_MINED, { tx, ty, tile, drops });
    this.audio.play('mine_hit', 0.5);
  }

  private tileDrops(tile: TileType): { item: ItemType; count: number }[] {
    const map: Partial<Record<TileType, { item: ItemType; count: number }[]>> = {
      [TILE.GRASS]:        [{ item: ITEM.DIRT,     count: 1 }],
      [TILE.DIRT]:         [{ item: ITEM.DIRT,     count: 1 }],
      [TILE.SAND]:         [{ item: ITEM.DIRT,     count: 1 }],
      [TILE.STONE]:        [{ item: ITEM.STONE,    count: 1 }],
      [TILE.WOOD_LOG]:     [{ item: ITEM.WOOD,     count: 1 }],
      [TILE.LEAVES]:       [],
      [TILE.COAL_ORE]:     [{ item: ITEM.COAL,     count: 1 }],
      [TILE.IRON_ORE]:     [{ item: ITEM.IRON_ORE, count: 1 }],
      [TILE.GOLD_ORE]:     [{ item: ITEM.GOLD,     count: 1 }],
      [TILE.DIAMOND_ORE]:  [{ item: ITEM.DIAMOND,  count: 1 }],
      [TILE.EMERALD_ORE]:  [{ item: ITEM.EMERALD,  count: 1 }],
      [TILE.ANCIENT_BRICK]:[{ item: ITEM.STONE,    count: 1 }],
      [TILE.BED]:          [{ item: ITEM.BED,      count: 1 }],
      [TILE.CHEST]:        [{ item: ITEM.BOX,      count: 1 }],
      [TILE.FURNACE]:      [{ item: ITEM.FURNACE_ITEM, count: 1 }],
      [TILE.BOX]:          [{ item: ITEM.BOX,      count: 1 }],
    };
    return map[tile] ?? [];
  }

  // ---- ブロック設置 ----
  private handlePlaceBlock(pointer: Phaser.Input.Pointer) {
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    const tx = Math.floor(wx / GAME.TILE_SIZE);
    const ty = Math.floor(wy / GAME.TILE_SIZE);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, wx, wy) / GAME.TILE_SIZE;
    if (dist > PLAYER.REACH) return;
    if (this.world.get(tx, ty) !== TILE.AIR) return;

    const item = GameState.selectedItem();
    if (!item) return;

    const tileToPLace = this.itemToTile(item);
    if (tileToPLace === null) return;
    if (!GameState.consumeItem(item)) return;

    this.world.set(tx, ty, tileToPLace);
    EventBus.emit(EV.TILE_PLACED, { tx, ty, tile: tileToPLace });
    EventBus.emit(EV.INVENTORY_CHANGED);
  }

  private itemToTile(item: ItemType): TileType | null {
    const map: Partial<Record<ItemType, TileType>> = {
      [ITEM.DIRT]:         TILE.DIRT,
      [ITEM.STONE]:        TILE.STONE,
      [ITEM.WOOD]:         TILE.WOOD_LOG,
      [ITEM.BED]:          TILE.BED,
      [ITEM.BOX]:          TILE.CHEST,
      [ITEM.FURNACE_ITEM]: TILE.FURNACE,
    };
    return map[item] ?? null;
  }

  // ---- 攻撃 ----
  private tryMeleeAttack() {
    const weapon = GameState.selectedItem();
    let dmg: number = PLAYER.ATTACK_DAMAGE;
    if (weapon && WEAPON_DMG[weapon]) dmg = WEAPON_DMG[weapon];

    // クリティカル
    const critChance = (CRIT.CHANCE as number) + (weapon?.includes('sword') ? (CRIT.SWORD_BONUS as number) : 0);
    let isCrit = false;
    if (Math.random() < critChance) { dmg = Math.round(dmg * (CRIT.MULT as number)); isCrit = true; }

    this.attackCd = PLAYER.ATTACK_CD;
    this.combo    = Math.min(5, this.combo + 1);
    this.comboTimer = 2000;

    const facing = this.flipX ? -1 : 1;
    EventBus.emit('player:attack', {
      x: this.x + facing * PLAYER.ATTACK_RANGE,
      y: this.y,
      range: PLAYER.ATTACK_RANGE,
      dmg,
      isCrit,
    });

    const anim = weapon === ITEM.BOW ? 'hero_bow' : 'hero_sword';
    this.play(anim, true);
    this.scene.time.delayedCall(300, () => { if (this.active) this.play('hero_idle', true); });
  }

  // ---- ダメージ受け ----
  takeDamage(amount: number) {
    if (this.invulnTimer > 0) return;

    // 防具軽減
    const armor = GameState.armor;
    const def   = armor ? (PLAYER.ARMOR_DEF[armor] ?? 0) : 0;
    const final = Math.max(1, Math.round(amount * (1 - def)));

    GameState.setHp(GameState.hp - final);
    this.invulnTimer = PLAYER.INVULN_MS;
    this.safeTimer   = 0;

    // 点滅
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 80, yoyo: true,
      repeat: 4,
      onComplete: () => { this.setAlpha(1); },
    });

    this.play('hero_hurt', true);
    this.audio.play('player_hurt');
    EventBus.emit(EV.PLAYER_DAMAGED, { amount: final, hp: GameState.hp });

    if (GameState.hp <= 0) EventBus.emit(EV.PLAYER_DIED);
  }

  // ---- HP回復 ----
  private updateRegen(delta: number) {
    if (GameState.hp >= GameState.maxHp * REGEN.MAX_RATIO) {
      this.safeTimer += delta;
    } else {
      this.safeTimer = 0;
    }
    if (this.safeTimer >= REGEN.SAFE_MS) {
      this.regenTimer += delta;
      if (this.regenTimer >= 1000) {
        this.regenTimer = 0;
        GameState.setHp(GameState.hp + REGEN.RATE);
        EventBus.emit(EV.PLAYER_HEALED, { hp: GameState.hp });
      }
    }
  }

  // ---- アニメ ----
  private updateAnimation(onGround: boolean, vx: number) {
    if (this.anims.currentAnim?.key === 'hero_sword' && this.anims.isPlaying) return;
    if (this.anims.currentAnim?.key === 'hero_bow'   && this.anims.isPlaying) return;
    if (this.anims.currentAnim?.key === 'hero_hurt'  && this.anims.isPlaying) return;

    if (!onGround) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.play(body.velocity.y < 0 ? 'hero_jump' : 'hero_fall', true);
    } else if (Math.abs(vx) > 20) {
      this.play('hero_walk', true);
    } else {
      this.play('hero_idle', true);
    }
  }

  get tileX() { return Math.floor(this.x / GAME.TILE_SIZE); }
  get tileY() { return Math.floor(this.y / GAME.TILE_SIZE); }
}
