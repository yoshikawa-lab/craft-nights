import Phaser from 'phaser';
import {
  GAME, TILE, TILE_SOLID, TileType,
  DUNGEON_FRAME, ITEM, PALETTE, UI, ItemType,
  DAY_NIGHT,
} from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { WorldMap } from '../systems/WorldMap';
import { DayNightSystem } from '../systems/DayNightSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/Enemy';
import { Sheep } from '../objects/Sheep';
import { Villager } from '../objects/Villager';
import { DroppedItem } from '../objects/DroppedItem';
import { HUD } from '../ui/HUD';
import { CraftingUI } from '../ui/CraftingUI';
import { FurnaceUI } from '../ui/FurnaceUI';
import { StorageUI } from '../ui/StorageUI';
import { VillagerUI } from '../ui/VillagerUI';
import { LevelUpUI } from '../ui/LevelUpUI';
import { MinimapUI } from '../ui/MinimapUI';
import { TouchControls } from '../ui/TouchControls';
import { HelpUI } from '../ui/HelpUI';
import { AudioManager } from '../audio/AudioManager';

// ============================================================
// GameScene — メインゲームシーン
// ============================================================

export class GameScene extends Phaser.Scene {
  // Core
  private world!: WorldMap;
  private audio!: AudioManager;
  private dayNight!: DayNightSystem;
  private spawner!: EnemySpawner;

  // Objects
  private player!: Player;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private sheepGroup!: Phaser.Physics.Arcade.Group;
  private villagerGroup!: Phaser.Physics.Arcade.Group;
  private itemGroup!: Phaser.Physics.Arcade.Group;

  // Tilemap rendering
  private tileGraphics!: Phaser.GameObjects.Graphics;
  private visibleTiles: Map<string, Phaser.GameObjects.Image> = new Map();
  private tilePool: Phaser.GameObjects.Image[] = [];

  // Background
  private skyTop!: Phaser.GameObjects.Rectangle;
  private skyBot!: Phaser.GameObjects.Rectangle;

  // UI
  private hud!: HUD;
  private craftUI!: CraftingUI;
  private furnaceUI!: FurnaceUI;
  private storageUI!: StorageUI;
  private villagerUI!: VillagerUI;
  private levelUI!: LevelUpUI;
  private minimap!: MinimapUI;
  private touchCtrl!: TouchControls;
  private helpUI!: HelpUI;

  // Keys
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private wheelDelta = 0;

  constructor() { super({ key: 'GameScene' }); }

  // ============================================================
  create() {
    this.cameras.main.fadeIn(400);

    // WorldMap
    this.world = new WorldMap(GameState.worldSeed);

    // Audio
    this.audio = new AudioManager(this);

    // Sky background
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    this.skyTop = this.add.rectangle(0, 0, W * 8, H / 2, PALETTE.SKY_DAY_TOP).setOrigin(0, 0).setScrollFactor(0.1).setDepth(-100);
    this.skyBot = this.add.rectangle(0, H / 2, W * 8, H / 2, PALETTE.SKY_DAY_BOT).setOrigin(0, 0).setScrollFactor(0.1).setDepth(-100);

    // Day/Night
    this.dayNight = new DayNightSystem(this, this.skyTop, this.skyBot);

    // Physics world bounds
    const worldW = this.world.W * GAME.TILE_SIZE;
    const worldH = this.world.H * GAME.TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH + 100);

    // Groups
    this.enemyGroup   = this.physics.add.group({ classType: Enemy   });
    this.sheepGroup   = this.physics.add.group({ classType: Sheep   });
    this.villagerGroup= this.physics.add.group({ classType: Villager });
    this.itemGroup    = this.physics.add.group({ classType: DroppedItem });

    // Player
    const spawn = this.world.spawnPoint();
    this.player = new Player(this, spawn.x, spawn.y, this.world, this.audio);

