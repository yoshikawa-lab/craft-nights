import Phaser from 'phaser';
import { ItemType, PX, PALETTE, ITEM, UI } from '../core/Constants';

const ITEM_COLORS: Record<string, number> = {
    [ITEM.WOOD]:             0x8B6914,
    [ITEM.STONE]:            0x888888,
    [ITEM.WOOL]:             0xf0f0f0,
    [ITEM.SWORD]:            0x88aaff,
    [ITEM.AXE]:              0xaa8844,
    [ITEM.PICKAXE]:          0x999999,
    [ITEM.BOW]:              0xaa7733,
    [ITEM.ARROW]:            0xeecc66,
    [ITEM.BED]:              0xcc4444,
    [ITEM.DIRT]:             0x8B5E3C,
    [ITEM.GRASS]:            0x4a9e4a,
    [ITEM.IRON_ORE]:         0xcc9944,
    [ITEM.BOX]:              0xA0522D,
    [ITEM.COAL]:             0x333344,
    [ITEM.DIAMOND]:          0x44ddff,
    [ITEM.EMERALD]:          0x44ee66,
    [ITEM.GOLD]:             0xffcc00,
    [ITEM.IRON_INGOT]:       0xaaaaaa,
    [ITEM.GOLD_INGOT]:       0xffcc00,
    [ITEM.IRON_ARMOR]:       0x888899,
    [ITEM.DIAMOND_ARMOR]:    0x44ddff,
    [ITEM.GOLD_ARMOR]:       0xffcc00,
    [ITEM.IRON_SWORD]:       0xaabbcc,
    [ITEM.IRON_PICK]:        0x99aaaa,
    [ITEM.DIAMOND_SWORD]:    0x44ddff,
    [ITEM.DIAMOND_PICK]:     0x44ddff,
    [ITEM.GOLD_SWORD]:       0xffcc00,
    [ITEM.FURNACE_ITEM]:     0x554433,
    [ITEM.BUCKET]:           0x99aaaa,
    [ITEM.NETHERITE]:        0x440033,
    [ITEM.NETHERITE_SWORD]:  0x881155,
    [ITEM.NETHERITE_ARMOR]:  0x661144,
    [ITEM.NETHERITE_PICK]:   0x550033,
    [ITEM.NETHERITE_BLOCK]:  0x330022,
};

const ITEM_LABELS: Record<string, string> = {
    [ITEM.WOOD]:             '木',
    [ITEM.STONE]:            '石',
    [ITEM.WOOL]:             '羊毛',
    [ITEM.SWORD]:            '剣',
    [ITEM.AXE]:              '斧',
    [ITEM.PICKAXE]:          'ツルハシ',
    [ITEM.BOW]:              '弓',
    [ITEM.ARROW]:            '矢',
    [ITEM.BED]:              'ベッド',
    [ITEM.DIRT]:             '土',
    [ITEM.GRASS]:            '草',
    [ITEM.IRON_ORE]:         '鉄鉱石',
    [ITEM.BOX]:              '箱',
    [ITEM.COAL]:             '石炭',
    [ITEM.DIAMOND]:          'ダイヤ',
    [ITEM.EMERALD]:          'エメラルド',
    [ITEM.GOLD]:             '金鉱石',
    [ITEM.IRON_INGOT]:       '鉄',
    [ITEM.GOLD_INGOT]:       '金',
    [ITEM.IRON_ARMOR]:       '鉄鎧',
    [ITEM.DIAMOND_ARMOR]:    'ダイヤ鎧',
    [ITEM.GOLD_ARMOR]:       '金鎧',
    [ITEM.IRON_SWORD]:       '鉄剣',
    [ITEM.IRON_PICK]:        '鉄掘',
    [ITEM.DIAMOND_SWORD]:    'ダイヤ剣',
    [ITEM.DIAMOND_PICK]:     'ダイヤ掘',
    [ITEM.GOLD_SWORD]:       '金剣',
    [ITEM.FURNACE_ITEM]:     'かまど',
    [ITEM.BUCKET]:           'バケツ',
    [ITEM.NETHERITE]:        'N素材',
    [ITEM.NETHERITE_SWORD]:  'N剣',
    [ITEM.NETHERITE_ARMOR]:  'N鎧',
    [ITEM.NETHERITE_PICK]:   'N掘',
    [ITEM.NETHERITE_BLOCK]:  'Nブロック',
};

