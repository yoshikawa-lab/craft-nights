// ============================
// StorageUI — アイテムボックス画面（18スロット）
// ============================
import Phaser from 'phaser';
import { GAME, PALETTE, UI, PX, ITEM } from '../core/Constants';
import { gameState } from '../core/GameState';
import { EventBus, Events } from '../core/EventBus';

const ITEM_COLORS: Record<string, number> = {
    [ITEM.WOOD]: 0x8B6914, [ITEM.STONE]: 0x888888, [ITEM.WOOL]: 0xf0f0f0,
    [ITEM.SWORD]: 0x88aaff, [ITEM.AXE]: 0xaa8844, [ITEM.PICKAXE]: 0x999999,
    [ITEM.BOW]: 0xaa7733, [ITEM.ARROW]: 0xeecc66, [ITEM.BED]: 0xcc4444,
    [ITEM.DIRT]: 0x8B5E3C, [ITEM.IRON_ORE]: 0xcc9944, [ITEM.BOX]: 0xA0522D,
    // 新アイテム
    [ITEM.COAL]:          0x333344,
    [ITEM.DIAMOND]:       0x44ddff,
    [ITEM.EMERALD]:       0x44ee66,
    [ITEM.GOLD]:          0xffcc00,
    [ITEM.IRON_INGOT]:    0xaaaaaa,
    [ITEM.GOLD_INGOT]:    0xffcc00,
    [ITEM.IRON_ARMOR]:    0x888899,
    [ITEM.DIAMOND_ARMOR]: 0x44ddff,
    [ITEM.GOLD_ARMOR]:    0xffcc00,
    [ITEM.IRON_SWORD]:    0xaabbcc,
    [ITEM.IRON_PICK]:     0x99aaaa,
    [ITEM.DIAMOND_SWORD]: 0x44ddff,
    [ITEM.DIAMOND_PICK]:  0x44ddff,
    [ITEM.GOLD_SWORD]:    0xffcc00,
    [ITEM.FURNACE_ITEM]:  0x554433,
};
const ITEM_LABELS: Record<string, string> = {
    [ITEM.WOOD]: '木', [ITEM.STONE]: '石', [ITEM.WOOL]: '羊毛',
    [ITEM.SWORD]: '剣', [ITEM.AXE]: '斧', [ITEM.PICKAXE]: 'ツルハシ',
    [ITEM.BOW]: '弓', [ITEM.ARROW]: '矢', [ITEM.BED]: 'ベッド',
    [ITEM.DIRT]: '土', [ITEM.IRON_ORE]: '鉄鉱石', [ITEM.BOX]: '箱',
    // 新アイテム
    [ITEM.COAL]:          '石炭',
    [ITEM.DIAMOND]:       'ダイヤ',
    [ITEM.EMERALD]:       'エメラルド',
    [ITEM.GOLD]:          '金鉱石',
    [ITEM.IRON_INGOT]:    '鉄',
    [ITEM.GOLD_INGOT]:    '金',
    [ITEM.IRON_ARMOR]:    '鉄鎧',
    [ITEM.DIAMOND_ARMOR]: 'ダイヤ鎧',
    [ITEM.GOLD_ARMOR]:    '金鎧',
    [ITEM.IRON_SWORD]:    '鉄剣',
    [ITEM.IRON_PICK]:     '鉄掘',
    [ITEM.DIAMOND_SWORD]: 'ダイヤ剣',
    [ITEM.DIAMOND_PICK]:  'ダイヤ掘',
    [ITEM.GOLD_SWORD]:    '金剣',
    [ITEM.FURNACE_ITEM]:  'かまど',
};

const COLS = 6;
const ROWS = 3;
const TOTAL = COLS * ROWS;

export class StorageUI {
    private scene: Phaser.Scene;
    private container!: Phaser.GameObjects.Container;
    visible = false;