    // Camera
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);

    // Tile rendering
    this.tileGraphics = this.add.graphics().setDepth(1);
    this.buildTileMap();

    // Spawn initial NPCs
    this.spawnInitialNPCs();

    // Enemy spawner
    this.spawner = new EnemySpawner(this, this.world, this.enemyGroup);

    // Colliders
    this.setupColliders();

    // UI
    this.hud        = new HUD(this, this.dayNight);
    this.craftUI    = new CraftingUI(this);
    this.furnaceUI  = new FurnaceUI(this);
    this.storageUI  = new StorageUI(this);
    this.villagerUI = new VillagerUI(this);
    this.levelUI    = new LevelUpUI(this);
    this.minimap    = new MinimapUI(this, this.world);
    this.touchCtrl  = new TouchControls(this);
    this.helpUI     = new HelpUI(this);

    // Keys
    const kb = this.input.keyboard!;
    this.keys = {
      C:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      F:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      H:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.H),
      M:   kb.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      ONE:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      TWO:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      THREE:kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      FOUR: kb.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      FIVE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      SIX:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
      SEVEN:kb.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN),
      EIGHT:kb.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT),
      NINE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NINE),
    };

    // Mouse wheel
    this.input.on('wheel', (_p: never, _go: never, _dx: never, dy: number) => {
      this.wheelDelta += dy;
    });

    // Touch craft
    EventBus.on('touch:craft', () => this.craftUI.toggle(), this);

    // EventBus listeners
    this.setupEventListeners();

    // Show help on first start
    if (GameState.dayCount === 1 && GameState.hp === GameState.maxHp) {
      this.time.delayedCall(1500, () => this.helpUI.open());
    }

    EventBus.emit(EV.SHOW_TOAST, 'C:クラフト  H:ヘルプ');
  }

  // ============================================================
  update(time: number, delta: number) {
    this.dayNight.update(delta);
    this.hud.update();

    const pointer = this.input.activePointer;

    // ホットバー選択
    if (this.wheelDelta !== 0) {
      const dir = this.wheelDelta > 0 ? 1 : -1;
      GameState.hotbarIndex = (GameState.hotbarIndex + dir + 9) % 9;
      this.wheelDelta = 0;
      EventBus.emit(EV.HOTBAR_SELECT, GameState.hotbarIndex);
      this.hud.refreshHotbar();
    }
    for (let i = 0; i < 9; i++) {
      const key = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR,
                   this.keys.FIVE, this.keys.SIX, this.keys.SEVEN, this.keys.EIGHT, this.keys.NINE][i];
      if (key && Phaser.Input.Keyboard.JustDown(key)) {
        GameState.hotbarIndex = i;
        EventBus.emit(EV.HOTBAR_SELECT, i);
        this.hud.refreshHotbar();
      }
    }

    // UIトグル（UIが開いていないときのみ移動処理）
    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) this.craftUI.toggle();
    if (Phaser.Input.Keyboard.JustDown(this.keys.H)) this.helpUI.toggle();
    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) this.audio.toggleMute();

    const anyUiOpen = this.craftUI.visible || this.furnaceUI.visible || this.storageUI.visible
                   || this.villagerUI.visible || this.helpUI.visible;

    if (!anyUiOpen) {
      this.player.update(delta, pointer);
    }

    // タイル更新（採掘・設置反映）
    this.updateVisibleTiles();

    // 敵更新
    (this.enemyGroup.getChildren() as unknown as Enemy[]).forEach(e => {
      if (e.active) e.update(delta, this.player.x, this.player.y);
    });

    // 羊更新
    (this.sheepGroup.getChildren() as unknown as Sheep[]).forEach(s => {
      if (s.active) s.update(delta);
    });

    // 村人更新
    (this.villagerGroup.getChildren() as unknown as Villager[]).forEach(v => {
      if (v.active) v.update(delta);
    });

    // アイテム更新
    (this.itemGroup.getChildren() as unknown as DroppedItem[]).forEach(item => {
      if (item.active) item.update(delta);
    });

    // ミニマップ
    this.minimap.update(this.player.x, this.player.y);

    // かまど・Fキー
    if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
      this.checkFurnaceInteract();
    }

    // ベッドで睡眠チェック
    this.checkBedSleep();

    // タイル衝突処理（物理ステップ後）
    this.runTileCollisions();
  }

  // ============================================================
  // タイルマップ描画
  // ============================================================

  private buildTileMap() {
    // 初回描画はupdateVisibleTilesで行う
    this.updateVisibleTiles();
  }

  private updateVisibleTiles() {
    const cam  = this.cameras.main;
    const ts   = GAME.TILE_SIZE;
    const zoom = cam.zoom;

    const left   = Math.max(0, Math.floor(cam.scrollX / ts) - 1);
    const top    = Math.max(0, Math.floor(cam.scrollY / ts) - 1);
    const right  = Math.min(this.world.W - 1, Math.ceil((cam.scrollX + cam.width  / zoom) / ts) + 1);
    const bottom = Math.min(this.world.H - 1, Math.ceil((cam.scrollY + cam.height / zoom) / ts) + 1);

    const needed = new Set<string>();

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const tile = this.world.get(x, y);
        if (tile === TILE.AIR) continue;

        const key = `${x},${y}`;
        needed.add(key);

        if (!this.visibleTiles.has(key)) {
          const img = this.getTileImage(tile, x * ts, y * ts);
          this.visibleTiles.set(key, img);
        } else {
          // タイルが変化していたら更新
          const existing = this.visibleTiles.get(key)!;
          const expectedFrame = this.tileFrame(tile);
          if ((existing.frame as unknown as { name: number }).name !== expectedFrame) {
            this.returnTileImage(existing);
            const img = this.getTileImage(tile, x * ts, y * ts);
            this.visibleTiles.set(key, img);
          }
        }
      }
    }

    // 不要タイルをプールに返す
    for (const [key, img] of this.visibleTiles) {
      if (!needed.has(key)) {
        this.returnTileImage(img);
        this.visibleTiles.delete(key);
      }
    }
  }

  private getTileImage(tile: TileType, px: number, py: number): Phaser.GameObjects.Image {
    let img: Phaser.GameObjects.Image;
    if (this.tilePool.length > 0) {
      img = this.tilePool.pop()!;
      img.setActive(true).setVisible(true);
    } else {
      img = this.add.image(0, 0, 'world', 0).setOrigin(0, 0).setDepth(2);
    }
    // world.png は 18×18 px → TILE_SIZE(32) に拡大
    img.setScale(GAME.TILE_SIZE / 18);
    img.setPosition(px, py);
    img.setFrame(this.tileFrame(tile));
    img.setTint(this.tileTint(tile));
    return img;
  }

  private returnTileImage(img: Phaser.GameObjects.Image) {
    img.setActive(false).setVisible(false);
    this.tilePool.push(img);
  }

  /** タイル種別 → world.png (Kenney Pixel Platformer) フレーム番号
   *  20cols × 9rows; frame = col + row * 20
   *  Row0: 草地表面, Row1: 土, Row2: 石煉瓦, Row3: 砂,
   *  Row4: 石壁, Row6: 木材, Row8: 水/溶岩液体
   */
  private tileFrame(tile: TileType): number {
    const map: Record<number, number> = {
      [TILE.GRASS]:         0,   // Row0 col0: 草ブロック上面
      [TILE.DIRT]:          20,  // Row1 col0: 土ブロック
      [TILE.STONE]:         40,  // Row2 col0: 石ブロック
      [TILE.WOOD_LOG]:      120, // Row6 col0: 木材ブロック
      [TILE.LEAVES]:        17,  // Row0 col17: 草系緑タイル
      [TILE.WATER]:         160, // Row8 col0: 水タイル
      [TILE.SAND]:          60,  // Row3 col0: 砂ブロック
      [TILE.BED]:           100, // Row5 col0: デコタイル
      [TILE.CHEST]:         101, // Row5 col1: チェスト系
      [TILE.ANCIENT_BRICK]: 42,  // Row2 col2: 古煉瓦
      [TILE.IRON_ORE]:      40,  // 石+ティントで表現
      [TILE.LAVA]:          160, // 水フレーム+赤ティント
      [TILE.BOX]:           122, // Row6 col2: 木箱
      [TILE.COAL_ORE]:      40,
      [TILE.DIAMOND_ORE]:   40,
      [TILE.GOLD_ORE]:      40,
      [TILE.EMERALD_ORE]:   40,
      [TILE.FURNACE]:       102, // Row5 col2: 装置系
    };
    return map[tile] ?? 20;
  }

  /** タイル種別 → 色ティント (world.png は本来の色を使うため自然タイルは白) */
  private tileTint(tile: TileType): number {
    const map: Partial<Record<number, number>> = {
      // 鉱石: 石フレームに色を乗せて表現
      [TILE.IRON_ORE]:    0xbbbbdd,
      [TILE.COAL_ORE]:    0x666677,
      [TILE.DIAMOND_ORE]: 0x55eeff,
      [TILE.GOLD_ORE]:    0xffee22,
      [TILE.EMERALD_ORE]: 0x44ff88,
      // 液体
      [TILE.LAVA]:        0xff4400,
      // 特殊
      [TILE.FURNACE]:     0xff8800,
    };
    return map[tile] ?? 0xffffff;
  }

  // ============================================================
  // 物理コライダー
  // ============================================================

  private setupColliders() {
    // シンプルなタイルベース衝突処理（Arcade TilemapなしでOverlapレイキャストで代替）
    // Phaser の Arcade Physics + カスタムコライダーで地形衝突を処理
    this.physics.add.collider(this.player, this.enemyGroup, (p, e) => {
      const enemy = e as unknown as Enemy;
      const dmg   = enemy.tryAttack();
      if (dmg > 0) (p as Player).takeDamage(dmg);
    });

    this.physics.add.collider(this.player, this.sheepGroup);
    this.physics.add.collider(this.player, this.villagerGroup);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.physics.add.collider(this.sheepGroup, this.sheepGroup);

    // アイテム自動拾得
    this.physics.add.overlap(this.player, this.itemGroup, (_p, item) => {
      const di = item as DroppedItem;
      if (di.canPickup()) {
        di.pickup();
        this.audio.play('item_pickup');
      }
    });
  }

  // ============================================================
  // 地形コライダー（毎フレーム手動処理）
  // ============================================================

  private tileCollision(sprite: Phaser.Physics.Arcade.Sprite) {
    const ts   = GAME.TILE_SIZE;
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.blocked.down  = false;
    body.blocked.up    = false;
    body.blocked.left  = false;
    body.blocked.right = false;

    const bx = body.x, by = body.y, bw = body.width, bh = body.height;

    // 底辺チェック
    const footY = by + bh;
    const txL   = Math.floor(bx / ts);
    const txR   = Math.floor((bx + bw - 1) / ts);
    const tyFoot= Math.floor(footY / ts);

    for (let tx = txL; tx <= txR; tx++) {
      if (TILE_SOLID[this.world.get(tx, tyFoot)]) {
        if (body.velocity.y >= 0) {
          body.y = tyFoot * ts - bh;
          body.velocity.y = 0;
          (body.blocked as { down: boolean }).down = true;
        }
      }
    }

    // 頭チェック
    const tyTop = Math.floor(by / ts);
    if (body.velocity.y < 0) {
      for (let tx = txL; tx <= txR; tx++) {
        if (TILE_SOLID[this.world.get(tx, tyTop)]) {
          body.y = (tyTop + 1) * ts;
          body.velocity.y = 0;
          (body.blocked as { up: boolean }).up = true;
        }
      }
    }

    // 左右チェック
    const tyTop2  = Math.floor(by / ts);
    const tyBot2  = Math.floor((by + bh - 1) / ts);
    if (body.velocity.x < 0) {
      const txLeft = Math.floor(bx / ts);
      for (let ty = tyTop2; ty <= tyBot2; ty++) {
        if (TILE_SOLID[this.world.get(txLeft, ty)]) {
          body.x = (txLeft + 1) * ts;
          body.velocity.x = 0;
          (body.blocked as { left: boolean }).left = true;
        }
      }
    } else if (body.velocity.x > 0) {
      const txRight = Math.floor((bx + bw) / ts);
      for (let ty = tyTop2; ty <= tyBot2; ty++) {
        if (TILE_SOLID[this.world.get(txRight, ty)]) {
          body.x = txRight * ts - bw;
          body.velocity.x = 0;
          (body.blocked as { right: boolean }).right = true;
        }
      }
    }
  }

  // ============================================================
  // 初期NPC配置
  // ============================================================

  private spawnInitialNPCs() {
    // 羊 (地表付近)
    for (let i = 0; i < 8; i++) {
      const tx = 20 + Math.floor(Math.random() * (this.world.W * 0.4));
      const ty = this.world.getSurfaceY(tx) - 2;
      const sheep = new Sheep(this, tx * GAME.TILE_SIZE, ty * GAME.TILE_SIZE);
      this.sheepGroup.add(sheep as unknown as Phaser.GameObjects.GameObject, true);
    }

    // 村人 (地表、右エリア)
    for (let i = 0; i < 3; i++) {
      const tx = Math.floor(this.world.W * 0.5) + i * 20;
      const ty = this.world.getSurfaceY(tx) - 2;
      const v  = new Villager(this, tx * GAME.TILE_SIZE, ty * GAME.TILE_SIZE);
      this.villagerGroup.add(v as unknown as Phaser.GameObjects.GameObject, true);
    }
  }

  // ============================================================
  // EventBus listeners
  // ============================================================

  private setupEventListeners() {
    // タイル破壊 → ドロップ生成
    EventBus.on(EV.TILE_MINED, (data: { tx: number; ty: number; drops: { item: ItemType; count: number }[] }) => {
      for (const drop of data.drops) {
        const di = new DroppedItem(this, data.tx * GAME.TILE_SIZE + 8, data.ty * GAME.TILE_SIZE, drop.item, drop.count);
        this.itemGroup.add(di as unknown as Phaser.GameObjects.GameObject, true);
      }
      // タイル画像を削除してキャッシュをクリア
      const key = `${data.tx},${data.ty}`;
      const img = this.visibleTiles.get(key);
      if (img) { this.returnTileImage(img); this.visibleTiles.delete(key); }
    }, this);

    // タイル設置 → キャッシュクリア
    EventBus.on(EV.TILE_PLACED, (data: { tx: number; ty: number }) => {
      const key = `${data.tx},${data.ty}`;
      const img = this.visibleTiles.get(key);
      if (img) { this.returnTileImage(img); this.visibleTiles.delete(key); }
    }, this);

    // 敵死亡 → XP & ドロップ
    EventBus.on(EV.ENEMY_DIED, (data: {
      kind: string; x: number; y: number;
      drops: { item: ItemType; count: number }[];
      xp: number;
    }) => {
      for (const drop of data.drops) {
        const di = new DroppedItem(this, data.x, data.y, drop.item, drop.count);
        this.itemGroup.add(di as unknown as Phaser.GameObjects.GameObject, true);
      }
      const leveled = GameState.addXp(data.xp);
      if (leveled) EventBus.emit(EV.PLAYER_LEVEL_UP);
      this.audio.play('enemy_hit');
    }, this);

    // アイテムドロップ (羊など)
    EventBus.on(EV.ITEM_DROPPED, (data: { item: ItemType; count: number; x: number; y: number }) => {
      const di = new DroppedItem(this, data.x, data.y, data.item, data.count);
      this.itemGroup.add(di, true);
    }, this);

    // プレイヤー攻撃
    EventBus.on('player:attack', (data: { x: number; y: number; range: number; dmg: number; isCrit: boolean }) => {
      this.handlePlayerAttack(data);
    }, this);

    // ゲームオーバー
    EventBus.on(EV.PLAYER_DIED, () => {
      this.cameras.main.fadeOut(800, 0, 0, 0, (_c: never, progress: number) => {
        if (progress === 1) {
          this.scene.start('GameOverScene', { dayCount: GameState.dayCount, level: GameState.level });
        }
      });
    }, this);
  }

  // ============================================================
  // 攻撃判定
  // ============================================================

  private handlePlayerAttack(data: { x: number; y: number; range: number; dmg: number; isCrit: boolean }) {
    const range = data.range;

    // 敵
    (this.enemyGroup.getChildren() as unknown as Enemy[]).forEach(e => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(data.x, data.y, e.x, e.y);
      if (d < range + 20) {
        e.takeDamage(data.dmg);
        // ダメージ数字
        this.showDamageNum(e.x, e.y - 20, data.dmg, data.isCrit);
        this.audio.play('enemy_hit');
      }
    });

    // 羊
    (this.sheepGroup.getChildren() as unknown as Sheep[]).forEach(s => {
      if (!s.active) return;
      const d = Phaser.Math.Distance.Between(data.x, data.y, s.x, s.y);
      if (d < range + 10) { s.takeDamage(data.dmg); this.audio.play('enemy_hit'); }
    });
  }

  private showDamageNum(x: number, y: number, dmg: number, isCrit: boolean) {
    const txt = this.add.text(x, y, isCrit ? `${dmg}!!` : `${dmg}`, {
      fontSize: isCrit ? '14px' : '10px',
      color: isCrit ? '#ffdd00' : '#ff8888',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: txt, y: y - 30, alpha: 0, duration: 700,
      onComplete: () => txt.destroy(),
    });
  }

  // ============================================================
  // インタラクション
  // ============================================================

  private checkFurnaceInteract() {
    const ts = GAME.TILE_SIZE;
    const reach = 3;
    const px = this.player.tileX, py = this.player.tileY;

    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const tx = px + dx, ty = py + dy;
        if (this.world.get(tx, ty) === TILE.FURNACE) {
          this.furnaceUI.toggle();
          this.audio.play('ui_open');
          return;
        }
        if (this.world.get(tx, ty) === TILE.CHEST) {
          this.storageUI.toggle();
          this.audio.play('ui_open');
          return;
        }
      }
    }

    // 近くの村人
    for (const v of this.villagerGroup.getChildren() as unknown as Villager[]) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, v.x, v.y) < 50) {
        this.villagerUI.open(v);
        this.audio.play('ui_open');
        return;
      }
    }
  }

  private checkBedSleep() {
    if (!this.dayNight.isNight) return;
    const ts = GAME.TILE_SIZE;
    const px = this.player.tileX, py = this.player.tileY;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (this.world.get(px + dx, py + dy) === TILE.BED) {
          // Eキーで睡眠
          const eKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
          if (eKey && Phaser.Input.Keyboard.JustDown(eKey)) {
            this.dayNight.sleep();
            EventBus.emit(EV.SHOW_TOAST, '💤 おやすみなさい...');
            this.audio.play('ui_confirm');
            return;
          }
        }
      }
    }
  }

  // ============================================================
  // Phaser physics step override — タイル衝突をカスタム処理
  // ============================================================

  private runTileCollisions() {
    // プレイヤーのタイル衝突
    this.tileCollision(this.player);

    // 敵のタイル衝突
    for (const e of this.enemyGroup.getChildren() as unknown as Phaser.Physics.Arcade.Sprite[]) {
      if (e.active) this.tileCollision(e);
    }
    // 羊
    for (const s of this.sheepGroup.getChildren() as unknown as Phaser.Physics.Arcade.Sprite[]) {
      if (s.active) this.tileCollision(s);
    }
    // ドロップアイテム
    for (const item of this.itemGroup.getChildren() as unknown as Phaser.Physics.Arcade.Sprite[]) {
      if (item.active) this.tileCollision(item);
    }
  }

  // ============================================================
  shutdown() {
    EventBus.off(EV.TILE_MINED,    undefined, this);
    EventBus.off(EV.TILE_PLACED,   undefined, this);
    EventBus.off(EV.ENEMY_DIED,    undefined, this);
    EventBus.off(EV.ITEM_DROPPED,  undefined, this);
    EventBus.off('player:attack',  undefined, this);
    EventBus.off(EV.PLAYER_DIED,   undefined, this);
    EventBus.off('touch:craft',    undefined, this);
    this.spawner?.destroy();
    this.hud?.destroy();
    this.craftUI?.destroy();
    this.furnaceUI?.destroy();
    this.storageUI?.destroy();
    this.villagerUI?.destroy();
    this.levelUI?.destroy();
    this.minimap?.destroy();
    this.touchCtrl?.destroy();
    this.helpUI?.destroy();
  }
}
