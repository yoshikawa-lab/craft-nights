// ============================
// HelpUI — 操作方法 & アイテム説明パネル
// ============================
import Phaser from 'phaser';
import { GAME, PALETTE, UI, PX } from '../core/Constants';

const PANEL_W = 480;  // 設計px
const PANEL_H = 540;

export class HelpUI {
    private scene: Phaser.Scene;
    private container!: Phaser.GameObjects.Container;
    visible = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._build();
        this.container.setVisible(false);
    }

    private _build(): void {
        const cx = GAME.WIDTH  / 2;
        const cy = GAME.HEIGHT / 2;
        const w  = PANEL_W * PX;
        const h  = PANEL_H * PX;

        this.container = this.scene.add.container(cx, cy);
        this.container.setScrollFactor(0).setDepth(400);

        // ---- 背景 ----
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x080818, 0.97);
        bg.lineStyle(2 * PX, 0x446688);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8 * PX);
        bg.fillStyle(0xffffff, 0.03);
        bg.fillRoundedRect(-w / 2 + 2 * PX, -h / 2 + 2 * PX, w - 4 * PX, h * 0.1, 6 * PX);
        this.container.add(bg);

        // ---- タイトル ----
        this.container.add(
            this.scene.add.text(0, -h / 2 + 14 * PX, '❓ 操作方法 & アイテムガイド', {
                fontSize: `${12 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: PALETTE.TEXT_YELLOW, stroke: '#000', strokeThickness: 2 * PX,
            }).setOrigin(0.5),
        );

        // ---- 閉じるボタン ----
        const closeBg = this.scene.add.graphics();
        const closeR  = 11 * PX;
        const closeCX = w / 2 - 14 * PX;
        const closeCY = -h / 2 + 14 * PX;
        closeBg.fillStyle(0x442222, 0.9);
        closeBg.lineStyle(1 * PX, 0x884444);
        closeBg.fillCircle(closeCX, closeCY, closeR);
        closeBg.strokeCircle(closeCX, closeCY, closeR);
        closeBg.setInteractive(new Phaser.Geom.Circle(closeCX, closeCY, closeR), Phaser.Geom.Circle.Contains);
        closeBg.on('pointerdown', () => this.close());
        closeBg.on('pointerover', () => closeBg.setAlpha(0.7));
        closeBg.on('pointerout',  () => closeBg.setAlpha(1));
        this.container.add([
            closeBg,
            this.scene.add.text(closeCX, closeCY, '✕', {
                fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#ff8888',
            }).setOrigin(0.5),
        ]);

        // ---- 2カラムレイアウト ----
        const colW = w * 0.46;
        const startY = -h / 2 + 38 * PX;

        this._buildSection(
            -w / 2 + 8 * PX, startY, colW,
            '🎮 操作方法',
            [
                ['移動',          '← → / A D'],
                ['ジャンプ',      '↑ / W / スペース'],
                ['ダッシュ',      'Shift（空中可）'],
                ['採掘',          'ブロックをクリック'],
                ['攻撃',          '空中クリック / ⚔ボタン'],
                ['インタラクト',  'E / Eボタン（施設に近づく）'],
                ['クラフト',      'C / クラフトボタン'],
                ['ホットバー',    '1〜5 / ◀▶ボタン'],
                ['カメラ移動',    'WASDでスクロール（PC）'],
            ],
        );

        this._buildSection(
            w / 2 - colW - 8 * PX, startY, colW,
            '⚔ 武器・道具',
            [
                ['剣 / 鉄剣 / ダイヤ剣', 'ホットバーに装備→攻撃'],
                ['斧',                    '木材採掘速度UP（装備）'],
                ['ツルハシ',              '石・鉱石採掘UP（装備）'],
                ['弓',                    '装備+矢必要→攻撃で射出'],
            ],
        );

        const col2StartY = startY + 130 * PX;

        this._buildSection(
            w / 2 - colW - 8 * PX, col2StartY, colW,
            '🏗 施設・建築',
            [
                ['ベッド',   '設置→Eで夜をスキップ'],
                ['かまど',   '設置→E→鉱石+石炭で精錬'],
                ['箱',       '設置→Eでアイテム保管'],
                ['バケツ',   '装備→水/溶岩をクリックで採取'],
            ],
        );

        const col3StartY = col2StartY + 130 * PX;

        this._buildSection(
            w / 2 - colW - 8 * PX, col3StartY, colW,
            '🛡 装備・防具',
            [
                ['鎧（各種）',     '所持するだけで防御力UP'],
                ['ネザーライト',   'ダイヤ×4+鉄×4でクラフト'],
                ['N装備',          'ネザーライト×2-5でクラフト'],
            ],
        );

        // ---- クラフト素材メモ ----
        this._buildCraftNote(-w / 2 + 8 * PX, startY + 260 * PX, colW);

        // ---- フッター ----
        this.container.add(
            this.scene.add.text(0, h / 2 - 10 * PX, '? キーまたは ? ボタンでこの画面を開閉', {
                fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            }).setOrigin(0.5),
        );
    }

    private _buildSection(x: number, y: number, w: number, title: string, rows: [string, string][]): void {
        const lineH = 22 * PX;

        // セクションタイトル
        this.container.add(
            this.scene.add.text(x, y, title, {
                fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: PALETTE.TEXT_YELLOW, stroke: '#000', strokeThickness: 1.5 * PX,
            }),
        );

        // 下線
        const line = this.scene.add.graphics();
        line.lineStyle(1, 0x446688, 0.7);
        line.beginPath();
        line.moveTo(x, y + 14 * PX);
        line.lineTo(x + w, y + 14 * PX);
        line.strokePath();
        this.container.add(line);

        for (let i = 0; i < rows.length; i++) {
            const [label, value] = rows[i];
            const ry = y + 18 * PX + i * lineH;
            this.container.add(
                this.scene.add.text(x + 4 * PX, ry, label, {
                    fontSize: `${7.5 * PX}px`, fontFamily: UI.FONT_FAMILY,
                    color: PALETTE.TEXT_WHITE,
                }),
            );
            this.container.add(
                this.scene.add.text(x + w - 4 * PX, ry, value, {
                    fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY,
                    color: '#aaccff',
                }).setOrigin(1, 0),
            );
        }
    }

    private _buildCraftNote(x: number, y: number, w: number): void {
        const title = '⚒ 主要クラフトレシピ';
        this.container.add(
            this.scene.add.text(x, y, title, {
                fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: PALETTE.TEXT_YELLOW, stroke: '#000', strokeThickness: 1.5 * PX,
            }),
        );

        const line = this.scene.add.graphics();
        line.lineStyle(1, 0x446688, 0.7);
        line.beginPath();
        line.moveTo(x, y + 14 * PX);
        line.lineTo(x + w, y + 14 * PX);
        line.strokePath();
        this.container.add(line);

        const recipes = [
            ['石の剣',       '石×2 + 木×1'],
            ['石のツルハシ', '石×3 + 木×2'],
            ['鉄の剣',       '鉄鉱石×3 + 木×1'],
            ['かまど',       '石×8'],
            ['ダイヤ剣',     'ダイヤ×2 + 木×1'],
            ['ネザーライト', 'ダイヤ×4 + 鉄×4'],
            ['矢×8',         '木×1 + 石×1'],
            ['バケツ',       '鉄×3'],
        ];

        const lineH = 22 * PX;
        for (let i = 0; i < recipes.length; i++) {
            const [item, mats] = recipes[i];
            const ry = y + 18 * PX + i * lineH;
            this.container.add(
                this.scene.add.text(x + 4 * PX, ry, item, {
                    fontSize: `${7.5 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_WHITE,
                }),
            );
            this.container.add(
                this.scene.add.text(x + w - 4 * PX, ry, mats, {
                    fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#aaccff',
                }).setOrigin(1, 0),
            );
        }
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
        this.container.destroy();
    }
}
