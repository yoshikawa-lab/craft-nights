// ============================
// TouchControls — 横スクロール版（ジャンプボタン追加）
// ============================
import Phaser from 'phaser';
import { GAME, TOUCH, PX, PALETTE, SAFE_ZONE } from '../core/Constants';
import { Player } from '../objects/Player';

export class TouchControls {
    private scene: Phaser.Scene;
    private player: Player;
    private stickActive = false;
    private stickOriginX = 0;
    private stickOriginY = 0;
    private stickPointerId = -1;
    private stickBase!: Phaser.GameObjects.Arc;
    private stickThumb!: Phaser.GameObjects.Arc;
    readonly visible: boolean;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.visible = hasTouch;
        if (hasTouch) this._build();
    }

    private _build(): void {
        const jR = TOUCH.JOYSTICK_SIZE * PX;
        const tR = TOUCH.JOYSTICK_THUMB_SIZE * PX;
        const jX = jR + 24 * PX;
        const jY = GAME.HEIGHT - SAFE_ZONE.BOTTOM - jR - 24 * PX;

        // ジョイスティック
        this.stickBase = this.scene.add.arc(jX, jY, jR, 0, 360, false, 0x111111, TOUCH.JOYSTICK_ALPHA);
        this.stickBase.setStrokeStyle(2 * PX, PALETTE.UI_BORDER, 0.6).setScrollFactor(0).setDepth(500);
        this.stickThumb = this.scene.add.arc(jX, jY, tR, 0, 360, false, 0x888888, 0.75);
        this.stickThumb.setScrollFactor(0).setDepth(501);

        // 右側ボタン配置
        const bR  = TOUCH.BTN_SIZE * PX;
        const bY  = GAME.HEIGHT - SAFE_ZONE.BOTTOM - bR - 20 * PX;
        const bX0 = GAME.WIDTH  - bR - 20 * PX;

        // ジャンプボタン（大きく・緑）
        const jumpBtn = this._makeBtn(bX0 - bR * 0.6, bY - bR * 0.8, bR * 1.1, '↑', 0x226622);
        jumpBtn.setInteractive();
        jumpBtn.on('pointerdown', () => { this.player.touchJump = true; });
        jumpBtn.on('pointerup',   () => { this.player.touchJump = false; });
        jumpBtn.on('pointerout',  () => { this.player.touchJump = false; });

        // 攻撃ボタン（赤）
        const atkBtn = this._makeBtn(bX0, bY, bR, '⚔', 0xaa2222);
        atkBtn.setInteractive();
        atkBtn.on('pointerdown', () => { this.player.touchAttack = true; });
        atkBtn.on('pointerup',   () => { this.player.touchAttack = false; });
        atkBtn.on('pointerout',  () => { this.player.touchAttack = false; });

        // インタラクトボタン（青）
        const intBtn = this._makeBtn(bX0 - bR * 2.2, bY, bR * 0.8, 'E', 0x224488);
        intBtn.setInteractive();
        intBtn.on('pointerdown', () => { this.player.touchInteract = true; });
        intBtn.on('pointerup',   () => { this.player.touchInteract = false; });
        intBtn.on('pointerout',  () => { this.player.touchInteract = false; });

        this._setupJoystick(jX, jY, jR);
    }

    private _makeBtn(x: number, y: number, r: number, label: string, color: number): Phaser.GameObjects.Arc {
        const btn = this.scene.add.arc(x, y, r, 0, 360, false, color, TOUCH.BTN_ALPHA);
        btn.setStrokeStyle(2 * PX, 0xffffff, 0.3).setScrollFactor(0).setDepth(500);
        this.scene.add.text(x, y, label, {
            fontSize: `${r * 0.85}px`, fontFamily: 'Arial',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
        return btn;
    }

    private _setupJoystick(jX: number, jY: number, jR: number): void {
        this.scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (!this.stickActive && p.x < GAME.WIDTH * 0.45) {
                this.stickActive   = true;
                this.stickPointerId = p.id;
                this.stickOriginX  = p.x;
                this.stickOriginY  = p.y;
                this.stickBase.setPosition(p.x, p.y);
                this.stickThumb.setPosition(p.x, p.y);
            }
        });
        this.scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (!this.stickActive || p.id !== this.stickPointerId) return;
            const dx = p.x - this.stickOriginX;
            const dy = p.y - this.stickOriginY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const cx = dist > jR ? this.stickOriginX + (dx / dist) * jR : p.x;
            const cy = dist > jR ? this.stickOriginY + (dy / dist) * jR : p.y;
            this.stickThumb.setPosition(cx, cy);

            const ndx = dx / Math.max(dist, 1);
            const ndy = dy / Math.max(dist, 1);
            this.player.touchLeft  = ndx < -0.3;
            this.player.touchRight = ndx >  0.3;
            // 上スワイプ = ジャンプ
            if (ndy < -0.6 && dist > jR * 0.5) {
                this.player.touchJump = true;
            }
        });
        this.scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
            if (p.id === this.stickPointerId) {
                this.stickActive   = false;
                this.stickPointerId = -1;
                this.stickThumb.setPosition(this.stickBase.x, this.stickBase.y);
                this.player.touchLeft  = false;
                this.player.touchRight = false;
                this.player.touchJump  = false;
            }
        });
    }
}
