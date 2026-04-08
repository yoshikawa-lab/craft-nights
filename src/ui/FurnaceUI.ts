// ============================
// FurnaceUI — かまど精錬UI
// ============================
import Phaser from 'phaser';
import { GAME, PALETTE, UI, PX, ITEM, ItemType } from '../core/Constants';
import { gameState } from '../core/GameState';
import { EventBus, Events } from '../core/EventBus';

const SMELT_RECIPES: Array<{
    ore: ItemType;
    fuel: ItemType;
    result: ItemType;
    resultCount: number;
    label: string;
}> = [
    { ore: ITEM.IRON_ORE, fuel: ITEM.COAL, result: ITEM.IRON_INGOT, resultCount: 2, label: '鉄鉱石+石炭 → 鉄×2' },
    { ore: ITEM.GOLD,     fuel: ITEM.COAL, result: ITEM.GOLD_INGOT,  resultCount: 2, label: '金鉱石+石炭 → 金×2' },
];

export class FurnaceUI {
    private scene: Phaser.Scene;
    private container!: Phaser.GameObjects.Container;
    visible = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._build();
        this.container.setVisible(false);
    }

    private _build(): void {
        const w = 300 * PX;
        const h = 320 * PX;
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;

        this.container = this.scene.add.container(cx, cy);
        this.container.setScrollFactor(0).setDepth(300);

        // 背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1a0d00, 0.97);
        bg.lineStyle(2 * PX, 0x886633);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        this.container.add(bg);

        // タイトル
        this.container.add(
            this.scene.add.text(0, -h / 2 + 18 * PX, '🔥 かまど', {
                fontSize: `${14 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: '#ff8844', stroke: '#000', strokeThickness: 2 * PX,
            }).setOrigin(0.5),
        );

        // 説明
        this.container.add(
            this.scene.add.text(0, -h / 2 + 40 * PX, '素材を精錬してインゴットを作ろう', {
                fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            }).setOrigin(0.5),
        );

        // 区切り線
        const sep = this.scene.add.graphics();
        sep.lineStyle(1 * PX, 0x664422, 0.6);
        sep.beginPath(); sep.moveTo(-w / 2 + 16 * PX, -h / 2 + 54 * PX); sep.lineTo(w / 2 - 16 * PX, -h / 2 + 54 * PX); sep.strokePath();
        this.container.add(sep);

        // レシピ一覧
        const startY = -h / 2 + 68 * PX;
        const rowH = 72 * PX;
        for (let ri = 0; ri < SMELT_RECIPES.length; ri++) {
            const recipe = SMELT_RECIPES[ri];
            const rowY = startY + ri * rowH;
            this._addRecipeRow(recipe, rowY, w);
        }

        // ヒント
        this.container.add(
            this.scene.add.text(0, h / 2 - 22 * PX,
                '鉱石と石炭を持っていると精錬できます', {
                    fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
                }).setOrigin(0.5),
        );
        this.container.add(
            this.scene.add.text(0, h / 2 - 10 * PX, '[E で閉じる]', {
                fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            }).setOrigin(0.5),
        );
    }

    private _addRecipeRow(
        recipe: { ore: ItemType; fuel: ItemType; result: ItemType; resultCount: number; label: string },
        rowY: number,
        panelW: number,
    ): void {
        const pw = panelW * 0.88;
        const ph = 64 * PX;

        // 行背景
        const box = this.scene.add.graphics();
        box.fillStyle(0x2a1a08);
        box.lineStyle(1 * PX, 0x664422);
        box.fillRoundedRect(-pw / 2, rowY, pw, ph, 4 * PX);
        box.strokeRoundedRect(-pw / 2, rowY, pw, ph, 4 * PX);
        this.container.add(box);

        // レシピラベル
        const lbl = this.scene.add.text(-pw / 2 + 10 * PX, rowY + 10 * PX, recipe.label, {
            fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_WHITE,
        });
        this.container.add(lbl);

        // 在庫表示 (更新用に毎回再描画)
        const stockLbl = this.scene.add.text(-pw / 2 + 10 * PX, rowY + 26 * PX, '', {
            fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
        });
        this.container.add(stockLbl);

        const updateStock = () => {
            const oreCnt  = gameState.countItem(recipe.ore);
            const fuelCnt = gameState.countItem(recipe.fuel);
            stockLbl.setText(`在庫: ${recipe.ore === ITEM.IRON_ORE ? '鉄鉱石' : '金鉱石'}×${oreCnt}  石炭×${fuelCnt}`);
        };
        updateStock();

        // 精錬ボタン
        const btnW = 64 * PX;
        const btnH = 24 * PX;
        const btnX = pw / 2 - btnW / 2 - 8 * PX;
        const btnY = rowY + ph / 2 - btnH / 2;

        const btnBg = this.scene.add.graphics();
        const drawBtn = (hover: boolean) => {
            btnBg.clear();
            btnBg.fillStyle(hover ? 0xaa5522 : 0x774411);
            btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 4 * PX);
        };
        drawBtn(false);
        const btnText = this.scene.add.text(btnX, btnY, '精錬', {
            fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#ffffff',
        }).setOrigin(0.5);

        btnBg.setScrollFactor(0).setInteractive(
            new Phaser.Geom.Rectangle(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH),
            Phaser.Geom.Rectangle.Contains,
        );
        btnBg.on('pointerdown', () => {
            this._smelt(recipe.ore, recipe.fuel, recipe.result, recipe.resultCount, recipe.label);
            updateStock();
        });
        btnBg.on('pointerover', () => drawBtn(true));
        btnBg.on('pointerout',  () => drawBtn(false));
        this.container.add([btnBg, btnText]);

        // インベントリが変わったときに在庫更新
        EventBus.on(Events.INVENTORY_CHANGED, updateStock, this);
    }

    private _smelt(ore: ItemType, fuel: ItemType, result: ItemType, resultCount: number, label: string): void {
        if (gameState.countItem(ore) < 1 || gameState.countItem(fuel) < 1) {
            this._showFeedback('素材が足りません！', true);
            return;
        }
        gameState.consumeItem(ore,  1);
        gameState.consumeItem(fuel, 1);
        gameState.addItem(result, resultCount);
        EventBus.emit(Events.INVENTORY_CHANGED);
        // labelの「→ XXX」部分を使ってわかりやすいフィードバック
        const resultPart = label.split('→')[1]?.trim() ?? `${result}×${resultCount}`;
        this._showFeedback(`${resultPart} を精錬しました！`);
    }

    private _showFeedback(msg: string, error = false): void {
        const text = this.scene.add.text(0, 40 * PX, msg, {
            fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: error ? PALETTE.TEXT_RED : PALETTE.TEXT_GREEN,
            align: 'center', stroke: '#000', strokeThickness: 1 * PX,
        }).setOrigin(0.5);
        this.container.add(text);
        this.scene.tweens.add({
            targets: text, y: 20 * PX, alpha: 0,
            duration: 2000, ease: 'Quad.easeOut',
            onComplete: () => { if (text?.active) text.destroy(); },
        });
    }

    toggle(): void {
        this.visible = !this.visible;
        this.container.setVisible(this.visible);
    }

    close(): void {
        this.visible = false;
        this.container.setVisible(false);
    }

    destroy(): void {
        EventBus.off(Events.INVENTORY_CHANGED, undefined, this);
        this.container.destroy();
    }
}
