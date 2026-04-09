// ============================
// VillagerUI — 村人との交易UI
// ============================
import Phaser from 'phaser';
import { GAME, PALETTE, UI, PX, ITEM, ItemType } from '../core/Constants';
import { gameState } from '../core/GameState';
import { EventBus, Events } from '../core/EventBus';

interface TradeEntry {
    costItem: ItemType;
    costCount: number;
    gainItem: ItemType;
    gainCount: number;
    label: string;
}

const ALL_TRADES: TradeEntry[] = [
    { costItem: ITEM.EMERALD, costCount: 2,  gainItem: ITEM.ARROW,       gainCount: 16, label: 'エメラルド×2 → 矢×16' },
    { costItem: ITEM.EMERALD, costCount: 3,  gainItem: ITEM.COAL,        gainCount: 8,  label: 'エメラルド×3 → 石炭×8' },
    { costItem: ITEM.EMERALD, costCount: 5,  gainItem: ITEM.IRON_INGOT,  gainCount: 3,  label: 'エメラルド×5 → 鉄×3' },
    { costItem: ITEM.EMERALD, costCount: 8,  gainItem: ITEM.DIAMOND,     gainCount: 1,  label: 'エメラルド×8 → ダイヤ×1' },
    { costItem: ITEM.EMERALD, costCount: 10, gainItem: ITEM.GOLD_INGOT,  gainCount: 2,  label: 'エメラルド×10 → 金×2' },
    { costItem: ITEM.EMERALD, costCount: 15, gainItem: ITEM.NETHERITE,   gainCount: 1,  label: 'エメラルド×15 → ネザーライト×1' },
];

interface BtnEntry {
    gfx: Phaser.GameObjects.Graphics;
    rect: Phaser.Geom.Rectangle;
}