    private _slotPos: Array<{ x: number; y: number }> = [];
    private _itemGfx: Phaser.GameObjects.Graphics[] = [];
    private _itemLabel: Phaser.GameObjects.Text[] = [];
    private _itemCount: Phaser.GameObjects.Text[] = [];
    private _zonesData: Array<{ zone: Phaser.GameObjects.Graphics; rect: Phaser.Geom.Rectangle }> = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._build();
        this.container.setVisible(false);
    }

    private _build(): void {
        const ss = 44 * PX;   // スロットサイズ
        const gap = 6 * PX;   // スロット間隔
        const gW = COLS * ss + (COLS - 1) * gap;
        const gH = ROWS * ss + (ROWS - 1) * gap;
        const pW = gW + 40 * PX;
        const pH = gH + 100 * PX;
        const gTop = -pH / 2 + 44 * PX;  // グリッド開始Y（タイトル分を確保）

        this.container = this.scene.add.container(GAME.WIDTH / 2, GAME.HEIGHT / 2);
        this.container.setScrollFactor(0).setDepth(300);

        // パネル背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1a0d00, 0.97);
        bg.lineStyle(2 * PX, 0x996633);
        bg.fillRoundedRect(-pW / 2, -pH / 2, pW, pH, 8 * PX);
        bg.strokeRoundedRect(-pW / 2, -pH / 2, pW, pH, 8 * PX);
        this.container.add(bg);

        // タイトル
        this.container.add(
            this.scene.add.text(0, -pH / 2 + 18 * PX, '📦 アイテムボックス', {
                fontSize: `${14 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: '#cc8844', stroke: '#000', strokeThickness: 2 * PX,
            }).setOrigin(0.5),
        );

        // 全スロット背景（静的）
        const gridBg = this.scene.add.graphics();
        this.container.add(gridBg);

        for (let i = 0; i < TOTAL; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const sx = -(gW / 2) + col * (ss + gap) + ss / 2;
            const sy = gTop + row * (ss + gap) + ss / 2;
            this._slotPos.push({ x: sx, y: sy });

            // スロット背景
            gridBg.fillStyle(0x2a1a08);
            gridBg.lineStyle(1.5 * PX, 0x664422);
            gridBg.fillRoundedRect(sx - ss / 2, sy - ss / 2, ss, ss, 3 * PX);
            gridBg.strokeRoundedRect(sx - ss / 2, sy - ss / 2, ss, ss, 3 * PX);

            // クリック受付ゾーン（ほぼ透明なGraphics）
            const zone = this.scene.add.graphics();
            zone.fillStyle(0xffffff, 0.01);
            zone.fillRect(sx - ss / 2, sy - ss / 2, ss, ss);
            const zoneRect = new Phaser.Geom.Rectangle(sx - ss / 2, sy - ss / 2, ss, ss);
            // 非表示時はインタラクティブを無効化（他UIのボタンをブロックしないため）
            zone.setScrollFactor(0).disableInteractive();
            this._zonesData.push({ zone, rect: zoneRect });
            const idx = i;
            zone.on('pointerdown', () => this._clickSlot(idx));
            zone.on('pointerover', () => {
                gridBg.fillStyle(0x4a3020);
                gridBg.fillRoundedRect(sx - ss / 2, sy - ss / 2, ss, ss, 3 * PX);
            });
            zone.on('pointerout', () => {
                gridBg.fillStyle(0x2a1a08);
                gridBg.fillRoundedRect(sx - ss / 2, sy - ss / 2, ss, ss, 3 * PX);
            });
            this.container.add(zone);

            // アイテム色ブロック
            const ig = this.scene.add.graphics();
            this.container.add(ig);
            this._itemGfx.push(ig);

            // アイテム名
            const lbl = this.scene.add.text(sx, sy - 4 * PX, '', {
                fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: '#ffffff', stroke: '#000', strokeThickness: 1 * PX,
            }).setOrigin(0.5);
            this.container.add(lbl);
            this._itemLabel.push(lbl);

            // 数量
            const cnt = this.scene.add.text(sx + ss * 0.3, sy + ss * 0.3, '', {
                fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: '#ffdd44', stroke: '#000', strokeThickness: 1 * PX,
            }).setOrigin(0.5);
            this.container.add(cnt);
            this._itemCount.push(cnt);
        }

        // ヒント
        this.container.add(
            this.scene.add.text(0, pH / 2 - 28 * PX,
                'アイテムあり→受け取る  空スロット→選択アイテムを預ける', {
                    fontSize: `${6.5 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
                }).setOrigin(0.5),
        );
        this.container.add(
            this.scene.add.text(0, pH / 2 - 14 * PX, '[E で閉じる]', {
                fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            }).setOrigin(0.5),
        );
    }

    private _clickSlot(idx: number): void {
        const slot = gameState.storageSlots[idx];
        if (slot.item && slot.count > 0) {
            // ストレージ → プレイヤーインベントリ
            if (gameState.addItem(slot.item, slot.count)) {
                slot.item = null;
                slot.count = 0;
                EventBus.emit(Events.INVENTORY_CHANGED);
                this._refresh();
            }
        } else {
            // 選択ホットバーアイテム → ストレージ
            const sel = gameState.selectedItem;
            if (sel.item && sel.count > 0) {
                slot.item = sel.item;
                slot.count = sel.count;
                sel.item = null;
                sel.count = 0;
                EventBus.emit(Events.INVENTORY_CHANGED);
                this._refresh();
            }
        }
    }

    _refresh(): void {
        const ss = 44 * PX;
        for (let i = 0; i < TOTAL; i++) {
            const pos = this._slotPos[i];
            const slot = gameState.storageSlots[i];
            const gfx = this._itemGfx[i];
            gfx.clear();
            if (slot.item && slot.count > 0) {
                const c = ITEM_COLORS[slot.item] ?? 0x888888;
                gfx.fillStyle(c, 0.85);
                gfx.fillRoundedRect(pos.x - ss * 0.33, pos.y - ss * 0.33, ss * 0.66, ss * 0.66, 2 * PX);
                this._itemLabel[i].setText(ITEM_LABELS[slot.item] ?? slot.item);
                this._itemCount[i].setText(slot.count > 1 ? `×${slot.count}` : '');
            } else {
                this._itemLabel[i].setText('');
                this._itemCount[i].setText('');
            }
        }
    }

    toggle(): void {
        this.visible = !this.visible;
        this.container.setVisible(this.visible);
        if (this.visible) {
            // 開いたときにインタラクティブを有効化
            this._zonesData.forEach(d => d.zone.setInteractive(d.rect, Phaser.Geom.Rectangle.Contains));
            this._refresh();
        } else {
            // 閉じたときに無効化（他UIのブロッキング防止）
            this._zonesData.forEach(d => d.zone.disableInteractive());
        }
    }

    close(): void {
        this.visible = false;
        this.container.setVisible(false);
        // 閉じたときに無効化（他UIのブロッキング防止）
        this._zonesData.forEach(d => d.zone.disableInteractive());
    }

    destroy(): void {
        this.container.destroy();
    }
}
