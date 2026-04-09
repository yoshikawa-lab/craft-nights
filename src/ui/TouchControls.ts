// ============================
// TouchControls — iPad/スマホ向けタッチ操作（商用レベル再設計）
// ============================
import Phaser from 'phaser';
import { GAME, TOUCH, PX, SAFE_ZONE, UI } from '../core/Constants';
import { Player } from '../objects/Player';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';

export class TouchControls {
    private scene: Phaser.Scene;
    private player: Player;
    private stickActive = false;
    private stickOriginX = 0;
    private stickOriginY = 0;
    private stickPointerId = -1;
    private stickBase!: Phaser.GameObjects.Graphics;
    private stickThumb!: Phaser.GameObjects.Graphics;
    readonly visible: boolean;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.visible = hasTouch;
        if (hasTouch) this._build();
    }

    private _build(): void {
        const btmY = GAME.HEIGHT - SAFE_ZONE.BOTTOM;

        // ============================
        // 左側: バーチャルジョイスティック
        // ============================
        const jR = TOUCH.JOYSTICK_SIZE * PX;
        const tR = TOUCH.JOYSTICK_THUMB_SIZE * PX;
        const jX = jR + 28 * PX;
        const jY = btmY - jR - 24 * PX;

        // ベース（リング）
        this.stickBase = this.scene.add.graphics();
        this._drawJoystickBase(this.stickBase, jX, jY, jR);
        this.stickBase.setScrollFactor(0).setDepth(500);

        // サム（移動するノブ）
        this.stickThumb = this.scene.add.graphics();
        this._drawJoystickThumb(this.stickThumb, jX, jY, tR);
        this.stickThumb.setScrollFactor(0).setDepth(501);

        // ============================
        // 右側: アクションボタン（三角クラスター）
        // ============================
        // 攻撃ボタン（右下・最大）
        const atkR = 30 * PX;
        const atkX = GAME.WIDTH - atkR - 24 * PX;
        const atkY = btmY - atkR - 20 * PX;
        this._makeActionBtn(atkX, atkY, atkR, '⚔', 0x991111, 0xff3333,
            () => { this.player.touchAttack = true; },
            () => { this.player.touchAttack = false; });

        // ジャンプボタン（攻撃の左上）
        const jmpR = 28 * PX;
        const jmpX = atkX - atkR - jmpR - 18 * PX;
        const jmpY = atkY - atkR * 0.3;
        this._makeActionBtn(jmpX, jmpY, jmpR, '↑', 0x116611, 0x33cc33,
            () => { this.player.touchJump = true; },
            () => { this.player.touchJump = false; });

        // インタラクトボタン（ジャンプの左）
        const intR = 24 * PX;
        const intX = jmpX - jmpR - intR - 14 * PX;
        const intY = atkY + 4 * PX;
        this._makeActionBtn(intX, intY, intR, 'E', 0x114488, 0x3366cc,
            () => { this.player.touchInteract = true; },
            () => { this.player.touchInteract = false; });

        // ============================
        // クラフトボタン（右上固定）
        // ============================
        const cftR = 22 * PX;
        const cftX = GAME.WIDTH - cftR - 18 * PX;
        const cftY = SAFE_ZONE.TOP + cftR + 18 * PX;
        this._makeCraftBtn(cftX, cftY, cftR);

        // ============================
        // ホットバーナビゲーション（◀ ▶）
        // ============================
        this._makeHotbarNav(btmY);

        this._setupJoystick(jX, jY, jR);
    }

    /** ジョイスティックのベースリングを描画 */
    private _drawJoystickBase(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
        g.clear();
        // 外側リング
        g.lineStyle(2.5 * PX, 0xffffff, 0.20);
        g.fillStyle(0x000000, 0.25);
        g.fillCircle(x, y, r);
        g.strokeCircle(x, y, r);
        // 内側十字ガイド（薄く）
        g.lineStyle(1 * PX, 0xffffff, 0.08);
        g.beginPath(); g.moveTo(x - r * 0.7, y); g.lineTo(x + r * 0.7, y); g.strokePath();
        g.beginPath(); g.moveTo(x, y - r * 0.7); g.lineTo(x, y + r * 0.7); g.strokePath();
    }

    /** ジョイスティックのサムノブを描画 */
    private _drawJoystickThumb(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
        g.clear();
        g.fillStyle(0xffffff, 0.55);
        g.fillCircle(x, y, r);
        g.lineStyle(2 * PX, 0xffffff, 0.35);
        g.strokeCircle(x, y, r);
        // ハイライト
        g.fillStyle(0xffffff, 0.30);
        g.fillCircle(x - r * 0.2, y - r * 0.25, r * 0.45);
    }

    /** アクションボタン（円形、グロー付き） */
    private _makeActionBtn(
        x: number, y: number, r: number,
        label: string,
        colorBase: number, colorHover: number,
        onDown: () => void, onUp: () => void,
    ): void {
        const g = this.scene.add.graphics();
        const drawBtn = (hover: boolean) => {
            g.clear();
            const c = hover ? colorHover : colorBase;
            // グロー（外側）
            g.fillStyle(c, 0.15);
            g.fillCircle(x, y, r * 1.35);
            // ボタン本体
            g.fillStyle(c, TOUCH.BTN_ALPHA);
            g.fillCircle(x, y, r);
            // リム（縁）
            g.lineStyle(2 * PX, c, 0.7);
            g.strokeCircle(x, y, r);
            // 内側ハイライト
            g.fillStyle(0xffffff, hover ? 0.18 : 0.10);
            g.fillCircle(x - r * 0.15, y - r * 0.2, r * 0.55);
        };
        drawBtn(false);
        g.setScrollFactor(0).setDepth(500);

        const hitR = r * 1.2;   // タップ判定を少し広めに
        g.setInteractive(new Phaser.Geom.Circle(x, y, hitR), Phaser.Geom.Circle.Contains);
        g.on('pointerdown', () => { drawBtn(true); onDown(); });
        g.on('pointerup',   () => { drawBtn(false); onUp(); });
        g.on('pointerout',  () => { drawBtn(false); onUp(); });

        // ラベルテキスト
        this.scene.add.text(x, y, label, {
            fontSize: `${r * 0.9}px`,
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1.5 * PX,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
    }

    /** クラフトボタン（角丸四角形スタイル） */
    private _makeCraftBtn(x: number, y: number, r: number): void {
        const g = this.scene.add.graphics();
        const drawBtn = (hover: boolean) => {
            g.clear();
            const c = hover ? 0xcc9933 : 0x886622;
            // グロー
            g.fillStyle(c, 0.12);
            g.fillRoundedRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8, r * 0.6);
            // 本体
            g.fillStyle(c, 0.70);
            g.fillRoundedRect(x - r, y - r, r * 2, r * 2, r * 0.4);
            // 縁
            g.lineStyle(1.5 * PX, hover ? 0xffcc44 : 0xaa8833, 0.8);
            g.strokeRoundedRect(x - r, y - r, r * 2, r * 2, r * 0.4);
        };
        drawBtn(false);
        g.setScrollFactor(0).setDepth(500);
        g.setInteractive(
            new Phaser.Geom.Rectangle(x - r * 1.1, y - r * 1.1, r * 2.2, r * 2.2),
            Phaser.Geom.Rectangle.Contains,
        );
        g.on('pointerdown', () => {
            drawBtn(true);
            EventBus.emit(Events.CRAFT_TOGGLE);
        });
        g.on('pointerup',  () => drawBtn(false));
        g.on('pointerout', () => drawBtn(false));

        this.scene.add.text(x, y, '🔨', {
            fontSize: `${r * 0.95}px`,
            fontFamily: 'Arial',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

        // "CRAFT" ラベル（小さく）
        this.scene.add.text(x, y + r + 4 * PX, 'CRAFT', {
            fontSize: `${r * 0.50}px`,
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            color: '#ccaa55',
            stroke: '#000',
            strokeThickness: 1 * PX,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(501);
    }

    /** ホットバー◀▶ナビゲーションボタン */
    private _makeHotbarNav(btmY: number): void {
        const slotSize = UI.SLOT_SIZE * PX;
        const hotbarY  = btmY - slotSize / 2;
        const btnW     = 32 * PX;
        const btnH     = slotSize * 0.75;
        const cx       = GAME.WIDTH / 2;
        const totalW   = UI.HOTBAR_SLOTS * (slotSize + UI.PADDING * PX);
        const leftX    = cx - totalW / 2 - btnW / 2 - 6 * PX;
        const rightX   = cx + totalW / 2 + btnW / 2 + 6 * PX;

        const makeNavBtn = (x: number, label: string, onTap: () => void) => {
            const g = this.scene.add.graphics();
            const drawBtn = (hover: boolean) => {
                g.clear();
                const c = hover ? 0x5577aa : 0x223355;
                g.fillStyle(c, 0.75);
                g.lineStyle(1.5 * PX, hover ? 0x88aadd : 0x445577, 0.9);
                g.fillRoundedRect(x - btnW / 2, hotbarY - btnH / 2, btnW, btnH, 4 * PX);
                g.strokeRoundedRect(x - btnW / 2, hotbarY - btnH / 2, btnW, btnH, 4 * PX);
            };
            drawBtn(false);
            g.setScrollFactor(0).setDepth(500);
            g.setInteractive(
                new Phaser.Geom.Rectangle(x - btnW / 2, hotbarY - btnH / 2, btnW, btnH),
                Phaser.Geom.Rectangle.Contains,
            );
            g.on('pointerdown', () => { drawBtn(true); onTap(); });
            g.on('pointerup',   () => drawBtn(false));
            g.on('pointerout',  () => drawBtn(false));

            this.scene.add.text(x, hotbarY, label, {
                fontSize: `${12 * PX}px`,
                fontFamily: '"Helvetica Neue", Arial, sans-serif',
                color: '#aabbdd',
                stroke: '#000', strokeThickness: 1.5 * PX,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
        };

        makeNavBtn(leftX,  '◀', () => {
            gameState.hotbarIndex = (gameState.hotbarIndex + UI.HOTBAR_SLOTS - 1) % UI.HOTBAR_SLOTS;
            EventBus.emit(Events.HOTBAR_SELECT);
        });
        makeNavBtn(rightX, '▶', () => {
            gameState.hotbarIndex = (gameState.hotbarIndex + 1) % UI.HOTBAR_SLOTS;
            EventBus.emit(Events.HOTBAR_SELECT);
        });

        void btmY;
    }

    private _setupJoystick(jX: number, jY: number, jR: number): void {
        const tR = TOUCH.JOYSTICK_THUMB_SIZE * PX;

        this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (!this.stickActive && p.x < GAME.WIDTH * 0.45) {
                this.stickActive    = true;
                this.stickPointerId = p.id;
                this.stickOriginX   = p.x;
                this.stickOriginY   = p.y;
                this._drawJoystickBase(this.stickBase, p.x, p.y, jR);
                this._drawJoystickThumb(this.stickThumb, p.x, p.y, tR);
            }
        });

        this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (!this.stickActive || p.id !== this.stickPointerId) return;
            const dx = p.x - this.stickOriginX;
            const dy = p.y - this.stickOriginY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const cx = dist > jR ? this.stickOriginX + (dx / dist) * jR : p.x;
            const cy = dist > jR ? this.stickOriginY + (dy / dist) * jR : p.y;

            this._drawJoystickThumb(this.stickThumb, cx, cy, tR);

            const ndx = dx / Math.max(dist, 1);
            const ndy = dy / Math.max(dist, 1);
            this.player.touchLeft  = ndx < -0.25;   // デッドゾーン改善
            this.player.touchRight = ndx >  0.25;

            // 上スワイプ = ジャンプ（より確実に）
            if (ndy < -0.55 && dist > jR * 0.4) {
                this.player.touchJump = true;
            }
        });

        this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
            if (p.id === this.stickPointerId) {
                this.stickActive    = false;
                this.stickPointerId = -1;
                // ベースを元の位置に戻す
                this._drawJoystickBase(this.stickBase, jX, jY, jR);
                this._drawJoystickThumb(this.stickThumb, jX, jY, tR);
                this.player.touchLeft  = false;
                this.player.touchRight = false;
                this.player.touchJump  = false;
            }
        });
    }
}
