// ============================
// CraftingUI — クラフト画面（タブ式・ページネーション）
// ============================
import Phaser from 'phaser';
import { GAME, PALETTE, UI, PX, CRAFT, ITEM, ItemType } from '../core/Constants';
import { gameState } from '../core/GameState';
import { EventBus, Events } from '../core/EventBus';

type TabKey = 'weapon' | 'armor' | 'build';

interface RecipeDef {
    name: string;
    materials: string;
    craft: () => void;
    canCraft?: () => boolean;
    isSpecial?: boolean;
}

interface BtnEntry {
    gfx: Phaser.GameObjects.Graphics;
    rect: Phaser.Geom.Rectangle;
    tabKey: TabKey;
}

const PANEL_W      = 380;   // 設計px
const PANEL_H      = 560;
const ROW_H        = 50;    // レシピ行高さ（設計px）
const PER_PAGE     = 8;     // 1ページあたりの表示件数

export class CraftingUI {
    private scene: Phaser.Scene;
    private container!: Phaser.GameObjects.Container;
    visible = false;

    private _currentTab: TabKey = 'weapon';
    private _tabContainers: Map<TabKey, Phaser.GameObjects.Container> = new Map();
    private _tabBgs: Map<TabKey, Phaser.GameObjects.Graphics> = new Map();
    private _tabBgList: Phaser.GameObjects.Graphics[] = [];

    // ページネーション
    private _tabPage: Map<TabKey, number> = new Map([['weapon', 0], ['armor', 0], ['build', 0]]);
    private _recipeContainers: Map<TabKey, Phaser.GameObjects.Container> = new Map();
    private _pageTexts: Map<TabKey, Phaser.GameObjects.Text> = new Map();
    private _prevBtns: Map<TabKey, { gfx: Phaser.GameObjects.Graphics; rect: Phaser.Geom.Rectangle }> = new Map();
    private _nextBtns: Map<TabKey, { gfx: Phaser.GameObjects.Graphics; rect: Phaser.Geom.Rectangle }> = new Map();

    // 全クラフトボタン（表示タブ以外は disableInteractive）
    private _allBtns: BtnEntry[] = [];

    // タブ選択ボタン
    private _tabBgsByKey: { gfx: Phaser.GameObjects.Graphics; rect: Phaser.Geom.Rectangle; key: TabKey }[] = [];

