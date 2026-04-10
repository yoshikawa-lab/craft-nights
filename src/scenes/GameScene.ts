// ============================
// GameScene — 横スクロール版（Tilemap衝突・重力・ジャンプ）
// ============================
import Phaser from 'phaser';
import {
    GAME, TILE_PX, TILE, ITEM, PLAYER, DAY_NIGHT, PALETTE,
    PX, ENEMY_TYPES, EnemyKind, UI, ItemType, TileType, TILE_SOLID, BOSS,
    CRIT, ELITE
} from '../core/Constants';

// ---- ブロック採掘時間（ms）/ Minecraft スタイル ----
const MINE_DURATION: Partial<Record<TileType, number>> = {
    [TILE.GRASS]:         300,
    [TILE.DIRT]:          300,
    [TILE.SAND]:          300,
    [TILE.LEAVES]:        150,
    [TILE.WOOD_LOG]:      500,
    [TILE.STONE]:         800,
    [TILE.BOX]:           500,
    [TILE.BED]:           400,
    [TILE.FURNACE]:       600,
    [TILE.COAL_ORE]:     1000,
    [TILE.ORE]:          1000,
    [TILE.GOLD_ORE]:     1100,
    [TILE.EMERALD_ORE]:  1200,
    [TILE.DIAMOND_ORE]:  1500,
    [TILE.ANCIENT_BRICK]:2500,
};
import { audioManager } from '../audio/AudioManager';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { WorldMap, TILE_COLORS } from '../systems/WorldMap';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/Enemy';
import { Sheep } from '../objects/Sheep';
import { Villager } from '../objects/Villager';
import { DroppedItem } from '../objects/DroppedItem';
import { HUD } from '../ui/HUD';
import { CraftingUI } from '../ui/CraftingUI';
import { StorageUI } from '../ui/StorageUI';
import { FurnaceUI } from '../ui/FurnaceUI';
import { VillagerUI } from '../ui/VillagerUI';
import { LevelUpUI } from '../ui/LevelUpUI';
import { MinimapUI } from '../ui/MinimapUI';
import { TouchControls } from '../ui/TouchControls';
import { HelpUI } from '../ui/HelpUI';
import { TILE_TEXTURE_KEY } from './BootScene';

// アイテム名の日本語ラベル（ピックアップ時フローティングテキスト用）
const ITEM_JP: Partial<Record<string, string>> = {
    wood: '木材', stone: '石', wool: '羊毛', sword: '剣', axe: '斧',
    pickaxe: 'ツルハシ', bow: '弓', arrow: '矢', bed: 'ベッド', dirt: '土',
    grass: '草', iron_ore: '鉄鉱石', box: '箱', coal: '石炭', diamond: 'ダイヤ',
    emerald: 'エメラルド', gold: '金鉱石', iron_ingot: '鉄', gold_ingot: '金',
    iron_armor: '鉄鎧', diamond_armor: 'ダイヤ鎧', gold_armor: '金鎧',
    iron_sword: '鉄剣', iron_pick: '鉄ツルハシ',
    diamond_sword: 'ダイヤ剣', diamond_pick: 'ダイヤ掘', gold_sword: '金剣',
    furnace_item: 'かまど',
    bucket: 'バケツ',
    netherite: 'ネザーライト', netherite_sword: 'ネザーライトの剣',
    netherite_armor: 'ネザーライトの鎧', netherite_pick: 'ネザーライトのツルハシ',
    netherite_block: 'ネザーライトブロック',
};

export class GameScene extends Phaser.Scene {
    private world!: WorldMap;
    private player!: Player;
    private enemies: Enemy[] = [];
    private sheepList: Sheep[] = [];
    private droppedItems: DroppedItem[] = [];

    // ボス
    private bossEnemy: Enemy | null = null;
    private _bossSpawned = false;
    private _lavaTimer = 0;
    private _victory = false;

    // タイルマップ（衝突処理の核心）
    private tilemap!: Phaser.Tilemaps.Tilemap;
    private tilemapLayer!: Phaser.Tilemaps.TilemapLayer;

    // 変更されたタイルを再描画するための追加Graphics
    private overlayGfx!: Phaser.GameObjects.Graphics;

    // 昼夜
    private dayNightTimer = 0;
    private skyGraphics!: Phaser.GameObjects.Graphics;

    // 星空・天体
    private _stars: Array<{ x: number; y: number; r: number; phase: number }> = [];

    // エネミースポーン
    private enemySpawnTimer = 0;

    // キーバインド
    private interactKey?: Phaser.Input.Keyboard.Key;
    private craftKey?: Phaser.Input.Keyboard.Key;
    private saveKey?: Phaser.Input.Keyboard.Key;
    private helpKey?: Phaser.Input.Keyboard.Key;
    private hotbarKeys: Phaser.Input.Keyboard.Key[] = [];

    private chestOpened = false;
    private villageChestOpened = false;

    // 村人
    private villagers: Villager[] = [];
    private currentVillager: Villager | null = null;

    // UI
    private hud!: HUD;
    private craftUI!: CraftingUI;
    private storageUI!: StorageUI;
    private furnaceUI!: FurnaceUI;
    private villagerUI!: VillagerUI;
    private levelUpUI!: LevelUpUI;
    private minimap!: MinimapUI;
    private touchControls?: TouchControls;
    private helpUI!: HelpUI;

    // ---- ブロック採掘進行度（Round 4） ----
    private _miningState: { tx: number; ty: number; progress: number; total: number } | null = null;
    private _miningGfx!: Phaser.GameObjects.Graphics;

    // ---- レベルアップ選択中フラグ（Round 2） ----
    private _levelChoicePending = false;

    // ---- キルストリーク（Round 4）----
    private _streakCount = 0;
    private _streakTimer = 0;
    private readonly STREAK_WINDOW_MS = 4000;

    // ---- ポーズメニュー（Round 7）----
    private _paused = false;
    private _pauseContainer?: Phaser.GameObjects.Container;
    private _escKey?: Phaser.Input.Keyboard.Key;

    // ---- アフターイメージ描画グラフィクス（Round 2）----
    private _afterimageGfx!: Phaser.GameObjects.Graphics;

    // ---- 洞窟暗闇（Round 5）----
    private _caveOverlay!: Phaser.GameObjects.Graphics;
    private _caveLight!: Phaser.GameObjects.Graphics;
    private _caveAlpha = 0;

    // ---- 夜生存フラグ（Round 9）----
    private _nightSurvivedRewarded = false;

    // ---- タッチインタラクト JustDown エッジ検出 ----
    private _prevTouchInteract = false;
    private _prevTouchAttack   = false;

    // ---- 蛍（夜間アンビエント）----
    private _fireflies: Array<{x: number; y: number; vx: number; vy: number; phase: number; size: number}> = [];
    private _fireflyGfx!: Phaser.GameObjects.Graphics;

    // 睡眠
    private sleepOverlay!: Phaser.GameObjects.Rectangle;
    private sleepText!: Phaser.GameObjects.Text;
    private sleepTimer = 0;

    constructor() {
        super({ key: 'GameScene' });
    }

