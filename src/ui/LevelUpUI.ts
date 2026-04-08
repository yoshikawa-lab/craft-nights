// ============================
// LevelUpUI — レベルアップ選択（Hades / Vampire Survivors スタイル）
// 3枚のカードから1つ選んでパワーアップ
// ============================
import Phaser from 'phaser';
import { GAME, PX, UI, PALETTE } from '../core/Constants';
import { gameState } from '../core/GameState';

interface LevelUpOption {
    icon: string;
    label: string;
    desc: string;
    color: number;
    apply: () => void;
}

export class LevelUpUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container | null = null;
    private _visible = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    get visible(): boolean { return this._visible; }

    show(onClose: () => void): void {
        if (this._visible) return;
        this._visible = true;

        const options: LevelUpOption[] = this._buildOptions();
        const w = GAME.WIDTH, h = GAME.HEIGHT;

        this.container = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(700);

        // ---- 暗幕 ----
        const overlay = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.72)
            .setScrollFactor(0);
        this.container.add(overlay);

        // ---- タイトル ----
        const titleText = this.scene.add.text(w / 2, h * 0.18, `⬆ LEVEL UP!  Lv.${gameState.level}`, {
            fontSize: `${17 * PX}px`,
            fontFamily: UI.FONT_FAMILY,
            color: PALETTE.TEXT_YELLOW,
            stroke: '#000000',
            strokeThickness: 3 * PX,
        }).setOrigin(0.5).setScrollFactor(0);

        const subText = this.scene.add.text(w / 2, h * 0.28, 'パワーアップを1つ選べ！', {
            fontSize: `${9 * PX}px`,
            fontFamily: UI.FONT_FAMILY,
            color: '#aaaacc',
        }).setOrigin(0.5).setScrollFactor(0);

        this.container.add([titleText, subText]);

        // ---- カード描画 ----
        const cardW = 120 * PX;
        const cardH = 115 * PX;
        const gap   = 145 * PX;
        const cardY = h * 0.54;

        options.forEach((opt, i) => {
            const cx = w / 2 + (i - 1) * gap;
            const card = this.scene.add.container(cx, cardY).setScrollFactor(0);

            // カード背景
            const bg = this.scene.add.graphics();
            bg.fillStyle(opt.color, 0.88);
            bg.lineStyle(2 * PX, 0xffffff, 0.45);
            bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8 * PX);
            bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8 * PX);

            // ハイライト（上部グロー）
            bg.fillStyle(0xffffff, 0.12);
            bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH * 0.4, 8 * PX);

            const iconTxt = this.scene.add.text(0, -cardH * 0.3, opt.icon, {
                fontSize: `${18 * PX}px`,
            }).setOrigin(0.5);

            const labelTxt = this.scene.add.text(0, cardH * 0.02, opt.label, {
                fontSize: `${10 * PX}px`,
                fontFamily: UI.FONT_FAMILY,
                color: '#ffffff',
                stroke: '#000',
                strokeThickness: 2 * PX,
                align: 'center',
            }).setOrigin(0.5);

            const descTxt = this.scene.add.text(0, cardH * 0.28, opt.desc, {
                fontSize: `${8 * PX}px`,
                fontFamily: UI.FONT_FAMILY,
                color: '#ddeeff',
                align: 'center',
                wordWrap: { width: cardW * 0.85 },
            }).setOrigin(0.5);

            card.add([bg, iconTxt, labelTxt, descTxt]);
            card.setScrollFactor(0);

            // インタラクティブ
            // ※ scrollFactor(0)を明示しないとカメラスクロール後にヒットテストがズレてクリック不能になる
            bg.setScrollFactor(0).setInteractive(
                new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
                Phaser.Geom.Rectangle.Contains,
            );
            bg.on('pointerover', () => {
                this.scene.tweens.killTweensOf(card);
                this.scene.tweens.add({ targets: card, scaleX: 1.09, scaleY: 1.09, duration: 120, ease: 'Back.easeOut' });
            });
            bg.on('pointerout', () => {
                this.scene.tweens.killTweensOf(card);
                this.scene.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 120 });
            });
            bg.on('pointerdown', () => {
                opt.apply();
                this._close(onClose);
            });

            this.container!.add(card);
        });

        // ---- 入場アニメーション ----
        this.container.setAlpha(0).setScale(0.92);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1, scaleX: 1, scaleY: 1,
            duration: 280, ease: 'Back.easeOut',
        });
    }

    private _buildOptions(): LevelUpOption[] {
        return [
            {
                icon: '❤',
                label: 'HP回復',
                desc: 'HP+40\n最大HP+20',
                color: 0x881122,
                apply: () => {
                    gameState.maxHp += 20;
                    gameState.hp = Math.min(gameState.hp + 40, gameState.maxHp);
                },
            },
            {
                icon: '⚔',
                label: '攻撃強化',
                desc: '攻撃力\n+10',
                color: 0x113366,
                apply: () => { gameState.bonusAttack += 10; },
            },
            {
                icon: '⚡',
                label: '素早さ',
                desc: '移動速度\n+20%',
                color: 0x115522,
                apply: () => { gameState.bonusSpeed += 0.2; },
            },
        ];
    }

    private _close(onClose: () => void): void {
        this._visible = false;
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0, scaleX: 0.92, scaleY: 0.92,
            duration: 200,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.container?.destroy();
                this.container = null;
                onClose();
            },
        });
    }
}