export class VillagerUI {
    private scene: Phaser.Scene;
    private container!: Phaser.GameObjects.Container;
    private nameText!: Phaser.GameObjects.Text;
    private greetText!: Phaser.GameObjects.Text;
    private _emeraldText!: Phaser.GameObjects.Text;
    private _btnData: BtnEntry[] = [];
    visible = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._build();
        this.container.setVisible(false);
    }

    private _build(): void {
        const w = 360 * PX;
        const h = 420 * PX;
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;

        this.container = this.scene.add.container(cx, cy);
        this.container.setScrollFactor(0).setDepth(300);

        // 背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0d1a0d, 0.97);
        bg.lineStyle(2 * PX, 0x448844);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        this.container.add(bg);

        // 村人名
        this.nameText = this.scene.add.text(0, -h / 2 + 18 * PX, '村人', {
            fontSize: `${14 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#88ff88', stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5);
        this.container.add(this.nameText);

        // 挨拶
        this.greetText = this.scene.add.text(0, -h / 2 + 38 * PX, '「いらっしゃい、旅人よ」', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            fontStyle: 'italic',
        }).setOrigin(0.5);
        this.container.add(this.greetText);

        // 所持エメラルド表示
        this._emeraldText = this.scene.add.text(0, -h / 2 + 52 * PX, '💚 エメラルド: 0', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#44ee66',
        }).setOrigin(0.5);
        this.container.add(this._emeraldText);

        // 区切り
        const sep = this.scene.add.graphics();
        sep.lineStyle(1 * PX, 0x448844, 0.5);
        sep.beginPath();
        sep.moveTo(-w / 2 + 16 * PX, -h / 2 + 64 * PX);
        sep.lineTo(w / 2 - 16 * PX, -h / 2 + 64 * PX);
        sep.strokePath();
        this.container.add(sep);

        // 交易メニュータイトル
        this.container.add(
            this.scene.add.text(0, -h / 2 + 74 * PX, '── 交易メニュー ──', {
                fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#77cc77',
            }).setOrigin(0.5),
        );

        // 交易行
        const startY = -h / 2 + 88 * PX;
        const rowH = 44 * PX;
        for (let ti = 0; ti < ALL_TRADES.length; ti++) {
            this._addTradeRow(ALL_TRADES[ti], startY + ti * rowH, w);
        }

        // ヒント
        this.container.add(
            this.scene.add.text(0, h / 2 - 10 * PX, '[E で閉じる]', {
                fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            }).setOrigin(0.5),
        );
    }

    private _addTradeRow(trade: TradeEntry, rowY: number, panelW: number): void {
        const pw = panelW * 0.9;
        const ph = 36 * PX;

        // 行背景
        const box = this.scene.add.graphics();
        box.fillStyle(0x0a200a);
        box.lineStyle(1 * PX, 0x336633);
        box.fillRoundedRect(-pw / 2, rowY, pw, ph, 3 * PX);
        box.strokeRoundedRect(-pw / 2, rowY, pw, ph, 3 * PX);
        this.container.add(box);

        // ラベル
        const lbl = this.scene.add.text(-pw / 2 + 8 * PX, rowY + ph / 2, trade.label, {
            fontSize: `${8.5 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_WHITE,
        }).setOrigin(0, 0.5);
        this.container.add(lbl);

        // 交換ボタン
        const btnW = 52 * PX;
        const btnH = 22 * PX;
        const btnX = pw / 2 - btnW / 2 - 6 * PX;
        const btnY = rowY + ph / 2;

        const btnBg = this.scene.add.graphics();
        const drawBtn = (hover: boolean) => {
            btnBg.clear();
            btnBg.fillStyle(hover ? 0x339933 : 0x226622);
            btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 3 * PX);
        };
        drawBtn(false);
        const btnText = this.scene.add.text(btnX, btnY, '交換', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#ffffff',
        }).setOrigin(0.5);

        const rect = new Phaser.Geom.Rectangle(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);
        // 初期は無効（UI非表示のため）
        btnBg.setScrollFactor(0).disableInteractive();
        btnBg.on('pointerdown', () => this._trade(trade));
        btnBg.on('pointerover', () => drawBtn(true));
        btnBg.on('pointerout',  () => drawBtn(false));
        this.container.add([btnBg, btnText]);

        this._btnData.push({ gfx: btnBg, rect });
    }

    private _trade(trade: TradeEntry): void {
        const have = gameState.countItem(trade.costItem);
        if (have < trade.costCount) {
            const itemJP: Record<string, string> = {
                emerald: 'エメラルド', diamond: 'ダイヤ', iron_ingot: '鉄', gold_ingot: '金',
            };
            const name = itemJP[trade.costItem] ?? trade.costItem;
            this._showFeedback(`${name}が足りません！ (${have}/${trade.costCount})`, true);
            return;
        }
        gameState.consumeItem(trade.costItem, trade.costCount);
        if (!gameState.addItem(trade.gainItem, trade.gainCount)) {
            // インベントリ満杯 → 素材を返還
            gameState.addItem(trade.costItem, trade.costCount);
            this._showFeedback('インベントリが満杯です！', true);
            return;
        }
        EventBus.emit(Events.INVENTORY_CHANGED);
        // エメラルド残量を更新
        this._refreshEmerald();
        const gainPart = trade.label.split('→')[1]?.trim() ?? `${trade.gainItem}×${trade.gainCount}`;
        this._showFeedback(`${gainPart} を入手！`);
    }

    private _refreshEmerald(): void {
        const count = gameState.countItem(ITEM.EMERALD);
        this._emeraldText.setText(`💚 エメラルド: ${count}`);
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

    open(villagerName: string, greeting: string): void {
        this.visible = true;
        this.nameText.setText(`村人: ${villagerName}`);
        this.greetText.setText(`「${greeting}」`);
        this._refreshEmerald();
        this.container.setVisible(true);
        // ボタンを有効化
        this._btnData.forEach(b => b.gfx.setInteractive(b.rect, Phaser.Geom.Rectangle.Contains));
    }

    close(): void {
        this.visible = false;
        this.container.setVisible(false);
        // ボタンを無効化（非表示でも interactive が残るため）
        this._btnData.forEach(b => b.gfx.disableInteractive());
    }

    destroy(): void {
        this.container.destroy();
    }
}
