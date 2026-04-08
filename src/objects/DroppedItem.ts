import Phaser from 'phaser';
import { ItemType, PX, PALETTE, ITEM } from '../core/Constants';

const ITEM_COLORS: Record<string, number> = {
    [ITEM.WOOD]: 0x8B6914, [ITEM.STONE]: 0x888888, [ITEM.WOOL]: 0xf0f0f0,
    [ITEM.SWORD]: 0x88aaff, [ITEM.AXE]: 0xaa8844, [ITEM.PICKAXE]: 0x999999,
    [ITEM.BOW]: 0xaa7733, [ITEM.ARROW]: 0xeecc66, [ITEM.BED]: 0xcc4444,
    [ITEM.DIRT]: 0x8B5E3C, [ITEM.GRASS]: 0x4a9e4a, [ITEM.IRON_ORE]: 0xcc9944,
    [ITEM.BOX]: 0xA0522D, [ITEM.COAL]: 0x333344, [ITEM.DIAMOND]: 0x44ddff,
    [ITEM.EMERALD]: 0x44ee66, [ITEM.GOLD]: 0xffcc00,
    [ITEM.IRON_INGOT]: 0xaaaaaa, [ITEM.GOLD_INGOT]: 0xffcc00,
    [ITEM.IRON_ARMOR]: 0x888899, [ITEM.DIAMOND_ARMOR]: 0x44ddff, [ITEM.GOLD_ARMOR]: 0xffcc00,
    [ITEM.IRON_SWORD]: 0xaabbcc, [ITEM.IRON_PICK]: 0x99aaaa,
    [ITEM.DIAMOND_SWORD]: 0x44ddff, [ITEM.DIAMOND_PICK]: 0x44ddff,
    [ITEM.GOLD_SWORD]: 0xffcc00, [ITEM.FURNACE_ITEM]: 0x554433,
};
const ITEM_LABELS: Record<string, string> = {
    [ITEM.WOOD]: '木', [ITEM.STONE]: '石', [ITEM.WOOL]: '羊毛',
    [ITEM.SWORD]: '剣', [ITEM.AXE]: '斧', [ITEM.PICKAXE]: 'ツルハシ',
    [ITEM.BOW]: '弓', [ITEM.ARROW]: '矢', [ITEM.BED]: 'ベッド',
    [ITEM.DIRT]: '土', [ITEM.GRASS]: '草', [ITEM.IRON_ORE]: '鉄鉱石',
    [ITEM.BOX]: '箱', [ITEM.COAL]: '石炭', [ITEM.DIAMOND]: 'ダイヤ',
    [ITEM.EMERALD]: 'エメラルド', [ITEM.GOLD]: '金鉱石',
    [ITEM.IRON_INGOT]: '鉄', [ITEM.GOLD_INGOT]: '金',
    [ITEM.IRON_ARMOR]: '鉄鎧', [ITEM.DIAMOND_ARMOR]: 'ダイヤ鎧', [ITEM.GOLD_ARMOR]: '金鎧',
    [ITEM.IRON_SWORD]: '鉄剣', [ITEM.IRON_PICK]: '鉄掘',
    [ITEM.DIAMOND_SWORD]: 'ダイヤ剣', [ITEM.DIAMOND_PICK]: 'ダイヤ掘',
    [ITEM.GOLD_SWORD]: '金剣', [ITEM.FURNACE_ITEM]: 'かまど',
};

export class DroppedItem extends Phaser.GameObjects.Container {
    readonly itemType: ItemType;
    readonly itemCount: number;
    private bob = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, item: ItemType, count = 1) {
        super(scene, x, y);
        this.itemType = item;
        this.itemCount = count;
        scene.add.existing(this);
        this.setDepth(8);  // タイルの前・キャラより後ろ

        const size = 10 * PX;
        const color = ITEM_COLORS[item] ?? 0xffffff;
        const gfx = scene.add.graphics();
        gfx.fillStyle(color);
        gfx.fillRoundedRect(-size, -size, size * 2, size * 2, 3 * PX);
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillRoundedRect(-size, -size, size * 2, size * 0.6, 2 * PX);
        this.add(gfx);

        const label = scene.add.text(0, size + 4 * PX, ITEM_LABELS[item] ?? item, {
            fontSize: `${8 * PX}px`,
            fontFamily: '"Courier New", monospace',
            color: PALETTE.TEXT_WHITE,
            stroke: '#000000',
            strokeThickness: 2 * PX,
        }).setOrigin(0.5, 0);
        this.add(label);
    }

    update(delta: number): void {
        this.bob += delta * 0.003;
        this.y += Math.sin(this.bob) * 0.3;
    }
}