    create(): void {
        gameState.reset();

        // ---- シーン内状態を完全リセット（再起動安全性） ----
        this.enemies = [];
        this.sheepList = [];
        this.villagers = [];
        this.currentVillager = null;
        this.droppedItems = [];
        this._stars = [];
        this.enemySpawnTimer = 0;
        this.dayNightTimer = 0;
        this.sleepTimer = 0;
        this.chestOpened = false;
        this.bossEnemy = null;
        this._bossSpawned = false;
        this._lavaTimer = 0;
        this._victory = false;
        this._miningState = null;
        this._levelChoicePending = false;
        this._streakCount = 0;
        this._streakTimer = 0;
        this._paused = false;
        this._caveAlpha = 0;
        this._nightSurvivedRewarded = false;

        // ---- Audio初期化 ----
        audioManager.init();
        audioManager.resume();
        this.input.once('pointerdown', () => audioManager.resume());

        // ---- ワールド生成 ----
        this.world = new WorldMap();

        // ---- 星の生成 ----
        for (let i = 0; i < 110; i++) {
            this._stars.push({
                x: Math.random() * GAME.WIDTH,
                y: Math.random() * GAME.HEIGHT * 0.65,
                r: (0.6 + Math.random() * 1.5) * PX,
                phase: Math.random() * Math.PI * 2,
            });
        }

        // ---- 空背景（スクロールしない） ----
        this.skyGraphics = this.add.graphics();
        this.skyGraphics.setScrollFactor(0).setDepth(-200);
        this._drawSky(0);

        // ---- Phaser Tilemap 作成 ----
        this._buildTilemap();

        // ---- 物理ワールド境界 ----
        this.physics.world.setBounds(
            0, 0,
            this.world.W * TILE_PX,
            this.world.H * TILE_PX,
        );
        // 重力設定（横スクロール用）
        this.physics.world.gravity.y = PLAYER.GRAVITY * PX;
        // タイルすり抜け防止: TILE_PX分まで余裕を持って衝突検出する
        this.physics.world.TILE_BIAS = TILE_PX;

        // ---- プレイヤー生成 ----
        const ps = this.world.playerStart;
        this.player = new Player(
            this,
            (ps.tx + 0.5) * TILE_PX,
            ps.ty * TILE_PX,
        );

        // player.phys は Phaser.Physics.Arcade.Image — 確実に機能する
        this.physics.add.collider(this.player.phys, this.tilemapLayer);

        // ---- カメラ ----
        this.cameras.main.setBounds(0, 0, this.world.W * TILE_PX, this.world.H * TILE_PX);
        this.cameras.main.startFollow(this.player.phys, true, 0.08, 0.08);

        // ---- ブロック変更の上書きGraphics ----
        this.overlayGfx = this.add.graphics().setDepth(5);

        // ---- 羊スポーン ----
        for (const sp of this.world.sheepSpawns.slice(0, 8)) {
            this._spawnSheep((sp.tx + 0.5) * TILE_PX, sp.ty * TILE_PX);
        }

        // ---- 村人スポーン ----
        for (const vp of this.world.villagerSpawns) {
            this._spawnVillager((vp.tx + 0.5) * TILE_PX, vp.ty * TILE_PX);
        }

        // ---- 入力 ----
        this._setupInput();

        // ---- 睡眠UI ----
        this.sleepOverlay = this.add.rectangle(
            GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0x000044, 0,
        ).setScrollFactor(0).setDepth(500);
        this.sleepText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, '', {
            fontSize: `${18 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#aaaaff', stroke: '#000', strokeThickness: 3 * PX, align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

        // ---- HUD / CraftUI / FurnaceUI / VillagerUI / TouchControls ----
        this.hud = new HUD(this);
        this.craftUI = new CraftingUI(this);
        this.storageUI = new StorageUI(this);
        this.furnaceUI = new FurnaceUI(this);
        this.villagerUI = new VillagerUI(this);
        this.levelUpUI = new LevelUpUI(this);
        this.minimap   = new MinimapUI(this, this.world);
        this.helpUI    = new HelpUI(this);
        this.hud.setHelpCallback(() => this.helpUI.toggle());
        this.touchControls = new TouchControls(this, this.player);

        // ---- 採掘クラックオーバーレイ（タイルの上に重ねる）----
        this._miningGfx = this.add.graphics().setDepth(6);

        // ---- アフターイメージグラフィクス（ダッシュ時）----
        this._afterimageGfx = this.add.graphics().setDepth(9);

        // ---- 洞窟暗闇（Round 5）----
        this._caveOverlay = this.add.graphics().setScrollFactor(0).setDepth(55);
        this._caveLight   = this.add.graphics().setScrollFactor(0).setDepth(56);
        this._caveLight.setBlendMode(Phaser.BlendModes.ADD);

        // ---- 蛍（夜間アンビエント）----
        this._fireflyGfx = this.add.graphics().setScrollFactor(0).setDepth(48);
        for (let i = 0; i < 28; i++) {
            this._fireflies.push({
                x: Math.random() * GAME.WIDTH,
                y: GAME.HEIGHT * 0.1 + Math.random() * GAME.HEIGHT * 0.65,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.5) * 8,
                phase: Math.random() * Math.PI * 2,
                size: 1.2 + Math.random() * 1.4,
            });
        }

        // ---- ポーズキー（ESC）----
        this._escKey = this.input.keyboard?.addKey('ESC');

        // ---- イベントリスナー ----
        this._listenEvents();

        // ---- クリック（ブロック破壊・攻撃） ----
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            const anyUiOpen = this.craftUI.visible || this.storageUI.visible
                || this.furnaceUI.visible || this.villagerUI.visible || this._levelChoicePending || this.helpUI.visible;
            if (p.leftButtonDown() && !anyUiOpen) {
                this._handleLeftClick(p);
            }
        });

        // ---- セーブデータ読み込み ----
        if (gameState.hasSave()) {
            gameState.load();
            EventBus.emit(Events.INVENTORY_CHANGED);
        }

        // ---- エントランス ----
        this.cameras.main.flash(400, 255, 255, 255, true);
        EventBus.emit(Events.SPECTACLE_ENTRANCE);
        this.time.delayedCall(1500, () => {
            const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const hint = isMobile
                ? '⚔ タップ: 攻撃  ↑: ジャンプ  E: インタラクト  🔨: クラフト'
                : 'WASD: 移動 | Space: 攻撃/採掘 | E: インタラクト | C: クラフト | S: セーブ';
            this.hud.showStatus(hint, 5000);
        });
    }

    // ---- Tilemap構築 ----
    private _buildTilemap(): void {
        const data2D = this.world.getData2D();
        const ts = TILE_PX;

        this.tilemap = this.make.tilemap({
            data: data2D,
            tileWidth:  ts,
            tileHeight: ts,
        });

        // タイルセット（BootSceneで生成したテクスチャを使用）
        const tileset = this.tilemap.addTilesetImage(
            TILE_TEXTURE_KEY, TILE_TEXTURE_KEY,
            ts, ts,
            0, 0,       // margin, spacing
            0,          // firstgid = 0（data配列の値と一致させる）
        );
        if (!tileset) {
            console.error('Tileset not found:', TILE_TEXTURE_KEY);
            return;
        }

        this.tilemapLayer = this.tilemap.createLayer(0, tileset, 0, 0)!;
        this.tilemapLayer.setDepth(0);

        // 固体タイルの衝突設定
        // 1. まず全タイル(1〜18)に衝突を有効化（18=FURNACE）
        // 2. 次に通過可能なタイルだけ無効化（空気=-1は自動的に無効）
        this.tilemapLayer.setCollisionBetween(1, 18, true, true);
        this.tilemapLayer.setCollision(
            [TILE.LEAVES, TILE.WATER, TILE.BED, TILE.LAVA],
            false,
            true,
        );
    }

    private _setupInput(): void {
        if (!this.input.keyboard) return;
        this.interactKey = this.input.keyboard.addKey('E');
        this.craftKey    = this.input.keyboard.addKey('C');
        this.saveKey     = this.input.keyboard.addKey('S');
        this.helpKey     = this.input.keyboard.addKey('QUESTION_MARK');

        // Phaser のキー名は 'ONE'〜'NINE'（数字文字列 '1'〜'9' は無効）
        const DIGIT_KEYS = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'];
        for (const name of DIGIT_KEYS) {
            this.hotbarKeys.push(this.input.keyboard.addKey(name));
        }
        this.input.on('wheel', (_p: unknown, _go: unknown, _dx: number, dy: number) => {
            gameState.hotbarIndex = dy > 0
                ? (gameState.hotbarIndex + 1) % 9
                : (gameState.hotbarIndex + 8) % 9;
            EventBus.emit(Events.HOTBAR_SELECT);
        });
    }

    private _listenEvents(): void {
        EventBus.on(Events.PLAYER_DIED,   this._onPlayerDied,   this);
        EventBus.on(Events.ENEMY_DIED,    this._onEnemyDied,    this);
        EventBus.on(Events.SHEEP_DIED,    this._onSheepDied,    this);
        EventBus.on(Events.ENEMY_ATTACK,  this._onEnemyAttack,  this);
        EventBus.on(Events.CRAFT_SUCCESS, this._onCraftSuccess, this);
        EventBus.on(Events.CRAFT_TOGGLE,  this._onTouchCraft,   this);
        EventBus.on(Events.HOTBAR_SELECT, this._onHotbarSelect, this);
        EventBus.on(Events.BOSS_STOMP,    this._onBossStomp,    this);
        EventBus.on(Events.BOSS_PHASE2,   this._onBossPhase2,   this);
        EventBus.on(Events.BOSS_DEFEATED, this._onBossDefeated, this);
        this.events.on('shutdown', this._cleanup, this);
    }

    private _cleanup(): void {
        EventBus.off(Events.PLAYER_DIED,   this._onPlayerDied,   this);
        EventBus.off(Events.ENEMY_DIED,    this._onEnemyDied,    this);
        EventBus.off(Events.SHEEP_DIED,    this._onSheepDied,    this);
        EventBus.off(Events.ENEMY_ATTACK,  this._onEnemyAttack,  this);
        EventBus.off(Events.CRAFT_SUCCESS, this._onCraftSuccess, this);
        EventBus.off(Events.CRAFT_TOGGLE,  this._onTouchCraft,   this);
        EventBus.off(Events.HOTBAR_SELECT, this._onHotbarSelect, this);
        EventBus.off(Events.BOSS_STOMP,    this._onBossStomp,    this);
        EventBus.off(Events.BOSS_PHASE2,   this._onBossPhase2,   this);
        EventBus.off(Events.BOSS_DEFEATED, this._onBossDefeated, this);
        this.player.destroy();
        this.hud.destroy();
        this.craftUI.destroy();
        this.storageUI.destroy();
        this.furnaceUI.destroy();
        this.villagerUI.destroy();
        this.helpUI.destroy();
        // 村人を破棄
        for (const v of this.villagers) {
            if (v.active) v.destroy();
        }
        this.villagers = [];
    }

    // ---- メインループ ----
    update(_time: number, delta: number): void {
        if (gameState.gameOver) return;

        if (gameState.isSleeping) {
            this._updateSleep(delta);
            return;
        }

        if (this._victory) return;

        // ESC ポーズ（レベルアップ選択中は無効）
        if (this._escKey && Phaser.Input.Keyboard.JustDown(this._escKey) && !this._levelChoicePending) {
            this._paused ? this._resumeGame() : this._pauseGame();
        }
        if (this._paused) {
            this.hud.update();
            return;
        }

        // レベルアップ選択中はゲームをポーズ（ミニマップとHUDは更新継続）
        if (this._levelChoicePending) {
            this.hud.update();
            this._updateSky();
            return;
        }

        this.player.update(delta);
        this._handleInput();

        // ---- モバイルタッチ入力の処理 ----
        const anyUiOpen = this.craftUI.visible || this.storageUI.visible
            || this.furnaceUI.visible || this.villagerUI.visible || this._levelChoicePending || this.helpUI.visible;
        if (!anyUiOpen) {
            // タッチ攻撃: 設置アイテム選択中はJustDownで使用、そうでなければ連続攻撃
            if (this.player.touchAttack) {
                if (this._isUsableItem()) {
                    if (!this._prevTouchAttack) this._interact();
                } else {
                    const ax = this.player.x + this.player.facing * PLAYER.ATTACK_RANGE * PX;
                    const ay = this.player.y;
                    this._doPlayerAttackAt(ax, ay);
                }
            }
            // タッチインタラクト: JustDown（押した瞬間のみ）
            if (this.player.touchInteract && !this._prevTouchInteract) {
                this._interact();
            }
        }
        this._prevTouchInteract = this.player.touchInteract;
        this._prevTouchAttack   = this.player.touchAttack;

        this._updateEnemies(delta);
        this._updateSheep(delta);
        this._updateVillagers(delta);
        this._updateDrops(delta);
        this._updatePickup();
        this._updateDayNight(delta);
        this._spawnEnemies(delta);
        this._checkBossRoom();
        this._checkLavaDamage(delta);
        this._updateMining(delta);
        this._updateStreak(delta);
        this._updateCaveDarkness();
        this._updateFireflies(delta);
        this.player.renderAfterimages(this._afterimageGfx);
        this.hud.update();
        this.hud.setDashCooldown(this.player.dashCooldownRatio);
        // 昼夜カウントダウン
        const _cycleDur = gameState.isNight ? DAY_NIGHT.NIGHT_DURATION_MS : DAY_NIGHT.DAY_DURATION_MS;
        const _remaining = Math.max(0, (_cycleDur - this.dayNightTimer) / 1000);
        this.hud.setTimeRemaining(_remaining);
        this._updateSky();
        this.minimap.update(this.player.x, this.player.y, this.enemies);
        // 画面外敵インジケーター
        const cam = this.cameras.main;
        const enemyPositions = this.enemies.map(e => ({
            x: e.x, y: e.y, isBoss: e.kind === 'ANCIENT_BOSS',
        }));
        this.hud.updateEnemyIndicators(enemyPositions, cam.scrollX, cam.scrollY);

        // ボスのHPをGameStateに同期（衝突はpersistent colliderで処理済み）
        if (this.bossEnemy && this.bossEnemy.active2) {
            gameState.bossHp = this.bossEnemy.hp;
        }
    }

    // ---- 空描画 ----
    private _drawSky(nightT: number): void {
        const g = this.skyGraphics;
        g.clear();
        const w = GAME.WIDTH, h = GAME.HEIGHT;
        const topDay   = PALETTE.SKY_DAY_TOP,   botDay   = PALETTE.SKY_DAY_BOT;
        const topNight = PALETTE.SKY_NIGHT_TOP,  botNight = PALETTE.SKY_NIGHT_BOT;
        const lerp = (a: number, b: number, t: number) =>
            Math.round(((a >> 16) & 0xff) * (1 - t) + ((b >> 16) & 0xff) * t) << 16 |
            Math.round(((a >>  8) & 0xff) * (1 - t) + ((b >>  8) & 0xff) * t) <<  8 |
            Math.round(( a        & 0xff) * (1 - t) + ( b        & 0xff) * t);
        const top = lerp(topDay, topNight, nightT);
        const bot = lerp(botDay, botNight, nightT);
        g.fillGradientStyle(top, top, bot, bot, 1);
        g.fillRect(0, 0, w, h);

        // ---- 星（夜に出現） ----
        if (nightT > 0.15) {
            const starAlpha = Math.min(1, (nightT - 0.15) / 0.28);
            const t = this.time.now;
            for (const s of this._stars) {
                const twinkle = 0.55 + 0.45 * Math.sin(t * 0.0018 + s.phase);
                g.fillStyle(0xffffff, starAlpha * twinkle * 0.9);
                g.fillCircle(s.x, s.y, s.r);
            }
        }

        // ---- 太陽 / 月 ----
        const isNight = gameState.isNight;
        const dur = isNight ? DAY_NIGHT.NIGHT_DURATION_MS : DAY_NIGHT.DAY_DURATION_MS;
        const progress = Math.min(this.dayNightTimer / dur, 1);
        const arcAngle = Math.PI * progress;
        const bodyX = w * 0.08 + Math.sin(arcAngle) * w * 0.84;
        const bodyY = h * 0.74 - Math.sin(arcAngle) * h * 0.52;

        if (!isNight) {
            // 太陽
            const alpha = Math.max(0, 1 - nightT * 3);
            if (alpha > 0) {
                const sr = 14 * PX;
                g.fillStyle(0xffee88, alpha * 0.12); g.fillCircle(bodyX, bodyY, sr * 2.8);
                g.fillStyle(0xffdd44, alpha * 0.2);  g.fillCircle(bodyX, bodyY, sr * 1.7);
                g.fillStyle(0xffd700, alpha);         g.fillCircle(bodyX, bodyY, sr);
                g.fillStyle(0xfffacc, alpha * 0.9);  g.fillCircle(bodyX, bodyY, sr * 0.6);
            }
        } else {
            // 月
            const alpha = Math.min(1, (nightT - 0.1) / 0.25);
            if (alpha > 0) {
                const mr = 11 * PX;
                g.fillStyle(0xffeebb, alpha * 0.08); g.fillCircle(bodyX, bodyY, mr * 2.8);
                g.fillStyle(0xffeebb, alpha * 0.13); g.fillCircle(bodyX, bodyY, mr * 1.9);
                g.fillStyle(0xfffcee, alpha);         g.fillCircle(bodyX, bodyY, mr);
                // 三日月の影
                const sc = Phaser.Display.Color.IntegerToColor(lerp(botDay, botNight, nightT)).color;
                g.fillStyle(sc, alpha);              g.fillCircle(bodyX + mr * 0.36, bodyY - mr * 0.08, mr * 0.78);
            }
        }
    }

    private _skyNightT = 0;
    private _updateSky(): void {
        const target = gameState.isNight ? 1 : 0;
        this._skyNightT += (target - this._skyNightT) * 0.015;
        this._drawSky(this._skyNightT);
    }

    /** 夜間の蛍アンビエントエフェクト */
    private _updateFireflies(delta: number): void {
        const nightT = this._skyNightT;
        this._fireflyGfx.clear();
        if (nightT < 0.05) return;
        const dt = delta / 1000;
        for (const f of this._fireflies) {
            f.x  += f.vx * dt;
            f.y  += f.vy * dt;
            f.phase += dt * (1.2 + Math.random() * 0.6);
            // ランダムウォーク
            f.vx += (Math.random() - 0.5) * 18 * dt;
            f.vy += (Math.random() - 0.5) * 12 * dt;
            // 速度上限
            const spd = Math.hypot(f.vx, f.vy);
            if (spd > 22) { f.vx *= 22 / spd; f.vy *= 22 / spd; }
            // 画面端で折り返す
            if (f.x < 0)           f.x = GAME.WIDTH;
            if (f.x > GAME.WIDTH)  f.x = 0;
            if (f.y < 0)           f.y = GAME.HEIGHT * 0.72;
            if (f.y > GAME.HEIGHT * 0.75) f.y = 5;

            const glow = Math.max(0, Math.sin(f.phase)) * nightT;
            if (glow < 0.05) continue;
            // 外光（ソフトグロー）
            this._fireflyGfx.fillStyle(0x88ffaa, glow * 0.10);
            this._fireflyGfx.fillCircle(f.x, f.y, f.size * 3.5);
            // 中心輝点
            this._fireflyGfx.fillStyle(0xccffcc, glow * 0.85);
            this._fireflyGfx.fillCircle(f.x, f.y, f.size);
        }
    }

    // ---- 左クリック（PC専用 — タッチはupdateループで処理） ----
    private _handleLeftClick(p: Phaser.Input.Pointer): void {
        // タッチデバイスは updateループ で攻撃・採掘を処理するためここではスキップ
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
        if (this._isUsableItem()) {
            this._interact();
        } else {
            const wx = p.worldX, wy = p.worldY;
            this._doPlayerAttackAt(wx, wy);
        }
    }

    /** 選択中のアイテムが「使用/設置」系（攻撃ではなくインタラクト扱い）かを返す */
    private _isUsableItem(): boolean {
        const item = gameState.selectedItem.item;
        return item === ITEM.BED || item === ITEM.BOX || item === ITEM.FURNACE_ITEM || item === ITEM.BUCKET;
    }

    // ---- キー入力 ----
    private _handleInput(): void {
        for (let i = 0; i < this.hotbarKeys.length; i++) {
            if (Phaser.Input.Keyboard.JustDown(this.hotbarKeys[i])) {
                gameState.hotbarIndex = i;
                EventBus.emit(Events.HOTBAR_SELECT);
            }
        }
        if (Phaser.Input.Keyboard.JustDown(this.craftKey!)) {
            if (!this.craftUI.visible) {
                this.storageUI.close();
                this.furnaceUI.close();
                this.villagerUI.close();
            }
            this.craftUI.toggle();
        }
        if (Phaser.Input.Keyboard.JustDown(this.interactKey!)) {
            this._interact();
        }
        if (this.saveKey && Phaser.Input.Keyboard.JustDown(this.saveKey) &&
            !this.craftUI.visible && !this.storageUI.visible && !this.furnaceUI.visible) {
            gameState.save();
            this.hud.showStatus('💾 セーブしました！', 2000);
        }
        if (this.helpKey && Phaser.Input.Keyboard.JustDown(this.helpKey)) {
            this.helpUI.toggle();
        }
    }

    // ---- インタラクト ----
    private _interact(): void {
        // ストレージUIが開いていれば閉じる
        if (this.storageUI.visible) {
            this.storageUI.close();
            return;
        }
        // かまどUIが開いていれば閉じる
        if (this.furnaceUI.visible) {
            this.furnaceUI.close();
            return;
        }
        // 村人UIが開いていれば閉じる
        if (this.villagerUI.visible) {
            this.villagerUI.close();
            return;
        }

        // 村人との距離チェック（タイルインタラクト前に行う）
        for (const v of this.villagers) {
            if (!v.active2) continue;
            const dist = Phaser.Math.Distance.Between(v.x, v.y, this.player.x, this.player.y);
            if (dist < TILE_PX * 2) {
                this.craftUI.close();
                this.storageUI.close();
                this.furnaceUI.close();
                this.villagerUI.open(v.name, v.greeting);
                this.currentVillager = v;
                return;
            }
        }

        const tx = this.player.tileX;
        const ty = this.player.tileY;

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 2; dy++) {
                const ntx = tx + dx, nty = ty + dy;
                const tile = this.world.get(ntx, nty);

                if (tile === TILE.BED) {
                    if (gameState.isNight && this.enemies.filter(e => e.active2).length === 0) {
                        this._startSleep();
                    } else if (!gameState.isNight) {
                        this.hud.showStatus('夜にしか眠れません！');
                    } else {
                        this.hud.showStatus('敵がいる間は眠れません！');
                    }
                    return;
                }
                if (tile === TILE.CHEST) {
                    // 村チェストかボーナスチェストか判定
                    const vcp = this.world.villageChestPos;
                    if (vcp && ntx === vcp.tx && nty === vcp.ty) {
                        if (!this.villageChestOpened) {
                            this._openVillageChest(ntx, nty);
                            this.villageChestOpened = true;
                        }
                    } else if (!this.chestOpened) {
                        this._openBonusChest();
                    }
                    return;
                }
                if (tile === TILE.BOX) {
                    this.craftUI.close();
                    this.furnaceUI.close();
                    this.storageUI.toggle();
                    return;
                }
                if (tile === TILE.FURNACE) {
                    this.craftUI.close();
                    this.storageUI.close();
                    this.furnaceUI.toggle();
                    return;
                }
            }
        }

        const sel = gameState.selectedItem;
        // ベッドを設置
        if (sel.item === ITEM.BED) {
            const placeTY = ty - 1;
            if (this.world.get(tx, placeTY) === TILE.AIR) {
                this._setTile(tx, placeTY, TILE.BED);
                gameState.consumeItem(ITEM.BED);
                EventBus.emit(Events.INVENTORY_CHANGED);
                this.hud.showStatus('ベッドを設置しました！（Eで使用）');
            }
        }
        // アイテムボックスを設置
        if (sel.item === ITEM.BOX) {
            const placeTY = ty - 1;
            if (this.world.get(tx, placeTY) === TILE.AIR) {
                this._setTile(tx, placeTY, TILE.BOX);
                gameState.consumeItem(ITEM.BOX);
                EventBus.emit(Events.INVENTORY_CHANGED);
                this.hud.showStatus('📦 ボックスを設置しました！（Eで開閉）');
            }
        }
        // かまどを設置
        if (sel.item === ITEM.FURNACE_ITEM) {
            const placeTY = ty - 1;
            if (this.world.get(tx, placeTY) === TILE.AIR) {
                this._setTile(tx, placeTY, TILE.FURNACE);
                gameState.consumeItem(ITEM.FURNACE_ITEM);
                EventBus.emit(Events.INVENTORY_CHANGED);
                this.hud.showStatus('🔥 かまどを設置しました！（Eで使用）');
            }
        }
    }

    // ---- ブロック破壊（タイルマップ更新） ----
    private _breakTile(tx: number, ty: number): void {
        const cell = this.world.getCell(tx, ty);
        if (!cell.breakable || cell.type === TILE.AIR) return;

        audioManager.sfx('break_block');
        this._setTile(tx, ty, TILE.AIR);

        const cx = (tx + 0.5) * TILE_PX;
        const cy = (ty + 0.5) * TILE_PX;
        this._blockBreakFX(cx, cy, TILE_COLORS[cell.type]);

        if (cell.drops) {
            this.droppedItems.push(new DroppedItem(this, cx, cy - 8 * PX, cell.drops));
        }
        EventBus.emit(Events.BLOCK_BREAK, { tx, ty });
    }

    // ワールドデータとTilemapを同期してタイルを変更する
    private _setTile(tx: number, ty: number, type: typeof TILE[keyof typeof TILE]): void {
        this.world.set(tx, ty, type);

        // Tilemapのタイルを更新（recalculate=false: 後で手動で計算する）
        const newIndex = type === TILE.AIR ? -1 : type;
        this.tilemap.putTileAt(newIndex, tx, ty, false, 0);

        // 新しいタイルの衝突フラグを確定する
        const t = this.tilemap.getTileAt(tx, ty, true, 0);
        if (t) {
            // 通過不可タイルのみ true
            const passable = type === TILE.AIR || type === TILE.LEAVES
                || type === TILE.WATER || type === TILE.BED || type === TILE.LAVA;
            t.setCollision(!passable);
        }
        // FURNACE は solid なので衝突を明示的に有効化（新規設置時）
        if (type === TILE.FURNACE && t) {
            t.setCollision(true);
        }

        // 自タイルと隣接4タイルの衝突面を再計算（露出した面に衝突を設定）
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 || dy === 0) {
                    this.tilemapLayer.calculateFacesAt(tx + dx, ty + dy);
                }
            }
        }
    }

    private _blockBreakFX(x: number, y: number, color: number): void {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (40 + Math.random() * 60) * PX;
            const p = this.add.rectangle(x, y, 5 * PX, 5 * PX, color).setDepth(50);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * spd,
                y: y + Math.sin(angle) * spd - 20 * PX,
                alpha: 0, scale: 0,
                duration: 400,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy(),
            });
        }
    }

    // ---- 武器ダメージ計算（クリティカル込み）Round 1 ----
    private _getAttackDamage(): { damage: number; isCrit: boolean } {
        const base = PLAYER.ATTACK_DAMAGE_BASE + (gameState.level - 1) * 3
            + gameState.bonusAttack;
        const sel = gameState.selectedItem;
        const weaponBonus: Record<string, number> = {
            'sword':         5,
            'axe':           3,
            'pickaxe':       1,
            'iron_sword':    12,
            'iron_pick':     4,
            'gold_sword':    20,
            'diamond_sword': 30,
            'diamond_pick':  8,
        };
        const raw = base + (sel.item ? (weaponBonus[sel.item] ?? 0) : 0);

        // クリティカル判定
        const isSword = sel.item === ITEM.SWORD || sel.item === ITEM.IRON_SWORD
            || sel.item === ITEM.DIAMOND_SWORD || sel.item === ITEM.GOLD_SWORD;
        const critChance = CRIT.CHANCE + (isSword ? CRIT.SWORD_BONUS : 0);
        const isCrit = Math.random() < critChance;
        return { damage: isCrit ? Math.round(raw * CRIT.MULTIPLIER) : raw, isCrit };
    }

    // ---- 攻撃 ----
    private _doPlayerAttackAt(wx: number, wy: number): void {
        if (!this.player.canAttack()) return;
        this.player.doAttack();
        audioManager.sfx('sword_swing');
        const range = PLAYER.ATTACK_RANGE * PX * 1.5;
        const { damage, isCrit } = this._getAttackDamage();
        this._dealDamage(wx, wy, range, damage, isCrit);
        this._attackFX(wx, wy, isCrit);
    }

    private _dealDamage(ax: number, ay: number, range: number, dmg: number, isCrit = false): void {
        let hitAny = false;
        for (const e of this.enemies) {
            if (!e.active2) continue;
            const d = Phaser.Math.Distance.Between(e.x, e.y, ax, ay);
            if (d < range) {
                audioManager.sfx('hit_enemy');
                e.takeDamage(dmg);
                e.knockback(ax);
                if (isCrit) {
                    // クリティカルヒット（Round 1）
                    this._showFloat(`💥CRIT! -${dmg}`, e.x, e.y - 16 * PX, '#ffdd00', 1.3);
                    this.cameras.main.shake(120, 0.012);
                    this._critFX(e.x, e.y);
                } else {
                    this._showFloat(`-${dmg}`, e.x, e.y - 10 * PX, '#ff4444');
                    this.cameras.main.shake(80, 0.007);
                }
                hitAny = true;
            }
        }
        for (const s of this.sheepList) {
            if (!s.active2) continue;
            const d = Phaser.Math.Distance.Between(s.x, s.y, ax, ay);
            if (d < range) {
                s.takeDamage(dmg);
                this._showFloat(`-${dmg}`, s.x, s.y - 10 * PX, '#ffaa44');
                hitAny = true;
            }
        }
        // ヒットストップ（命中時のみ55ms物理停止）
        if (hitAny) {
            this.physics.world.pause();
            this.time.delayedCall(isCrit ? 90 : 55, () => { this.physics.world.resume(); });
        }
    }

    private _attackFX(x: number, y: number, isCrit = false): void {
        const slash = this.add.graphics().setDepth(60);
        const color = isCrit ? 0xffdd44 : 0xffffff;
        slash.lineStyle(isCrit ? 4 * PX : 3 * PX, color, 0.9);
        slash.beginPath();
        slash.moveTo(x - 14 * PX, y - 14 * PX);
        slash.lineTo(x + 14 * PX, y + 14 * PX);
        slash.strokePath();
        if (isCrit) {
            slash.beginPath();
            slash.moveTo(x + 14 * PX, y - 14 * PX);
            slash.lineTo(x - 14 * PX, y + 14 * PX);
            slash.strokePath();
        }
        this.tweens.add({ targets: slash, alpha: 0, duration: 200, onComplete: () => slash.destroy() });
    }

    /** クリティカルヒットのスパークエフェクト（Round 1） */
    private _critFX(x: number, y: number): void {
        const colors = [0xffdd44, 0xffffff, 0xff8800];
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (70 + Math.random() * 80) * PX;
            const c = colors[i % colors.length];
            const p = this.add.circle(x, y, (2 + Math.random() * 3) * PX, c).setDepth(65);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * spd,
                y: y + Math.sin(angle) * spd - 15 * PX,
                alpha: 0, scale: 0,
                duration: 380 + Math.random() * 200,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy(),
            });
        }
        this.cameras.main.flash(80, 255, 220, 50, true);
    }

    // ---- 敵 ----
    private _spawnEnemies(delta: number): void {
        if (this.enemies.filter(e => e.active2).length >= DAY_NIGHT.MAX_ENEMIES) return;
        this.enemySpawnTimer -= delta;
        if (this.enemySpawnTimer > 0) return;
        this.enemySpawnTimer = DAY_NIGHT.ENEMY_SPAWN_INTERVAL;

        const ptx = Math.floor(this.player.x / TILE_PX);
        const pty = Math.floor(this.player.y / TILE_PX);

        // 地下（地表より下 20タイル以上）では BAT を優先スポーン
        const surfaceY = this.world.heights[Math.max(0, Math.min(this.world.W - 1, ptx))];
        const underground = pty > surfaceY + 5;

        // 廃鉱エリア（mine bounds内）
        const mb = this.world.mineBounds;
        const inMine = mb != null &&
            ptx >= mb.x1 && ptx <= mb.x2 &&
            pty >= mb.shaftY - 3 && pty <= mb.shaftY + 6;

        // 古代都市エリア（city bounds内）
        const inCity = this.world.cityBounds &&
            ptx >= this.world.cityBounds.x1 && ptx <= this.world.cityBounds.x2 &&
            pty >= this.world.cityBounds.y1 && pty <= this.world.cityBounds.y2;

        let kind: EnemyKind;
        if (inCity && !gameState.isNight) {
            kind = Math.random() < 0.6 ? 'GOLEM' : 'BAT';
        } else if (inMine || underground) {
            kind = Math.random() < 0.55 ? 'BAT' : 'ZOMBIE';
        } else if (gameState.isNight) {
            const kinds: EnemyKind[] = ['ZOMBIE', 'SKELETON', 'SPIDER'];
            kind = kinds[Math.floor(Math.random() * kinds.length)];
        } else {
            return; // 地上・昼は通常スポーンなし
        }

        // プレイヤーの左右どちらかに出現（一定距離）
        const side = Math.random() < 0.5 ? 1 : -1;
        const distX = (DAY_NIGHT.ENEMY_SPAWN_RADIUS_MIN + Math.random() *
            (DAY_NIGHT.ENEMY_SPAWN_RADIUS_MAX - DAY_NIGHT.ENEMY_SPAWN_RADIUS_MIN)) * PX;
        const ex = this.player.x + side * distX;
        const etx = Math.max(0, Math.min(this.world.W - 1, Math.floor(ex / TILE_PX)));

        let ey: number;
        if (kind === 'BAT') {
            // コウモリは空中に出現（プレイヤーの高さ近辺）
            ey = this.player.y - (20 + Math.random() * 40) * PX;
        } else {
            ey = (this.world.heights[etx] - 2) * TILE_PX;
        }

        const e = new Enemy(this, ex, Math.max(ey, 20 * PX), kind);
        // 夜が深まるほど敵が強化される（Day2以降から適用）
        if (gameState.dayCount > 1) e.scaleByNight(gameState.dayCount);
        // Round 8: エリート敵（12% 確率）
        if (Math.random() < ELITE.SPAWN_CHANCE && kind !== 'ANCIENT_BOSS') {
            e.makeElite();
        }
        this.physics.add.collider(e, this.tilemapLayer);
        this.enemies.push(e);
        EventBus.emit(Events.ENEMY_SPAWN, { kind });
    }

    private _updateEnemies(delta: number): void {
        this.enemies = this.enemies.filter(e => e.active && e.scene);
        for (const e of this.enemies) {
            if (!e.active2) continue;
            e.update(delta, this.player.x, this.player.y);
            const dist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
            if (e.canAttack(dist)) e.doAttack();
        }
    }

    // ---- 村人 ----
    private _spawnVillager(x: number, y: number): void {
        const names = ['農民', '商人', '老人'];
        const v = new Villager(this, x, y, names[this.villagers.length % 3]);
        this.physics.add.collider(v, this.tilemapLayer);
        this.villagers.push(v);
    }

    // ---- 羊 ----
    private _spawnSheep(x: number, y: number): void {
        const s = new Sheep(this, x, y);
        this.physics.add.collider(s, this.tilemapLayer);  // persistent collider
        this.sheepList.push(s);
    }

    private _updateSheep(delta: number): void {
        this.sheepList = this.sheepList.filter(s => s.active && s.scene);
        for (const s of this.sheepList) {
            if (!s.active2) continue;
            s.update(delta, this.player.x, this.player.y);
        }
        // 昼間に羊が減ったら補充
        if (!gameState.isNight && this.sheepList.filter(s => s.active2).length < 3) {
            const side = Math.random() < 0.5 ? 1 : -1;
            const spx = this.player.x + side * (250 + Math.random() * 150) * PX;
            const stx = Math.max(0, Math.min(this.world.W - 1, Math.floor(spx / TILE_PX)));
            const spy = (this.world.heights[stx] - 1) * TILE_PX;
            this._spawnSheep(spx, spy);
        }
    }

    // ---- 村人更新 ----
    private _updateVillagers(delta: number): void {
        this.villagers = this.villagers.filter(v => v.active && v.scene);
        let nearVillager: Villager | null = null;
        for (const v of this.villagers) {
            if (v.active2 && v.active) {
                v.update(delta, this.player.x, this.player.y);
                const dist = Phaser.Math.Distance.Between(v.x, v.y, this.player.x, this.player.y);
                if (dist < TILE_PX * 2) nearVillager = v;
            }
        }
        // 近くに村人がいれば会話プロンプトを表示（UI非表示時のみ）
        const anyUiOpen = this.craftUI.visible || this.storageUI.visible
            || this.furnaceUI.visible || this.villagerUI.visible;
        if (nearVillager && !anyUiOpen) {
            this.hud.showInteractHint(`[E] ${nearVillager.name}に話しかける`);
        } else {
            this.hud.hideInteractHint();
        }
    }

    // ---- ドロップ ----
    private _updateDrops(delta: number): void {
        this.droppedItems = this.droppedItems.filter(d => d.active && d.scene);
        for (const d of this.droppedItems) d.update(delta);
    }

    private _updatePickup(): void {
        const range = TILE_PX * 1.5;
        for (let i = this.droppedItems.length - 1; i >= 0; i--) {
            const d = this.droppedItems[i];
            if (!d.active || !d.scene) continue;
            if (Phaser.Math.Distance.Between(d.x, d.y, this.player.x, this.player.y) < range) {
                if (gameState.addItem(d.itemType, d.itemCount)) {
                    audioManager.sfx('pickup');
                    const itemName = ITEM_JP[d.itemType] ?? d.itemType;
                    this._showFloat(`+${d.itemCount} ${itemName}`, d.x, d.y, '#ffdd44');
                    EventBus.emit(Events.INVENTORY_CHANGED);
                    d.destroy();
                    this.droppedItems.splice(i, 1);
                }
            }
        }
    }

    // ---- 昼夜サイクル ----
    private _dayNightWarned = false;  // 夜近づき警告フラグ

    private _updateDayNight(delta: number): void {
        if (gameState.isSleeping) return;
        this.dayNightTimer += delta;
        const dur = gameState.isNight ? DAY_NIGHT.NIGHT_DURATION_MS : DAY_NIGHT.DAY_DURATION_MS;

        // 夜が近い警告（昼の残り30秒）
        if (!gameState.isNight) {
            const remaining = dur - this.dayNightTimer;
            if (remaining < 30000 && remaining > 29000 && !this._dayNightWarned) {
                this._dayNightWarned = true;
                this.hud.showStatus('⚠ 夜まであと30秒！ 準備を！', 4000);
            }
        }

        if (this.dayNightTimer >= dur) {
            this.dayNightTimer = 0;
            this._dayNightWarned = false;
            if (gameState.isNight) this._startDay();
            else this._startNight();
        }
    }

    private _startDay(): void {
        gameState.isNight = false;
        gameState.dayCount++;
        audioManager.sfx('day_start');
        this.cameras.main.flash(600, 255, 230, 150, true);
        EventBus.emit(Events.DAY_START, { day: gameState.dayCount });
        this.hud.showStatus(`☀ Day ${gameState.dayCount} 開始！`, 3000);

        // Round 9: 夜生存報酬
        this._nightSurvivedRewarded = false;
        this.time.delayedCall(1500, () => this._grantNightSurvivedReward());
        // 残存する敵を消滅（tweenを先にkillしてから破棄）
        for (const e of this.enemies) {
            if (e.active2) {
                e.active2 = false;
                this.tweens.killTweensOf(e);
                this.tweens.add({ targets: e, alpha: 0, duration: 800,
                    ease: 'Quad.easeIn',
                    onComplete: () => { if (e.active && e.scene) e.destroy(); },
                });
            }
        }
        this.enemies = [];
    }

    private _startNight(): void {
        gameState.isNight = true;
        this.enemySpawnTimer = 1500;
        this._nightSurvivedRewarded = false;
        this._streakCount = 0;
        audioManager.sfx('night_start');
        EventBus.emit(Events.NIGHT_START);
        this.cameras.main.flash(800, 0, 0, 60, true);
        // 夜数に応じた難易度メッセージ
        const night = gameState.dayCount;
        let msg = '🌙 夜が来た！敵が出現！';
        if (night >= 3 && night < 5) msg = `🌙 Night ${night}！敵が強化されている！`;
        else if (night >= 5 && night < 8) msg = `🌙 Night ${night}！危険度：高！`;
        else if (night >= 8) msg = `🌙 Night ${night}！極限の夜！生き延びろ！`;
        this.hud.showStatus(msg, 3500);
        // 敵スポーン演出（夜の始まりに小さな震動）
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 600, () => this.cameras.main.shake(150, 0.006));
        }
    }

    // ---- 睡眠 ----
    private _startSleep(): void {
        gameState.isSleeping = true;
        this.sleepTimer = DAY_NIGHT.SLEEP_DURATION_MS;
        audioManager.sfx('sleep_start');
        EventBus.emit(Events.SLEEP_START);
        this.sleepText.setText('💤 おやすみなさい...\n朝になるまであと10秒');
        this.tweens.add({ targets: this.sleepOverlay, alpha: 0.85, duration: 1000, ease: 'Quad.easeIn' });
    }

    private _updateSleep(delta: number): void {
        if (!gameState.isSleeping) return;
        this.sleepTimer -= delta;
        this.sleepText.setText(`💤 おやすみなさい...\n朝まで: ${Math.ceil(this.sleepTimer / 1000)}秒`);
        if (this.sleepTimer <= 0) this._wakeUp();
    }

    private _wakeUp(): void {
        gameState.isSleeping = false;
        gameState.isNight    = false;
        gameState.dayCount++;
        this.dayNightTimer   = 0;
        this._nightSurvivedRewarded = false;
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + 50);
        EventBus.emit(Events.SLEEP_END);
        EventBus.emit(Events.DAY_START, { day: gameState.dayCount });
        // 就寝後に自動セーブ
        gameState.save();
        this.hud.showStatus('💾 自動セーブ完了', 2000);
        for (const e of this.enemies) {
            e.active2 = false;
            this.tweens.killTweensOf(e);
            if (e.active && e.scene) e.destroy();
        }
        this.enemies = [];
        this.sleepText.setText('');
        this.tweens.add({ targets: this.sleepOverlay, alpha: 0, duration: 1500, ease: 'Quad.easeOut' });
        this.cameras.main.flash(800, 255, 230, 150, true);
        this.hud.showStatus(`☀ Day ${gameState.dayCount} おはようございます！ HP+50回復`, 3000);
    }

    // ---- 村チェスト ----
    private _openVillageChest(tx: number, ty: number): void {
        audioManager.sfx('chest_open');
        this._setTile(tx, ty, TILE.AIR);
        // 村チェストの内容：石炭 + 鉄鉱石 + エメラルド
        gameState.addItem(ITEM.COAL, 6);
        gameState.addItem(ITEM.IRON_ORE, 4);
        gameState.addItem(ITEM.EMERALD, 3);
        EventBus.emit(Events.INVENTORY_CHANGED);
        EventBus.emit(Events.CHEST_OPEN);
        const cx = (tx + 0.5) * TILE_PX;
        const cy = ty * TILE_PX;
        this._chestOpenFX(cx, cy);
        this.hud.showStatus('🏘 村チェストを開けた！ 石炭×6, 鉄鉱石×4, エメラルド×3 をゲット！', 4000);
    }

    // ---- ボーナスチェスト ----
    private _openBonusChest(): void {
        this.chestOpened = true;
        audioManager.sfx('chest_open');
        const cp = this.world.chestPos!;
        this._setTile(cp.tx, cp.ty, TILE.AIR);

        gameState.addItem(ITEM.SWORD);
        gameState.addItem(ITEM.AXE);
        gameState.addItem(ITEM.PICKAXE);
        gameState.addItem(ITEM.BOW);
        gameState.addItem(ITEM.ARROW, 64);
        EventBus.emit(Events.INVENTORY_CHANGED);
        EventBus.emit(Events.CHEST_OPEN);

        const cx = (cp.tx + 0.5) * TILE_PX;
        const cy = cp.ty * TILE_PX;
        this._chestOpenFX(cx, cy);
        this.cameras.main.shake(200, 0.015);
        this.cameras.main.flash(300, 255, 220, 100, true);
        this.hud.showStatus('🎁 チェストを開けた！ 剣・斧・ツルハシ・弓+矢×64 をゲット！', 5000);
    }

    private _chestOpenFX(x: number, y: number): void {
        const colors = [0xffdd44, 0xff8800, 0xffffff, 0x44ffdd];
        for (let i = 0; i < 28; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (50 + Math.random() * 90) * PX;
            const c = colors[i % colors.length];
            const p = this.add.circle(x, y, (3 + Math.random() * 3) * PX, c).setDepth(60);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * spd,
                y: y + Math.sin(angle) * spd - 30 * PX,
                alpha: 0, scale: 0.1,
                duration: 500 + Math.random() * 300,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy(),
            });
        }
    }

    // ---- イベントハンドラ ----
    private _onPlayerDied(): void {
        audioManager.sfx('player_die');
        gameState.gameOver = true;
        this.cameras.main.shake(400, 0.018);
        this.time.delayedCall(1500, () => {
            this.cameras.main.fade(800, 0, 0, 0);
            this.time.delayedCall(800, () => this.scene.start('GameOverScene'));
        });
    }

    private _onEnemyDied(data: { x: number; y: number; xp: number; kind: EnemyKind; isElite?: boolean }): void {
        audioManager.sfx('enemy_die');
        this.cameras.main.shake(90, 0.004);

        // Round 10: 敵死亡スパークエフェクト
        this._enemyDeathFX(data.x, data.y, data.kind);

        // 敵のドロップ
        const drops = this._getEnemyDrops(data.kind);
        const bonusDrops = data.isElite ? ELITE.DROP_BONUS : 0;
        for (const drop of drops) {
            const totalCount = drop.count + bonusDrops;
            const ox = data.x + (Math.random() - 0.5) * 18 * PX;
            this.droppedItems.push(new DroppedItem(this, ox, data.y, drop.item, totalCount));
        }
        // エリートは追加ドロップ
        if (data.isElite) {
            this.droppedItems.push(new DroppedItem(this, data.x, data.y, ITEM.IRON_ORE, 2));
            this._showFloat('👑 エリート討伐！', data.x, data.y - 30 * PX, '#ffdd44', 1.1);
        }

        // Round 4: キルストリーク XP倍率
        const streakMult = this._addKillToStreak();
        const finalXP = Math.round(data.xp * streakMult);
        const leveled = gameState.addXP(finalXP);
        if (leveled) {
            audioManager.sfx('level_up');
            EventBus.emit(Events.PLAYER_LEVEL_UP, { level: gameState.level });
            this.cameras.main.shake(200, 0.015);
            this.cameras.main.flash(200, 255, 220, 50, true);
            // Round 2: レベルアップ選択UI（ゲームをポーズして表示）
            this._levelChoicePending = true;
            this.time.delayedCall(400, () => {
                this.levelUpUI.show(() => {
                    this._levelChoicePending = false;
                    this._showFloat(`⬆ Lv.${gameState.level}！`, this.player.x, this.player.y - 40 * PX, '#ffdd44', 1.3);
                });
            });
        }
        this._showFloat('+XP', data.x, data.y, '#4488ff');
    }

    private _getEnemyDrops(kind: EnemyKind): Array<{ item: ItemType; count: number }> {
        const drops: Array<{ item: ItemType; count: number }> = [];
        if (kind === 'ZOMBIE' || kind === 'SKELETON') {
            if (Math.random() < 0.65)
                drops.push({ item: ITEM.STONE, count: 1 + Math.floor(Math.random() * 2) });
        }
        if (kind === 'SKELETON' && Math.random() < 0.45)
            drops.push({ item: ITEM.ARROW, count: 1 + Math.floor(Math.random() * 3) });
        if (kind === 'SPIDER' && Math.random() < 0.55)
            drops.push({ item: ITEM.WOOD, count: 1 });
        if (kind === 'BAT' && Math.random() < 0.35)
            drops.push({ item: ITEM.STONE, count: 1 });
        if (kind === 'GOLEM') {
            drops.push({ item: ITEM.STONE, count: 3 + Math.floor(Math.random() * 3) });
            if (Math.random() < 0.4)
                drops.push({ item: ITEM.IRON_ORE, count: 1 + Math.floor(Math.random() * 2) });
        }
        if (kind === 'ANCIENT_BOSS') {
            drops.push({ item: ITEM.IRON_ORE,  count: 20 });
            drops.push({ item: ITEM.STONE,     count: 30 });
            drops.push({ item: ITEM.WOOD,      count: 20 });
            drops.push({ item: ITEM.ARROW,     count: 64 });
            drops.push({ item: ITEM.DIAMOND,   count: 8  });
            drops.push({ item: ITEM.NETHERITE, count: 3  });  // ネザーライト確定ドロップ
        }
        return drops;
    }

    private _onSheepDied(data: { x: number; y: number; drops: ItemType; count: number }): void {
        this.droppedItems.push(new DroppedItem(this, data.x, data.y, data.drops, data.count));
        this._showFloat('🐑 羊毛ドロップ!', data.x, data.y, '#ffffff');
    }

    private _onEnemyAttack(data: { damage: number }): void {
        audioManager.sfx('hit_player');
        const defense = gameState.defense;
        this.player.takeDamage(data.damage);
        // 防具軽減フィードバック（10%以上軽減時）
        if (defense >= 0.1) {
            const blocked = Math.round(data.damage * defense);
            this._showFloat(`🛡 -${blocked}`, this.player.x + 20 * PX, this.player.y - 30 * PX, '#88ccff', 0.8);
        }
    }

    private _onTouchCraft(): void {
        if (!this.craftUI.visible) {
            this.storageUI.close();
            this.furnaceUI.close();
            this.villagerUI.close();
        }
        this.craftUI.toggle();
    }

    private _onCraftSuccess(data: { item: ItemType }): void {
        audioManager.sfx('craft_success');
        const itemName = ITEM_JP[data.item] ?? data.item;
        this.hud.showStatus(`✓ ${itemName} をクラフトしました！`, 2000);
    }

    private _onHotbarSelect(): void {
        const slot = gameState.selectedItem;
        if (slot.item) {
            const name = ITEM_JP[slot.item] ?? slot.item;
            this.hud.showStatus(name, 1200);
        }
    }

    // ---- ボスルーム入室チェック ----
    private _checkBossRoom(): void {
        if (this._bossSpawned || !this.world.cityBounds) return;
        const city = this.world.cityBounds;
        const ptx = Math.floor(this.player.x / TILE_PX);
        const pty = Math.floor(this.player.y / TILE_PX);
        // ボスチェンバー（下半分）に入ったら起動
        const bossY1 = Math.floor((city.y1 + city.y2) / 2);
        if (ptx >= city.x1 && ptx <= city.x2 && pty >= bossY1) {
            this._spawnBoss();
        }
    }

    // ---- ボスをスポーン ----
    private _spawnBoss(): void {
        this._bossSpawned = true;
        gameState.bossSpawned = true;
        gameState.bossAlive = true;
        gameState.bossMaxHp = ENEMY_TYPES.ANCIENT_BOSS.hp;
        gameState.bossHp = ENEMY_TYPES.ANCIENT_BOSS.hp;

        const city = this.world.cityBounds!;
        const bx = ((city.x1 + city.x2) / 2 + 0.5) * TILE_PX;
        const by = (city.y2 - 4) * TILE_PX;

        this.bossEnemy = new Enemy(this, bx, by, 'ANCIENT_BOSS');
        this.physics.add.collider(this.bossEnemy, this.tilemapLayer);  // persistent collider
        this.enemies.push(this.bossEnemy);

        // 演出
        audioManager.sfx('boss_roar');
        this.cameras.main.shake(600, 0.025);
        this.cameras.main.flash(800, 120, 0, 160, true);
        this.hud.showStatus('⚠ ANCIENT BOSS が現れた！', 5000);
        this._showFloat('⚠ BOSS BATTLE', bx, by - 60 * PX, '#ff4400', 1.6);

        // 警告エフェクト（赤い地響き線）
        for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 180, () => {
                this._stompFX(bx, by);
            });
        }
    }

    // ---- 溶岩ダメージ ----
    private _checkLavaDamage(delta: number): void {
        this._lavaTimer -= delta;
        if (this._lavaTimer > 0) return;
        this._lavaTimer = 500; // 0.5秒ごとにチェック

        const ptx = Math.floor(this.player.x / TILE_PX);
        const pty = Math.floor(this.player.y / TILE_PX);
        // プレイヤーの足元と体が溶岩に触れているか
        for (let dy = 0; dy <= 1; dy++) {
            if (this.world.get(ptx, pty + dy) === TILE.LAVA) {
                audioManager.sfx('lava_damage');
                this.player.takeDamage(BOSS.STOMP_DAMAGE / 3);
                this.cameras.main.flash(200, 255, 80, 0, true);
                this._showFloat('🔥 溶岩ダメージ!', this.player.x, this.player.y - 20 * PX, '#ff6600');
                return;
            }
        }
    }

    // ---- ボスのストンプAoE ----
    private _onBossStomp(data: { x: number; y: number }): void {
        audioManager.sfx('boss_stomp');
        this._stompFX(data.x, data.y);
        this.cameras.main.shake(350, 0.02);

        // プレイヤーへの範囲ダメージ
        const radius = BOSS.STOMP_RADIUS_TILES * TILE_PX;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, data.x, data.y);
        if (dist < radius) {
            const dmg = Math.round(BOSS.STOMP_DAMAGE * (1 - dist / radius * 0.6));
            this.player.takeDamage(dmg);
            this._showFloat(`🌊 -${dmg}`, this.player.x, this.player.y - 20 * PX, '#ff2200', 1.2);
        }
    }

    // ---- ボスフェーズ2 ----
    private _onBossPhase2(): void {
        audioManager.sfx('boss_roar');
        this.cameras.main.shake(500, 0.03);
        this.cameras.main.flash(600, 200, 0, 80, true);
        this.hud.showStatus('⚡ ボスが激怒した！', 4000);
        this._showFloat('PHASE 2', this.player.x, this.player.y - 60 * PX, '#ff0000', 1.8);
    }

    // ---- ボス撃破 ----
    private _onBossDefeated(data: { x: number; y: number }): void {
        gameState.bossAlive = false;
        gameState.bossDefeated = true;
        // _victory は true にしない → ゲーム継続

        audioManager.sfx('boss_die');
        this.cameras.main.shake(800, 0.035);
        this.cameras.main.flash(1000, 255, 220, 100, true);

        // 大量のドロップ（ネザーライト含む）
        const drops = this._getEnemyDrops('ANCIENT_BOSS');
        for (const drop of drops) {
            const ox = data.x + (Math.random() - 0.5) * 80 * PX;
            this.droppedItems.push(new DroppedItem(this, ox, data.y, drop.item, drop.count));
        }

        // 大量XP
        const leveled = gameState.addXP(500);
        if (leveled) {
            audioManager.sfx('level_up');
            EventBus.emit(Events.PLAYER_LEVEL_UP, { level: gameState.level });
        }

        // 勝利演出（ゲームは継続）
        this._showFloat('✨ BOSS DEFEATED!', data.x, data.y - 80 * PX, '#ffdd44', 2.0);
        this.hud.showStatus('🏆 ANCIENT BOSS を倒した！冒険を続けよう！', 8000);

        // 爆発エフェクト
        for (let i = 0; i < 12; i++) {
            this.time.delayedCall(i * 120, () => {
                const ox = data.x + (Math.random() - 0.5) * 60 * PX;
                const oy = data.y + (Math.random() - 0.5) * 60 * PX;
                this._blockBreakFX(ox, oy, 0xff6600);
            });
        }

        // 自動セーブ
        this.time.delayedCall(3000, () => {
            gameState.save();
            this.hud.showStatus('💾 セーブしました！', 2000);
        });
    }

    // ---- 地響きエフェクト ----
    private _stompFX(x: number, y: number): void {
        const g = this.add.graphics().setDepth(80);
        const maxR = BOSS.STOMP_RADIUS_TILES * TILE_PX;
        let r = 0;
        const expand = this.time.addEvent({
            delay: 16,
            repeat: 20,
            callback: () => {
                r += maxR / 20;
                g.clear();
                g.lineStyle(3 * PX, 0xff4400, 0.7 * (1 - r / maxR));
                g.strokeCircle(x, y, r);
                g.lineStyle(2 * PX, 0xff8800, 0.4 * (1 - r / maxR));
                g.strokeCircle(x, y, r * 0.7);
            },
        });
        this.time.delayedCall(360, () => {
            expand.remove();
            g.destroy();
        });
    }

    // ============================
    // Round 4: キルストリーク（Hades スタイル）
    // ============================
    private _updateStreak(delta: number): void {
        if (this._streakCount === 0) return;
        this._streakTimer -= delta;
        if (this._streakTimer <= 0) {
            this._streakCount = 0;
            this.hud.showCombo(0);
        }
    }

    private _addKillToStreak(): number {
        this._streakCount++;
        this._streakTimer = this.STREAK_WINDOW_MS;
        this.hud.showCombo(this._streakCount);
        // XP倍率（コンボ数に応じて）
        const mult = this._streakCount >= 8 ? 3 : this._streakCount >= 5 ? 2 : this._streakCount >= 3 ? 1.5 : 1;
        return mult;
    }

    // ============================
    // Round 5: 洞窟暗闇 + 光源（Terraria スタイル）
    // ============================
    private _updateCaveDarkness(): void {
        const ptx = Math.floor(this.player.x / TILE_PX);
        const ptxClamped = Math.max(0, Math.min(this.world.W - 1, ptx));
        const surfaceY = this.world.heights[ptxClamped] ?? 38;
        const pty = this.player.y / TILE_PX;
        const depthBelow = pty - surfaceY;

        // 地表 +4 タイル以下から暗くなり始め、+12 タイルで最大
        const targetAlpha = Math.max(0, Math.min(1, (depthBelow - 4) / 8)) * 0.82;
        this._caveAlpha += (targetAlpha - this._caveAlpha) * 0.05;

        const g = this._caveOverlay;
        g.clear();
        if (this._caveAlpha < 0.02) {
            this._caveLight.clear();
            return;
        }

        g.fillStyle(0x000011, this._caveAlpha);
        g.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);

        // プレイヤー光源（加算ブレンドで明るく）
        const screenX = this.player.x - this.cameras.main.scrollX;
        const screenY = this.player.y - this.cameras.main.scrollY;
        const lightR = 120 * PX;
        const lg = this._caveLight;
        lg.clear();
        // 外側から内側に向けて段階的な光リング
        const rings = 6;
        for (let i = rings; i >= 1; i--) {
            const r = lightR * (i / rings);
            const a = (1 - i / rings) * this._caveAlpha * 0.9;
            lg.fillStyle(0x334466, a);
            lg.fillCircle(screenX, screenY, r);
        }
        // 中心部の明るい白い光
        lg.fillStyle(0xffffff, this._caveAlpha * 0.12);
        lg.fillCircle(screenX, screenY, lightR * 0.28);
    }

    // ============================
    // Round 7: ポーズメニュー（ESC キー）
    // ============================
    private _pauseGame(): void {
        if (this._paused) return;
        this._paused = true;
        this.physics.world.pause();
        EventBus.emit(Events.GAME_PAUSED);

        const w = GAME.WIDTH, h = GAME.HEIGHT;
        this._pauseContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(800);

        const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.72).setScrollFactor(0);
        const title = this.add.text(w / 2, h * 0.3, '⏸ PAUSE', {
            fontSize: `${22 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffffff', stroke: '#000', strokeThickness: 4 * PX,
        }).setOrigin(0.5).setScrollFactor(0);

        const resumeBtn = this._makePauseButton(w / 2, h * 0.48, '▶ 再開', 0x224422, 0x44aa44, () => this._resumeGame());
        const restartBtn = this._makePauseButton(w / 2, h * 0.58, '↺ リスタート', 0x442222, 0xaa4444, () => {
            this._resumeGame();
            this.time.delayedCall(100, () => {
                gameState.reset();
                this.scene.restart();
            });
        });
        const titleBtn = this._makePauseButton(w / 2, h * 0.68, '🏠 タイトル', 0x222244, 0x4444aa, () => {
            this._resumeGame();
            gameState.reset();
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('TitleScene'));
        });