    // パネル寸法（_build 後に確定）
    private _panelW = 0;
    private _contentStartY = 0; // container local Y でのコンテンツ開始位置
    private _navY = 0;           // ページナビゲーション Y

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._build();
        this.container.setVisible(false);
        EventBus.on(Events.INVENTORY_CHANGED, this._onInventoryChanged, this);
    }

    private _build(): void {
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;
        const w  = PANEL_W * PX;
        const h  = PANEL_H * PX;
        this._panelW = w;

        this.container = this.scene.add.container(cx, cy);
        this.container.setScrollFactor(0).setDepth(300);

        // ---- 背景パネル ----
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0d0d1a, 0.97);
        bg.lineStyle(2 * PX, 0x334466);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        // 上部ハイライト
        bg.fillStyle(0xffffff, 0.03);
        bg.fillRoundedRect(-w / 2 + 2 * PX, -h / 2 + 2 * PX, w - 4 * PX, h * 0.12, 6 * PX);
        this.container.add(bg);

        // ---- タイトル ----
        this.container.add(
            this.scene.add.text(0, -h / 2 + 16 * PX, '⚒ クラフト', {
                fontSize: `${13 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: PALETTE.TEXT_YELLOW, stroke: '#000', strokeThickness: 2 * PX,
            }).setOrigin(0.5),
        );

        // ---- タブボタン ----
        const tabs: Array<{ key: TabKey; label: string }> = [
            { key: 'weapon', label: '⚔ 武器・道具' },
            { key: 'armor',  label: '🛡 防具' },
            { key: 'build',  label: '🏗 建築' },
        ];
        const tabW = w / 3;
        const tabH = 24 * PX;
        const tabY = -h / 2 + 34 * PX;

        for (let ti = 0; ti < tabs.length; ti++) {
            const { key, label } = tabs[ti];
            const tabX = -w / 2 + ti * tabW + tabW / 2;
            const tabBg = this.scene.add.graphics();
            this._drawTabBg(tabBg, tabX, tabY, tabW, tabH, key === this._currentTab);
            this._tabBgs.set(key, tabBg);
            this.container.add(tabBg);

            const tabText = this.scene.add.text(tabX, tabY, label, {
                fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: key === this._currentTab ? PALETTE.TEXT_YELLOW : PALETTE.TEXT_GRAY,
            }).setOrigin(0.5);
            this.container.add(tabText);

            const tabRect = new Phaser.Geom.Rectangle(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH);
            tabBg.setScrollFactor(0).disableInteractive();
            this._tabBgList.push(tabBg);
            this._tabBgsByKey.push({ gfx: tabBg, rect: tabRect, key });
            (tabBg as any).__tabRect = tabRect;
            (tabBg as any).__tabText = tabText;
            (tabBg as any).__tabKey  = key;

            tabBg.on('pointerdown', () => this._selectTab(key));
            tabBg.on('pointerover', () => tabText.setColor(PALETTE.TEXT_WHITE));
            tabBg.on('pointerout',  () => {
                tabText.setColor(this._currentTab === key ? PALETTE.TEXT_YELLOW : PALETTE.TEXT_GRAY);
            });
        }

        // ---- コンテンツエリア開始Y ----
        const contentY = tabY + tabH / 2 + 6 * PX;   // タブ下 + 余白
        this._contentStartY = contentY;

        // ---- ページナビ Y（パネル下部） ----
        this._navY = h / 2 - 28 * PX;

        // ---- ヒントテキスト ----
        this.container.add(
            this.scene.add.text(0, h / 2 - 10 * PX, '[C でクローズ]', {
                fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            }).setOrigin(0.5),
        );

        // ---- 各タブコンテナ初期構築 ----
        for (const { key } of tabs) {
            const tc = this.scene.add.container(0, 0);
            tc.setVisible(key === this._currentTab);
            this._tabContainers.set(key, tc);
            this.container.add(tc);
            this._buildPageNav(key, w);
            this._buildRecipePage(key);
        }
    }

    // ---- タブ背景描画 ----
    private _drawTabBg(
        g: Phaser.GameObjects.Graphics,
        cx: number, cy: number, w: number, h: number, active: boolean,
    ): void {
        g.clear();
        g.fillStyle(active ? 0x2a2244 : 0x111122, active ? 1 : 0.7);
        g.lineStyle(1 * PX, active ? 0x6666cc : 0x333355);
        g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 3 * PX);
        g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 3 * PX);
    }

    // ---- ページナビゲーション（各タブに1セット） ----
    private _buildPageNav(key: TabKey, w: number): void {
        const tc = this._tabContainers.get(key)!;
        const navY = this._navY;
        const btnW = 56 * PX;
        const btnH = 22 * PX;

        // ◀ 前ページ
        const prevGfx = this.scene.add.graphics();
        const prevRect = new Phaser.Geom.Rectangle(-btnW * 2.2, navY - btnH / 2, btnW, btnH);
        const drawPrev = (hover: boolean, active: boolean) => {
            prevGfx.clear();
            const c = !active ? 0x333344 : hover ? 0x5566aa : 0x334488;
            prevGfx.fillStyle(c, active ? 0.9 : 0.4);
            prevGfx.lineStyle(1 * PX, active ? 0x6688cc : 0x444455);
            prevGfx.fillRoundedRect(-btnW * 2.2, navY - btnH / 2, btnW, btnH, 4 * PX);
            prevGfx.strokeRoundedRect(-btnW * 2.2, navY - btnH / 2, btnW, btnH, 4 * PX);
        };
        drawPrev(false, false);
        prevGfx.disableInteractive();
        prevGfx.on('pointerover', () => { const a = (this._tabPage.get(key) ?? 0) > 0; drawPrev(true, a); });
        prevGfx.on('pointerout',  () => { const a = (this._tabPage.get(key) ?? 0) > 0; drawPrev(false, a); });
        prevGfx.on('pointerdown', () => {
            const p = this._tabPage.get(key) ?? 0;
            if (p > 0) { this._tabPage.set(key, p - 1); this._buildRecipePage(key); }
        });
        const prevText = this.scene.add.text(-btnW * 2.2 + btnW / 2, navY, '◀', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#8899bb',
        }).setOrigin(0.5);
        tc.add([prevGfx, prevText]);
        this._prevBtns.set(key, { gfx: prevGfx, rect: prevRect });
        void drawPrev;

        // ページ表示
        const pageText = this.scene.add.text(0, navY, '1 / 1', {
            fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
        }).setOrigin(0.5);
        tc.add(pageText);
        this._pageTexts.set(key, pageText);

        // ▶ 次ページ
        const nextGfx = this.scene.add.graphics();
        const nextRect = new Phaser.Geom.Rectangle(btnW * 1.2, navY - btnH / 2, btnW, btnH);
        const drawNext = (hover: boolean, active: boolean) => {
            nextGfx.clear();
            const c = !active ? 0x333344 : hover ? 0x5566aa : 0x334488;
            nextGfx.fillStyle(c, active ? 0.9 : 0.4);
            nextGfx.lineStyle(1 * PX, active ? 0x6688cc : 0x444455);
            nextGfx.fillRoundedRect(btnW * 1.2, navY - btnH / 2, btnW, btnH, 4 * PX);
            nextGfx.strokeRoundedRect(btnW * 1.2, navY - btnH / 2, btnW, btnH, 4 * PX);
        };
        drawNext(false, false);
        nextGfx.disableInteractive();
        nextGfx.on('pointerover', () => {
            const allR = this._getRecipes(key);
            const p = this._tabPage.get(key) ?? 0;
            const total = Math.ceil(allR.length / PER_PAGE);
            drawNext(true, p < total - 1);
        });
        nextGfx.on('pointerout', () => {
            const allR = this._getRecipes(key);
            const p = this._tabPage.get(key) ?? 0;
            const total = Math.ceil(allR.length / PER_PAGE);
            drawNext(false, p < total - 1);
        });
        nextGfx.on('pointerdown', () => {
            const allR = this._getRecipes(key);
            const p = this._tabPage.get(key) ?? 0;
            const total = Math.ceil(allR.length / PER_PAGE);
            if (p < total - 1) { this._tabPage.set(key, p + 1); this._buildRecipePage(key); }
        });
        const nextText = this.scene.add.text(btnW * 1.2 + btnW / 2, navY, '▶', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#8899bb',
        }).setOrigin(0.5);
        tc.add([nextGfx, nextText]);
        this._nextBtns.set(key, { gfx: nextGfx, rect: nextRect });
        void drawNext;
    }

    // ---- 現在ページのレシピを再構築 ----
    private _buildRecipePage(key: TabKey): void {
        const tc = this._tabContainers.get(key)!;

        // 古いレシピコンテナを破棄
        const old = this._recipeContainers.get(key);
        if (old) {
            this._allBtns = this._allBtns.filter(b => b.tabKey !== key);
            old.destroy();
        }

        // 新しいレシピコンテナ
        const rc = this.scene.add.container(0, 0);
        tc.add(rc);
        this._recipeContainers.set(key, rc);

        const allRecipes = this._getRecipes(key);
        const page  = this._tabPage.get(key) ?? 0;
        const total = Math.ceil(allRecipes.length / PER_PAGE);
        const start = page * PER_PAGE;
        const end   = Math.min(start + PER_PAGE, allRecipes.length);

        // ページ数テキスト更新
        const pageTxt = this._pageTexts.get(key);
        if (pageTxt) pageTxt.setText(`${page + 1} / ${total}`);

        // ページナビボタン有効/無効
        const prevBtn = this._prevBtns.get(key);
        const nextBtn = this._nextBtns.get(key);

        const updateNavButtons = () => {
            if (prevBtn) {
                const a = page > 0;
                prevBtn.gfx.clear();
                const c = !a ? 0x333344 : 0x334488;
                prevBtn.gfx.fillStyle(c, a ? 0.9 : 0.4);
                prevBtn.gfx.lineStyle(1 * PX, a ? 0x6688cc : 0x444455);
                const r = prevBtn.rect;
                prevBtn.gfx.fillRoundedRect(r.x, r.y, r.width, r.height, 4 * PX);
                prevBtn.gfx.strokeRoundedRect(r.x, r.y, r.width, r.height, 4 * PX);
                if (this.visible && this._currentTab === key) {
                    if (a) prevBtn.gfx.setInteractive(prevBtn.rect, Phaser.Geom.Rectangle.Contains);
                    else prevBtn.gfx.disableInteractive();
                }
            }
            if (nextBtn) {
                const a = page < total - 1;
                nextBtn.gfx.clear();
                const c = !a ? 0x333344 : 0x334488;
                nextBtn.gfx.fillStyle(c, a ? 0.9 : 0.4);
                nextBtn.gfx.lineStyle(1 * PX, a ? 0x6688cc : 0x444455);
                const r = nextBtn.rect;
                nextBtn.gfx.fillRoundedRect(r.x, r.y, r.width, r.height, 4 * PX);
                nextBtn.gfx.strokeRoundedRect(r.x, r.y, r.width, r.height, 4 * PX);
                if (this.visible && this._currentTab === key) {
                    if (a) nextBtn.gfx.setInteractive(nextBtn.rect, Phaser.Geom.Rectangle.Contains);
                    else nextBtn.gfx.disableInteractive();
                }
            }
        };
        updateNavButtons();

        // レシピ行を構築
        for (let ri = 0; ri < end - start; ri++) {
            const r = allRecipes[start + ri];
            const y = this._contentStartY + ri * ROW_H * PX;
            this._addRecipeRow(rc, key, y, this._panelW, r.name, r.materials, r.craft, r.isSpecial, r.canCraft);
        }

        // 表示中タブなら新しいボタンを有効化
        if (this.visible && this._currentTab === key) {
            this._allBtns.filter(b => b.tabKey === key).forEach(b => {
                b.gfx.setInteractive(b.rect, Phaser.Geom.Rectangle.Contains);
            });
        }
    }

    // ---- レシピ定義 ----
    private _getRecipes(key: TabKey): RecipeDef[] {
        const can = (m1: string, n1: number, m2: string, n2: number) =>
            (n1 === 0 || gameState.countItem(m1 as ItemType) >= n1) &&
            (n2 === 0 || gameState.countItem(m2 as ItemType) >= n2);
        if (key === 'weapon') {
            return [
                { name: 'ベッド',                      materials: 'ウール×3 + 木材×3',         craft: () => this._craft(ITEM.BED,             'wool',       CRAFT.BED.wool,                  'wood',       CRAFT.BED.wood,              ITEM.BED,             1, 'ベッド'),           canCraft: () => can('wool',       CRAFT.BED.wool,                  'wood',       CRAFT.BED.wood) },
                { name: '矢 ×8',                       materials: '木材×1 + 石×1',              craft: () => this._craft(ITEM.ARROW,           'wood',       CRAFT.ARROW8.wood,               'stone',      CRAFT.ARROW8.stone,          ITEM.ARROW,           8, '矢×8'),             canCraft: () => can('wood',       CRAFT.ARROW8.wood,               'stone',      CRAFT.ARROW8.stone) },
                { name: '🪣 バケツ',                    materials: '鉄×3',                       craft: () => this._craft(ITEM.BUCKET,          'iron_ingot', CRAFT.BUCKET.iron_ingot,         'wood',       0,                           ITEM.BUCKET,          1, '🪣 バケツ'),         canCraft: () => can('iron_ingot', CRAFT.BUCKET.iron_ingot,          'wood',       0),                          isSpecial: true },
                { name: '石の剣',                       materials: '石×2 + 木材×1',              craft: () => this._craft(ITEM.SWORD,           'stone',      CRAFT.SWORD.stone,               'wood',       CRAFT.SWORD.wood,            ITEM.SWORD,           1, '石の剣'),           canCraft: () => can('stone',      CRAFT.SWORD.stone,               'wood',       CRAFT.SWORD.wood) },
                { name: '石のツルハシ',                  materials: '石×3 + 木材×2',              craft: () => this._craft(ITEM.PICKAXE,         'stone',      CRAFT.PICKAXE.stone,             'wood',       CRAFT.PICKAXE.wood,          ITEM.PICKAXE,         1, '石のツルハシ'),       canCraft: () => can('stone',      CRAFT.PICKAXE.stone,             'wood',       CRAFT.PICKAXE.wood) },
                { name: '石の斧',                       materials: '石×2 + 木材×2',              craft: () => this._craft(ITEM.AXE,             'stone',      CRAFT.AXE.stone,                 'wood',       CRAFT.AXE.wood,              ITEM.AXE,             1, '石の斧'),           canCraft: () => can('stone',      CRAFT.AXE.stone,                 'wood',       CRAFT.AXE.wood) },
                { name: '⚔ 鉄の剣',                    materials: '鉄鉱石×3 + 木材×1',          craft: () => this._craft(ITEM.IRON_SWORD,      'iron_ore',   CRAFT.IRON_SWORD.iron_ore,       'wood',       CRAFT.IRON_SWORD.wood,       ITEM.IRON_SWORD,      1, '⚔ 鉄の剣'),         canCraft: () => can('iron_ore',   CRAFT.IRON_SWORD.iron_ore,       'wood',       CRAFT.IRON_SWORD.wood),      isSpecial: true },
                { name: '⛏ 鉄のツルハシ',               materials: '鉄鉱石×3 + 木材×2',          craft: () => this._craft(ITEM.IRON_PICK,       'iron_ore',   CRAFT.IRON_PICK.iron_ore,        'wood',       CRAFT.IRON_PICK.wood,        ITEM.IRON_PICK,       1, '⛏ 鉄のツルハシ'),   canCraft: () => can('iron_ore',   CRAFT.IRON_PICK.iron_ore,        'wood',       CRAFT.IRON_PICK.wood),       isSpecial: true },
                { name: '💎 ダイヤの剣',                 materials: 'ダイヤ×2 + 木材×1',          craft: () => this._craft(ITEM.DIAMOND_SWORD,   'diamond',    CRAFT.DIAMOND_SWORD.diamond,     'wood',       CRAFT.DIAMOND_SWORD.wood,    ITEM.DIAMOND_SWORD,   1, '💎 ダイヤの剣'),     canCraft: () => can('diamond',    CRAFT.DIAMOND_SWORD.diamond,     'wood',       CRAFT.DIAMOND_SWORD.wood),   isSpecial: true },
                { name: '💎 ダイヤのツルハシ',            materials: 'ダイヤ×3 + 木材×2',          craft: () => this._craft(ITEM.DIAMOND_PICK,    'diamond',    CRAFT.DIAMOND_PICK.diamond,      'wood',       CRAFT.DIAMOND_PICK.wood,     ITEM.DIAMOND_PICK,    1, '💎 ダイヤのツルハシ'), canCraft: () => can('diamond',    CRAFT.DIAMOND_PICK.diamond,      'wood',       CRAFT.DIAMOND_PICK.wood),    isSpecial: true },
                { name: '金の剣',                       materials: '金×2 + 木材×1',              craft: () => this._craft(ITEM.GOLD_SWORD,      'gold_ingot', CRAFT.GOLD_SWORD.gold_ingot,     'wood',       CRAFT.GOLD_SWORD.wood,       ITEM.GOLD_SWORD,      1, '金の剣'),           canCraft: () => can('gold_ingot', CRAFT.GOLD_SWORD.gold_ingot,     'wood',       CRAFT.GOLD_SWORD.wood),      isSpecial: true },
                { name: '🔥 ネザーライト',               materials: 'ダイヤ×4 + 鉄×4',            craft: () => this._craft(ITEM.NETHERITE,       'diamond',    CRAFT.NETHERITE.diamond,         'iron_ingot', CRAFT.NETHERITE.iron_ingot,  ITEM.NETHERITE,       1, '🔥 ネザーライト'),   canCraft: () => can('diamond',    CRAFT.NETHERITE.diamond,         'iron_ingot', CRAFT.NETHERITE.iron_ingot), isSpecial: true },
                { name: '🔥 ネザーライトの剣',            materials: 'ネザーライト×2 + 木材×1',     craft: () => this._craft(ITEM.NETHERITE_SWORD, 'netherite',  CRAFT.NETHERITE_SWORD.netherite, 'wood',       CRAFT.NETHERITE_SWORD.wood,  ITEM.NETHERITE_SWORD, 1, '🔥 ネザーライトの剣'), canCraft: () => can('netherite',  CRAFT.NETHERITE_SWORD.netherite, 'wood',       CRAFT.NETHERITE_SWORD.wood), isSpecial: true },
                { name: '🔥 ネザーライトのツルハシ',       materials: 'ネザーライト×3 + 木材×2',     craft: () => this._craft(ITEM.NETHERITE_PICK, 'netherite',  CRAFT.NETHERITE_PICK.netherite,  'wood',       CRAFT.NETHERITE_PICK.wood,   ITEM.NETHERITE_PICK,  1, '🔥 ネザーライトのツルハシ'), canCraft: () => can('netherite', CRAFT.NETHERITE_PICK.netherite,  'wood',       CRAFT.NETHERITE_PICK.wood),  isSpecial: true },
            ];
        }
        if (key === 'armor') {
            return [
                { name: '🛡 鉄の鎧',           materials: '鉄×5 + 石×2',              craft: () => this._craft(ITEM.IRON_ARMOR,      'iron_ingot', CRAFT.IRON_ARMOR.iron_ingot,     'stone',  CRAFT.IRON_ARMOR.stone,      ITEM.IRON_ARMOR,      1, '🛡 鉄の鎧'),         canCraft: () => can('iron_ingot', CRAFT.IRON_ARMOR.iron_ingot,     'stone',  CRAFT.IRON_ARMOR.stone),      isSpecial: true },
                { name: '✨ ダイヤの鎧',         materials: 'ダイヤ×5 + 木材×1',        craft: () => this._craft(ITEM.DIAMOND_ARMOR,   'diamond',    CRAFT.DIAMOND_ARMOR.diamond,     'wood',   CRAFT.DIAMOND_ARMOR.wood,    ITEM.DIAMOND_ARMOR,   1, '✨ ダイヤの鎧'),       canCraft: () => can('diamond',    CRAFT.DIAMOND_ARMOR.diamond,     'wood',   CRAFT.DIAMOND_ARMOR.wood),    isSpecial: true },
                { name: '👑 金の鎧',             materials: '金×5 + 木材×1',            craft: () => this._craft(ITEM.GOLD_ARMOR,      'gold_ingot', CRAFT.GOLD_ARMOR.gold_ingot,     'wood',   CRAFT.GOLD_ARMOR.wood,       ITEM.GOLD_ARMOR,      1, '👑 金の鎧'),           canCraft: () => can('gold_ingot', CRAFT.GOLD_ARMOR.gold_ingot,     'wood',   CRAFT.GOLD_ARMOR.wood),       isSpecial: true },
                { name: '🔥 ネザーライトの鎧',    materials: 'ネザーライト×5 + 木材×1', craft: () => this._craft(ITEM.NETHERITE_ARMOR, 'netherite',  CRAFT.NETHERITE_ARMOR.netherite, 'wood',   CRAFT.NETHERITE_ARMOR.wood,  ITEM.NETHERITE_ARMOR, 1, '🔥 ネザーライトの鎧'), canCraft: () => can('netherite',  CRAFT.NETHERITE_ARMOR.netherite, 'wood',   CRAFT.NETHERITE_ARMOR.wood),  isSpecial: true },
            ];
        }
        // build
        return [
            { name: '📦 木製ボックス',           materials: '木材×5',           craft: () => this._craft(ITEM.BOX,            'wood',      CRAFT.BOX.wood,             'stone',     0,                         ITEM.BOX,            1, '📦 木製ボックス'),     canCraft: () => can('wood',      CRAFT.BOX.wood,             'stone',     0) },
            { name: '🔥 かまど',                 materials: '石×8',             craft: () => this._craft(ITEM.FURNACE_ITEM,   'stone',     CRAFT.FURNACE.stone,        'wood',      0,                         ITEM.FURNACE_ITEM,   1, '🔥 かまど'),           canCraft: () => can('stone',     CRAFT.FURNACE.stone,        'wood',      0) },
            { name: '🟫 ネザーライトブロック',    materials: 'ネザーライト×9',  craft: () => this._craft(ITEM.NETHERITE_BLOCK,'netherite', CRAFT.NETHERITE_BLOCK.netherite,'wood',  0,                         ITEM.NETHERITE_BLOCK,1, '🟫 ネザーライトブロック'), canCraft: () => can('netherite', CRAFT.NETHERITE_BLOCK.netherite,'wood', 0), isSpecial: true },
        ];
    }

    // ---- タブ選択 ----
    private _selectTab(key: TabKey): void {
        this._currentTab = key;
        const tabW = PANEL_W * PX / 3;
        const tabH = 24 * PX;
        const h    = PANEL_H * PX;
        this._tabBgs.forEach((g, k) => {
            const ti   = k === 'weapon' ? 0 : k === 'armor' ? 1 : 2;
            const tabX = -PANEL_W * PX / 2 + ti * tabW + tabW / 2;
            const tabY = -h / 2 + 34 * PX;
            this._drawTabBg(g, tabX, tabY, tabW, tabH, k === key);
            const txt = (g as any).__tabText as Phaser.GameObjects.Text | undefined;
            if (txt) txt.setColor(k === key ? PALETTE.TEXT_YELLOW : PALETTE.TEXT_GRAY);
        });
        this._tabContainers.forEach((tc, k) => tc.setVisible(k === key));
        // クラフトボタンの interactive を現在タブのみ有効化
        this._disableAllCraftBtns();
        this._allBtns.filter(b => b.tabKey === key).forEach(b => {
            b.gfx.setInteractive(b.rect, Phaser.Geom.Rectangle.Contains);
        });
        // ページナビも更新
        const allR   = this._getRecipes(key);
        const page   = this._tabPage.get(key) ?? 0;
        const total  = Math.ceil(allR.length / PER_PAGE);
        const prevBtn = this._prevBtns.get(key);
        const nextBtn = this._nextBtns.get(key);
        if (prevBtn) {
            if (page > 0) prevBtn.gfx.setInteractive(prevBtn.rect, Phaser.Geom.Rectangle.Contains);
            else prevBtn.gfx.disableInteractive();
        }
        if (nextBtn) {
            if (page < total - 1) nextBtn.gfx.setInteractive(nextBtn.rect, Phaser.Geom.Rectangle.Contains);
            else nextBtn.gfx.disableInteractive();
        }
    }

    // ---- レシピ行 ----
    private _addRecipeRow(
        rc: Phaser.GameObjects.Container,
        tabKey: TabKey,
        yOff: number,
        panelW: number,
        name: string,
        materials: string,
        onCraft: () => void,
        isSpecial = false,
        canCraft?: () => boolean,
    ): void {
        const pw    = panelW * 0.85;
        const ph    = (ROW_H - 4) * PX;
        const ok    = canCraft ? canCraft() : true;

        const box = this.scene.add.graphics();
        if (ok) {
            box.fillStyle(isSpecial ? 0x2a2200 : 0x1a1a2e);
            box.lineStyle(1 * PX, isSpecial ? 0xcc9944 : 0x334466);
        } else {
            box.fillStyle(0x111118, 0.7);
            box.lineStyle(1 * PX, 0x2a2a3a, 0.6);
        }
        box.fillRoundedRect(-pw / 2, yOff, pw, ph, 4 * PX);
        box.strokeRoundedRect(-pw / 2, yOff, pw, ph, 4 * PX);
        rc.add(box);

        rc.add(this.scene.add.text(-pw / 2 + 10 * PX, yOff + 7 * PX, name, {
            fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: ok ? PALETTE.TEXT_WHITE : '#555566',
        }));
        rc.add(this.scene.add.text(-pw / 2 + 10 * PX, yOff + 22 * PX, materials, {
            fontSize: `${7.5 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: ok ? PALETTE.TEXT_GRAY : '#443333',
        }));

        // クラフトボタン
        const btnW = 60 * PX;
        const btnH = 24 * PX;
        const btnX = pw / 2 - btnW / 2 - 6 * PX;
        const btnY = yOff + ph / 2 - btnH / 2;
        const btnBg = this.scene.add.graphics();
        const drawBtn = (hover: boolean) => {
            btnBg.clear();
            if (ok) {
                btnBg.fillStyle(hover ? 0x44bb44 : 0x226622, hover ? 1 : 0.9);
                btnBg.lineStyle(1 * PX, hover ? 0x88ff88 : 0x44aa44, 0.8);
            } else {
                btnBg.fillStyle(0x222233, 0.8);
                btnBg.lineStyle(1 * PX, 0x333344, 0.6);
            }
            btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 5 * PX);
            btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 5 * PX);
        };
        drawBtn(false);
        const btnText = this.scene.add.text(btnX, btnY, ok ? 'クラフト' : '素材不足', {
            fontSize: `${(ok ? 9 : 8) * PX}px`,
            fontFamily: UI.FONT_FAMILY,
            color: ok ? '#ffffff' : '#774444',
            stroke: ok ? '#001100' : '#000000',
            strokeThickness: 1 * PX,
        }).setOrigin(0.5);

        const rect = new Phaser.Geom.Rectangle(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);
        btnBg.setScrollFactor(0).disableInteractive();
        if (ok) {
            btnBg.on('pointerdown', onCraft);
            btnBg.on('pointerover', () => drawBtn(true));
            btnBg.on('pointerout',  () => drawBtn(false));
        }
        rc.add([btnBg, btnText]);

        this._allBtns.push({ gfx: btnBg, rect, tabKey });
    }

    // ---- クラフト実行 ----
    private _craft(
        _resultItem: ItemType,
        mat1Key: string, mat1Count: number,
        mat2Key: string, mat2Count: number,
        result: ItemType, resultCount: number,
        recipeName = '',
    ): void {
        const m1 = mat1Key as ItemType;
        const m2 = mat2Key as ItemType;
        const hasM1 = mat1Count === 0 || gameState.countItem(m1) >= mat1Count;
        const hasM2 = mat2Count === 0 || gameState.countItem(m2) >= mat2Count;
        if (hasM1 && hasM2) {
            if (mat1Count > 0) gameState.consumeItem(m1, mat1Count);
            if (mat2Count > 0) gameState.consumeItem(m2, mat2Count);
            if (!gameState.addItem(result, resultCount)) {
                if (mat1Count > 0) gameState.addItem(m1, mat1Count);
                if (mat2Count > 0) gameState.addItem(m2, mat2Count);
                this._showFeedback('インベントリが満杯です！', true);
                return;
            }
            EventBus.emit(Events.CRAFT_SUCCESS, { item: result });
            EventBus.emit(Events.INVENTORY_CHANGED);
            this._showFeedback(`${recipeName || result} を作成！`);
        } else {
            this._showFeedback('素材が足りません！', true);
        }
    }

    private _showFeedback(msg: string, error = false): void {
        const text = this.scene.add.text(0, 50 * PX, msg, {
            fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: error ? PALETTE.TEXT_RED : PALETTE.TEXT_GREEN,
            align: 'center', stroke: '#000', strokeThickness: 1 * PX,
        }).setOrigin(0.5);
        this.container.add(text);
        this.scene.tweens.add({
            targets: text, y: 20 * PX, alpha: 0,
            duration: 1800, ease: 'Quad.easeOut',
            onComplete: () => { if (text?.active) text.destroy(); },
        });
    }

    private _onInventoryChanged(): void {
        if (!this.visible) return;
        this._buildRecipePage(this._currentTab);
        this._allBtns.filter(b => b.tabKey === this._currentTab).forEach(b => {
            b.gfx.setInteractive(b.rect, Phaser.Geom.Rectangle.Contains);
        });
    }

    // ---- 開閉 ----
    toggle(): void {
        this.visible = !this.visible;
        this.container.setVisible(this.visible);
        if (this.visible) {
            this._buildRecipePage(this._currentTab);
            this._enableTabBtns();
            this._selectTab(this._currentTab);
            EventBus.emit(Events.CRAFT_OPEN);
        } else {
            this._disableAll();
            EventBus.emit(Events.CRAFT_CLOSE);
        }
    }

    close(): void {
        this.visible = false;
        this.container.setVisible(false);
        this._disableAll();
    }

    private _enableTabBtns(): void {
        this._tabBgsByKey.forEach(({ gfx, rect }) => {
            gfx.setInteractive(rect, Phaser.Geom.Rectangle.Contains);
        });
    }

    private _disableAllCraftBtns(): void {
        this._allBtns.forEach(b => b.gfx.disableInteractive());
    }

    private _disableAll(): void {
        this._tabBgList.forEach(g => g.disableInteractive());
        this._allBtns.forEach(b => b.gfx.disableInteractive());
        this._prevBtns.forEach(b => b.gfx.disableInteractive());
        this._nextBtns.forEach(b => b.gfx.disableInteractive());
    }

    destroy(): void {
        EventBus.off(Events.INVENTORY_CHANGED, this._onInventoryChanged, this);
        this.container.destroy();
    }
}