// レアアイテム（グロー演出を付けるもの）
const RARE_ITEMS = new Set<string>([
    ITEM.DIAMOND, ITEM.EMERALD,
    ITEM.DIAMOND_SWORD, ITEM.DIAMOND_PICK, ITEM.DIAMOND_ARMOR,
    ITEM.NETHERITE, ITEM.NETHERITE_SWORD, ITEM.NETHERITE_ARMOR, ITEM.NETHERITE_PICK, ITEM.NETHERITE_BLOCK,
]);

export class DroppedItem extends Phaser.GameObjects.Container {
    readonly itemType: ItemType;
    readonly itemCount: number;
    private _bob = 0;
    private _baseY: number;
    private _glowGfx?: Phaser.GameObjects.Graphics;
    private _glowPhase = Math.random() * Math.PI * 2;

    constructor(scene: Phaser.Scene, x: number, y: number, item: ItemType, count = 1) {
        super(scene, x, y);
        this.itemType  = item;
        this.itemCount = count;
        this._baseY    = y;
        scene.add.existing(this);
        this.setDepth(8);

        const size  = 10 * PX;
        const color = ITEM_COLORS[item] ?? 0xaaaaaa;
        const isRare = RARE_ITEMS.has(item);

        // ---- グロー（レアアイテム専用、最背面） ----
        if (isRare) {
            this._glowGfx = scene.add.graphics();
            this._glowGfx.fillStyle(color, 0.18);
            this._glowGfx.fillCircle(0, 0, size * 2.4);
            this.addAt(this._glowGfx, 0);
        }

        // ---- アイテム本体 ----
        const gfx = scene.add.graphics();
        gfx.fillStyle(color);
        gfx.fillRoundedRect(-size, -size, size * 2, size * 2, 3 * PX);
        // 上部ハイライト
        gfx.fillStyle(0xffffff, 0.30);
        gfx.fillRoundedRect(-size, -size, size * 2, size * 0.55, 2 * PX);
        // 下部シャドウ
        const darkColor = Phaser.Display.Color.IntegerToColor(color).darken(30).color;
        gfx.fillStyle(darkColor, 0.40);
        gfx.fillRoundedRect(-size, size * 0.4, size * 2, size * 0.6, 2 * PX);
        this.add(gfx);

        // ---- アイテム名ラベル ----
        const label = scene.add.text(0, size + 4 * PX, ITEM_LABELS[item] ?? item, {
            fontSize: `${8 * PX}px`,
            fontFamily: UI.FONT_FAMILY,
            color: isRare ? '#ffdd44' : PALETTE.TEXT_WHITE,
            stroke: '#000000',
            strokeThickness: 2 * PX,
        }).setOrigin(0.5, 0);
        this.add(label);

        // ---- スタック数（2個以上のとき右下に表示） ----
        if (count > 1) {
            const cntBg = scene.add.graphics();
            cntBg.fillStyle(0x000000, 0.65);
            cntBg.fillRoundedRect(size * 0.05, size * 0.3, size * 1.1, size * 0.72, 2 * PX);
            const cntTxt = scene.add.text(size * 0.6, size * 0.66, `×${count}`, {
                fontSize: `${7.5 * PX}px`,
                fontFamily: UI.FONT_FAMILY,
                color: '#ffee44',
                stroke: '#000000',
                strokeThickness: 1.5 * PX,
            }).setOrigin(0.5, 0.5);
            this.add([cntBg, cntTxt]);
        }

        // ---- ドロップ時スポーン演出（上にポップ）----
        this.setAlpha(0).setScale(0.5);
        scene.tweens.add({
            targets: this,
            alpha: 1, scaleX: 1, scaleY: 1,
            y: y - 8 * PX,
            duration: 220,
            ease: 'Back.easeOut',
            onComplete: () => { this._baseY = y - 8 * PX; },
        });
    }

    update(delta: number): void {
        // ---- ボブ（絶対座標で振動 → ドリフト防止） ----
        this._bob += delta * 0.003;
        this.y = this._baseY + Math.sin(this._bob) * 4 * PX;

        // ---- グロー呼吸（レアアイテム） ----
        if (this._glowGfx) {
            this._glowPhase += delta * 0.004;
            const pulse = 0.5 + 0.5 * Math.sin(this._glowPhase);
            this._glowGfx.setAlpha(0.12 + pulse * 0.14);
        }
    }
}