        this._pauseContainer.add([overlay, title, resumeBtn, restartBtn, titleBtn]);
        this._pauseContainer.setAlpha(0);
        this.tweens.add({ targets: this._pauseContainer, alpha: 1, duration: 200 });
    }

    private _resumeGame(): void {
        if (!this._paused) return;
        this._paused = false;
        this.physics.world.resume();
        EventBus.emit(Events.GAME_RESUMED);
        this.tweens.add({
            targets: this._pauseContainer,
            alpha: 0, duration: 150,
            onComplete: () => {
                this._pauseContainer?.destroy();
                this._pauseContainer = undefined;
            },
        });
    }

    private _makePauseButton(x: number, y: number, label: string, colorN: number, colorH: number, cb: () => void): Phaser.GameObjects.Container {
        const bw = 180 * PX, bh = 36 * PX;
        const con = this.add.container(x, y).setScrollFactor(0);
        const bg = this.add.graphics();
        const draw = (c: number) => {
            bg.clear();
            bg.fillStyle(c, 0.92);
            bg.lineStyle(1 * PX, 0xaabbcc, 0.5);
            bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 6 * PX);
            bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 6 * PX);
        };
        draw(colorN);
        const txt = this.add.text(0, 0, label, {
            fontSize: `${11 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffffff', stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5).setScrollFactor(0);
        con.add([bg, txt]);
        bg.setScrollFactor(0).setInteractive(new Phaser.Geom.Rectangle(-bw / 2, -bh / 2, bw, bh), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerover', () => { draw(colorH); this.tweens.add({ targets: con, scaleX: 1.04, scaleY: 1.04, duration: 80 }); });
        bg.on('pointerout',  () => { draw(colorN); this.tweens.add({ targets: con, scaleX: 1, scaleY: 1, duration: 80 }); });
        bg.on('pointerdown', cb);
        return con;
    }

    // ============================
    // Round 9: 夜生存報酬（Terraria スタイル）
    // ============================
    private _grantNightSurvivedReward(): void {
        if (this._nightSurvivedRewarded) return;
        this._nightSurvivedRewarded = true;

        // ランダムな素材ドロップ
        const px = this.player.x;
        const py = this.player.y;
        const rewards: ItemType[] = [ITEM.STONE, ITEM.WOOD, ITEM.IRON_ORE, ITEM.COAL, ITEM.ARROW];
        const chosen = rewards[Math.floor(Math.random() * rewards.length)];
        const count = 5 + Math.floor(Math.random() * 8);

        const drop = new DroppedItem(this, px + (Math.random() - 0.5) * 40 * PX, py - 20 * PX, chosen, count);
        this.droppedItems.push(drop);

        // ボーナスXP（生存日数に応じて）
        const bonusXP = gameState.dayCount * 2;
        const leveled = gameState.addXP(bonusXP);

        // 演出
        const itemName = chosen;
        this._showFloat(`🌅 夜を乗り越えた！ +${bonusXP}XP`, px, py - 50 * PX, '#ffdd44', 1.1);
        this._chestOpenFX(px, py - 20 * PX);
        if (leveled) {
            audioManager.sfx('level_up');
            this._levelChoicePending = true;
            this.time.delayedCall(600, () => {
                this.levelUpUI.show(() => { this._levelChoicePending = false; });
            });
        }
        EventBus.emit(Events.NIGHT_SURVIVED, { day: gameState.dayCount });
        void itemName;
    }

    // ============================
    // Round 4: ブロック採掘進行度（Minecraft スタイル）
    // ============================
    private _updateMining(delta: number): void {
        const pointer = this.input.activePointer;
        const anyUiOpen = this.craftUI.visible || this.storageUI.visible
            || this.furnaceUI.visible || this.villagerUI.visible || this._levelChoicePending || this.helpUI.visible;

        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isTouchMining = isMobile && this.player.touchAttack;
        const isActive = pointer.isDown || isTouchMining;

        if (!isActive || anyUiOpen) {
            if (this._miningState) {
                this._miningState = null;
                this._miningGfx.clear();
            }
            return;
        }

        // 採掘対象タイルを決定
        let tx: number;
        let ty: number;

        if (isTouchMining) {
            // モバイル: プレイヤーの向き方向で最も近い採掘可能ブロックを探す
            const result = this._getMobileMiningTarget();
            if (!result) {
                this._miningState = null;
                this._miningGfx.clear();
                return;
            }
            tx = result.tx;
            ty = result.ty;
        } else {
            const wx = pointer.worldX;
            const wy = pointer.worldY;
            const distPx = Math.hypot(wx - this.player.x, wy - this.player.y);
            if (distPx >= PLAYER.REACH_TILES * TILE_PX) {
                this._miningState = null;
                this._miningGfx.clear();
                return;
            }
            tx = Math.floor(wx / TILE_PX);
            ty = Math.floor(wy / TILE_PX);
        }

        const cell = this.world.getCell(tx, ty);
        if (!cell.breakable || cell.type === TILE.AIR) {
            this._miningState = null;
            this._miningGfx.clear();
            return;
        }

        // 対象が変わったらリセット
        if (!this._miningState || this._miningState.tx !== tx || this._miningState.ty !== ty) {
            const total = MINE_DURATION[cell.type] ?? 800;
            this._miningState = { tx, ty, progress: 0, total };
        }

        // ツール倍率を適用して進行
        const mult = this._getMiningMultiplier(cell.type);
        this._miningState.progress += delta * mult;

        // ひび割れ描画
        const ratio = Math.min(1, this._miningState.progress / this._miningState.total);
        this._drawMiningCrack(tx, ty, ratio);

        // 採掘完了
        if (this._miningState.progress >= this._miningState.total) {
            this._miningGfx.clear();
            this._miningState = null;
            this._breakTile(tx, ty);
        }
    }

    /** モバイル採掘: プレイヤーの向き方向で最寄りの採掘可能ブロックを検索 */
    private _getMobileMiningTarget(): { tx: number; ty: number } | null {
        const px = this.player.tileX;
        const py = this.player.tileY;
        const fx = this.player.facing;
        for (let d = 1; d <= PLAYER.REACH_TILES; d++) {
            for (const dy of [0, -1, 1]) {
                const cx = px + fx * d;
                const cy = py + dy;
                const c = this.world.getCell(cx, cy);
                if (c.breakable && c.type !== TILE.AIR) {
                    return { tx: cx, ty: cy };
                }
            }
        }
        return null;
    }

    /** ツール別採掘倍率（Minecraft スタイル） */
    private _getMiningMultiplier(tileType: TileType): number {
        const item = gameState.selectedItem.item;
        if (!item) return 1;

        const isWood  = tileType === TILE.WOOD_LOG || tileType === TILE.LEAVES || tileType === TILE.BED;
        const stoneTypes: TileType[] = [
            TILE.STONE, TILE.ORE, TILE.COAL_ORE, TILE.DIAMOND_ORE,
            TILE.GOLD_ORE, TILE.EMERALD_ORE, TILE.ANCIENT_BRICK,
            TILE.FURNACE, TILE.BOX,
        ];
        const isStone = stoneTypes.includes(tileType);

        if (item === ITEM.DIAMOND_PICK) return 10;
        if (item === ITEM.IRON_PICK)    return isStone ? 6 : (isWood ? 2 : 3);
        if (item === ITEM.PICKAXE)      return isStone ? 3 : 1;
        if (item === ITEM.AXE)          return isWood  ? 3 : 1;
        if (item === ITEM.DIAMOND_SWORD || item === ITEM.GOLD_SWORD) return 1.5;
        if (item === ITEM.IRON_SWORD)   return 1.3;
        return 1;
    }

    /** 採掘進行度に応じたひび割れオーバーレイ */
    private _drawMiningCrack(tx: number, ty: number, progress: number): void {
        const g = this._miningGfx;
        g.clear();
        if (progress <= 0) return;

        const bx = tx * TILE_PX;
        const by = ty * TILE_PX;
        const ts = TILE_PX;
        const stage = Math.floor(progress * 4);  // 0〜3

        // 暗いオーバーレイ（進行に応じて濃くなる）
        g.fillStyle(0x000000, progress * 0.45);
        g.fillRect(bx, by, ts, ts);

        // ひびパターン（段階的に増える）
        g.lineStyle(Math.max(1, 2 * PX * progress), 0x000000, 0.55 + progress * 0.4);

        if (stage >= 1) {
            g.beginPath();
            g.moveTo(bx + ts * 0.25, by + ts * 0.2);
            g.lineTo(bx + ts * 0.6,  by + ts * 0.55);
            g.strokePath();
        }
        if (stage >= 2) {
            g.beginPath();
            g.moveTo(bx + ts * 0.6,  by + ts * 0.2);
            g.lineTo(bx + ts * 0.3,  by + ts * 0.7);
            g.strokePath();
            g.beginPath();
            g.moveTo(bx + ts * 0.5,  by + ts * 0.5);
            g.lineTo(bx + ts * 0.85, by + ts * 0.72);
            g.strokePath();
        }
        if (stage >= 3) {
            g.beginPath();
            g.moveTo(bx + ts * 0.18, by + ts * 0.42);
            g.lineTo(bx + ts * 0.48, by + ts * 0.82);
            g.strokePath();
            g.beginPath();
            g.moveTo(bx + ts * 0.72, by + ts * 0.28);
            g.lineTo(bx + ts * 0.42, by + ts * 0.58);
            g.strokePath();
        }
    }

    // ============================
    // Round 10: 死亡スパークエフェクト（商用品質ポリッシュ）
    // ============================
    private _enemyDeathFX(x: number, y: number, kind: EnemyKind): void {
        const def = ENEMY_TYPES[kind];
        const colors = [def.color, def.eyeColor, 0xffffff];
        const count = kind === 'ANCIENT_BOSS' ? 24 : kind === 'GOLEM' ? 16 : 10;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const spd = (50 + Math.random() * 90) * PX;
            const c = colors[i % colors.length];
            const size = (2 + Math.random() * 4) * PX;
            const p = this.add.rectangle(x, y, size, size, c).setDepth(70).setRotation(Math.random() * Math.PI);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * spd,
                y: y + Math.sin(angle) * spd - 20 * PX,
                rotation: Math.random() * Math.PI * 3,
                alpha: 0, scale: 0,
                duration: 400 + Math.random() * 300,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy(),
            });
        }
        // ゴーストリング（ボス専用）
        if (kind === 'ANCIENT_BOSS') {
            const ring = this.add.graphics().setDepth(71);
            let r = 0;
            const expand = this.time.addEvent({
                delay: 16, repeat: 18,
                callback: () => {
                    r += 12 * PX;
                    ring.clear();
                    ring.lineStyle(3 * PX, 0xaa00ff, 1 - r / (216 * PX));
                    ring.strokeCircle(x, y, r);
                },
            });
            this.time.delayedCall(320, () => { expand.remove(); ring.destroy(); });
        }
    }

    // ---- ユーティリティ ----
    private _showFloat(text: string, x: number, y: number, color: string, scale = 1.0): void {
        const t = this.add.text(x, y, text, {
            fontSize: `${10 * PX * scale}px`,
            fontFamily: UI.FONT_FAMILY,
            color, stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5).setDepth(200);
        this.tweens.add({
            targets: t,
            y: y - 32 * PX, alpha: 0,
            duration: 1100,
            ease: 'Quad.easeOut',
            onComplete: () => t.destroy(),
        });
    }
}
