// ============================
// CraftingUI — クラフト画面（タブ式）
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
    isSpecial?: boolean;
}

export class CraftingUI {
    private scene: Phaser.Scene;
    private container!: Phaser.GameObjects.Container;
    visible = false;

    private _currentTab: TabKey = 'weapon';
    private _tabContainers: Map<TabKey, Phaser.GameObjects.Container> = new Map();
    private _tabBgs: Map<TabKey, Phaser.GameObjects.Graphics> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._build();
        this.container.setVisible(false);
    }

    private _build(): void {
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;
        const w = 360 * PX;
        const h = 520 * PX;

        this.container = this.scene.add.container(cx, cy);
        this.container.setScrollFactor(0).setDepth(300);

        // 背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0d0d1a, 0.97);
        bg.lineStyle(2 * PX, 0x334466);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        this.container.add(bg);

        // タイトル
        this.container.add(
            this.scene.add.text(0, -h / 2 + 16 * PX, '⚒ クラフト', {
                fontSize: `${13 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: PALETTE.TEXT_YELLOW, stroke: '#000', strokeThickness: 2 * PX,
            }).setOrigin(0.5),
        );

        // タブボタン
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

            tabBg.setScrollFactor(0).setInteractive(
                new Phaser.Geom.Rectangle(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH),
                Phaser.Geom.Rectangle.Contains,
            );
            const capturedKey = key;
            const capturedText = tabText;
            tabBg.on('pointerdown', () => {
                this._selectTab(capturedKey);
            });
            tabBg.on('pointerover', () => { tabText.setColor(PALETTE.TEXT_WHITE); });
            tabBg.on('pointerout', () => {
                capturedText.setColor(
                    this._currentTab === capturedKey ? PALETTE.TEXT_YELLOW : PALETTE.TEXT_GRAY,
                );
            });

            // タブ表示更新をインスタンス変数として保持
            (tabBg as any).__tabText = tabText;
            (tabBg as any).__tabKey  = key;
        }

        // タブコンテンツエリア
        const contentY = tabY + tabH / 2 + 4 * PX;
        const contentH = h - (contentY + h / 2) - 30 * PX;

        for (const { key } of tabs) {
            const tc = this.scene.add.container(0, 0);
            tc.setVisible(key === this._currentTab);
            this._tabContainers.set(key, tc);
            this.container.add(tc);
            this._buildTabContent(key, w, contentY, contentH);
        }

        // ヒント
        this.container.add(
            this.scene.add.text(0, h / 2 - 10 * PX, '[C でクローズ]', {
                fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            }).setOrigin(0.5),
        );
    }

    private _drawTabBg(
        g: Phaser.GameObjects.Graphics,
        cx: number, cy: number,
        w: number, h: number,
        active: boolean,
    ): void {
        g.clear();
        g.fillStyle(active ? 0x2a2244 : 0x111122, active ? 1 : 0.7);
        g.lineStyle(1 * PX, active ? 0x6666cc : 0x333355);
        g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 3 * PX);
        g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 3 * PX);
    }

    private _buildTabContent(key: TabKey, w: number, startY: number, _maxH: number): void {
        const tc = this._tabContainers.get(key)!;
        const rowH = 52 * PX;
        const recipes = this._getRecipes(key);

        for (let ri = 0; ri < recipes.length; ri++) {
            const r = recipes[ri];
            const y = startY + ri * rowH;
            this._addRecipeRow(tc, y, w, r.name, r.materials, r.craft, r.isSpecial);
        }
    }

    private _getRecipes(key: TabKey): RecipeDef[] {
        if (key === 'weapon') {
            return [
                { name: 'ベッド',              materials: 'ウール×3 + 木材×3',   craft: () => this._craft(ITEM.BED,           'wool',       CRAFT.BED.wool,              'wood',  CRAFT.BED.wood,            ITEM.BED,           1, 'ベッド') },
                { name: '矢 ×8',              materials: '木材×1 + 石×1',        craft: () => this._craft(ITEM.ARROW,         'wood',       CRAFT.ARROW8.wood,           'stone', CRAFT.ARROW8.stone,        ITEM.ARROW,         8, '矢×8') },
                { name: '石の剣',              materials: '石×2 + 木材×1',        craft: () => this._craft(ITEM.SWORD,         'stone',      CRAFT.SWORD.stone,           'wood',  CRAFT.SWORD.wood,          ITEM.SWORD,         1, '石の剣') },
                { name: '石のツルハシ',        materials: '石×3 + 木材×2',        craft: () => this._craft(ITEM.PICKAXE,       'stone',      CRAFT.PICKAXE.stone,         'wood',  CRAFT.PICKAXE.wood,        ITEM.PICKAXE,       1, '石のツルハシ') },
                { name: '石の斧',              materials: '石×2 + 木材×2',        craft: () => this._craft(ITEM.AXE,           'stone',      CRAFT.AXE.stone,             'wood',  CRAFT.AXE.wood,            ITEM.AXE,           1, '石の斧') },
                { name: '⚔ 鉄の剣',           materials: '鉄鉱石×3 + 木材×1',   craft: () => this._craft(ITEM.IRON_SWORD,    'iron_ore',   CRAFT.IRON_SWORD.iron_ore,   'wood',  CRAFT.IRON_SWORD.wood,     ITEM.IRON_SWORD,    1, '⚔ 鉄の剣'), isSpecial: true },
                { name: '⛏ 鉄のツルハシ',    materials: '鉄鉱石×3 + 木材×2',   craft: () => this._craft(ITEM.IRON_PICK,     'iron_ore',   CRAFT.IRON_PICK.iron_ore,    'wood',  CRAFT.IRON_PICK.wood,      ITEM.IRON_PICK,     1, '⛏ 鉄のツルハシ'), isSpecial: true },
                { name: '💎 ダイヤの剣',       materials: 'ダイヤ×2 + 木材×1',   craft: () => this._craft(ITEM.DIAMOND_SWORD, 'diamond',    CRAFT.DIAMOND_SWORD.diamond, 'wood',  CRAFT.DIAMOND_SWORD.wood,  ITEM.DIAMOND_SWORD, 1, '💎 ダイヤの剣'), isSpecial: true },
                { name: '💎 ダイヤのツルハシ', materials: 'ダイヤ×3 + 木材×2',   craft: () => this._craft(ITEM.DIAMOND_PICK,  'diamond',    CRAFT.DIAMOND_PICK.diamond,  'wood',  CRAFT.DIAMOND_PICK.wood,   ITEM.DIAMOND_PICK,  1, '💎 ダイヤのツルハシ'), isSpecial: true },
                { name: '金の剣',              materials: '金×2 + 木材×1',        craft: () => this._craft(ITEM.GOLD_SWORD,    'gold_ingot', CRAFT.GOLD_SWORD.gold_ingot, 'wood',  CRAFT.GOLD_SWORD.wood,     ITEM.GOLD_SWORD,    1, '金の剣'), isSpecial: true },
            ];
        }
        if (key === 'armor') {
            return [
                { name: '🛡 鉄の鎧',     materials: '鉄×5 + 石×2',       craft: () => this._craft(ITEM.IRON_ARMOR,    'iron_ingot', CRAFT.IRON_ARMOR.iron_ingot,  'stone', CRAFT.IRON_ARMOR.stone,   ITEM.IRON_ARMOR,    1, '🛡 鉄の鎧'), isSpecial: true },
                { name: '✨ ダイヤの鎧', materials: 'ダイヤ×5 + 木材×1',  craft: () => this._craft(ITEM.DIAMOND_ARMOR, 'diamond',    CRAFT.DIAMOND_ARMOR.diamond,  'wood',  CRAFT.DIAMOND_ARMOR.wood, ITEM.DIAMOND_ARMOR, 1, '✨ ダイヤの鎧'), isSpecial: true },
                { name: '👑 金の鎧',     materials: '金×5 + 木材×1',      craft: () => this._craft(ITEM.GOLD_ARMOR,    'gold_ingot', CRAFT.GOLD_ARMOR.gold_ingot,  'wood',  CRAFT.GOLD_ARMOR.wood,    ITEM.GOLD_ARMOR,    1, '👑 金の鎧'), isSpecial: true },
            ];
        }
        // build
        return [
            { name: '📦 木製ボックス', materials: '木材×5', craft: () => this._craft(ITEM.BOX,          'wood',  CRAFT.BOX.wood,       'stone', 0, ITEM.BOX,          1, '📦 木製ボックス') },
            { name: '🔥 かまど',       materials: '石×8',   craft: () => this._craft(ITEM.FURNACE_ITEM, 'stone', CRAFT.FURNACE.stone,  'wood',  0, ITEM.FURNACE_ITEM, 1, '🔥 かまど') },
        ];
    }

    private _selectTab(key: TabKey): void {
        this._currentTab = key;
        const tabW = 360 * PX / 3;
        const tabH = 24 * PX;
        // update tab appearances
        this._tabBgs.forEach((g, k) => {
            const ti = k === 'weapon' ? 0 : k === 'armor' ? 1 : 2;
            const tabX = -360 * PX / 2 + ti * tabW + tabW / 2;
            const tabY = -(520 * PX) / 2 + 34 * PX;
            this._drawTabBg(g, tabX, tabY, tabW, tabH, k === key);
            const txt = (g as any).__tabText as Phaser.GameObjects.Text | undefined;
            if (txt) txt.setColor(k === key ? PALETTE.TEXT_YELLOW : PALETTE.TEXT_GRAY);
        });
        this._tabContainers.forEach((tc, k) => tc.setVisible(k === key));
    }

    private _addRecipeRow(
        tc: Phaser.GameObjects.Container,
        yOff: number,
        panelW: number,
        name: string,
        materials: string,
        onCraft: () => void,
        isIron = false,
    ): void {
        const y = yOff;
        const pw = panelW * 0.85;
        const ph = 46 * PX;

        const box = this.scene.add.graphics();
        box.fillStyle(isIron ? 0x2a2200 : 0x222222);
        box.lineStyle(1 * PX, isIron ? 0xcc9944 : PALETTE.UI_BORDER);
        box.fillRoundedRect(-pw / 2, y, pw, ph, 4 * PX);
        box.strokeRoundedRect(-pw / 2, y, pw, ph, 4 * PX);
        tc.add(box);

        tc.add(this.scene.add.text(-pw / 2 + 10 * PX, y + 8 * PX, name, {
            fontSize: `${11 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_WHITE,
        }));
        tc.add(this.scene.add.text(-pw / 2 + 10 * PX, y + 24 * PX, materials, {
            fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
        }));

        const btnW = 58 * PX;
        const btnH = 22 * PX;
        const btnX = pw / 2 - btnW / 2 - 8 * PX;
        const btnY = y + ph / 2 - btnH / 2;
        const btnBg = this.scene.add.graphics();
        const drawBtn = (hover: boolean) => {
            btnBg.clear();
            btnBg.fillStyle(hover ? 0x33aa33 : 0x226622);
            btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 4 * PX);
        };
        drawBtn(false);
        const btnText = this.scene.add.text(btnX, btnY, 'クラフト', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#ffffff',
        }).setOrigin(0.5);

        btnBg.setScrollFactor(0).setInteractive(
            new Phaser.Geom.Rectangle(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH),
            Phaser.Geom.Rectangle.Contains,
        );
        btnBg.on('pointerdown', onCraft);
        btnBg.on('pointerover', () => drawBtn(true));
        btnBg.on('pointerout',  () => drawBtn(false));
        tc.add([btnBg, btnText]);
    }

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
            gameState.addItem(result, resultCount);
            EventBus.emit(Events.CRAFT_SUCCESS, { item: result });
            EventBus.emit(Events.INVENTORY_CHANGED);
            const label = recipeName || `${result}×${resultCount}`;
            this._showFeedback(`${label} を作成！`);
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
            targets: text, y: 30 * PX, alpha: 0,
            duration: 2000, ease: 'Quad.easeOut',
            onComplete: () => { if (text?.active) text.destroy(); },
        });
    }

    toggle(): void {
        this.visible = !this.visible;
        this.container.setVisible(this.visible);
        if (this.visible) {
            EventBus.emit(Events.CRAFT_OPEN);
        } else {
            EventBus.emit(Events.CRAFT_CLOSE);
        }
    }

    close(): void {
        this.visible = false;
        this.container.setVisible(false);
    }

    destroy(): void {
        this.container.destroy();
    }
}
