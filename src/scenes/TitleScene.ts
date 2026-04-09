// ============================
// TitleScene — タイトル画面（商用レベルリデザイン）
// ============================
import Phaser from 'phaser';
import { GAME, PX, UI, PALETTE, SAFE_ZONE } from '../core/Constants';
import { gameState } from '../core/GameState';
import { audioManager } from '../audio/AudioManager';

interface Star { x: number; y: number; r: number; phase: number; speed: number }

export class TitleScene extends Phaser.Scene {
    private stars: Star[] = [];
    private starGfx!: Phaser.GameObjects.Graphics;

    constructor() { super({ key: 'TitleScene' }); }

    create(): void {
        const w = GAME.WIDTH, h = GAME.HEIGHT;

        // ---- 夜空グラデーション ----
        const bg = this.add.graphics();
        bg.fillGradientStyle(
            PALETTE.SKY_NIGHT_TOP, PALETTE.SKY_NIGHT_TOP,
            PALETTE.SKY_NIGHT_BOT, PALETTE.SKY_NIGHT_BOT, 1,
        );
        bg.fillRect(0, 0, w, h);

        // ---- 星を生成 ----
        for (let i = 0; i < 160; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h * 0.72,
                r: (0.6 + Math.random() * 1.8) * PX,
                phase: Math.random() * Math.PI * 2,
                speed: 0.0008 + Math.random() * 0.0018,
            });
        }
        this.starGfx = this.add.graphics().setDepth(1);

        // ---- 月 ----
        this._drawMoon(w, h);

        // ---- 地面シルエット ----
        this._drawGroundSilhouette(w, h);

        // ---- タイトルロゴ ----
        // 光芒エフェクト（グロー）
        const glow = this.add.graphics().setDepth(9);
        glow.fillStyle(0xffdd44, 0.04);
        glow.fillEllipse(w / 2, h * 0.30, w * 0.7, h * 0.18);

        // 影
        this.add.text(w / 2 + 3 * PX, h * 0.27 + 3 * PX, '⛏ CraftNights', {
            fontSize: `${34 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#001122',
        }).setOrigin(0.5).setDepth(10);
        // 本体
        const title = this.add.text(w / 2, h * 0.27, '⛏ CraftNights', {
            fontSize: `${34 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffdd44',
            stroke: '#7a4000',
            strokeThickness: 4 * PX,
        }).setOrigin(0.5).setDepth(11);
        // サブタイトル
        const sub = this.add.text(w / 2, h * 0.27 + 42 * PX, '夜を生き延びろ', {
            fontSize: `${12 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#8899bb', stroke: '#000', strokeThickness: 1.5 * PX,
            letterSpacing: 4 * PX,
        }).setOrigin(0.5).setDepth(11);

        // タイトルのゆったりフロート
        this.tweens.add({
            targets: [title, sub, glow],
            y: `-=${4 * PX}`,
            duration: 2600,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // ---- ボタンエリア ----
        const hasSave = gameState.hasSave();
        const btnAreaY = h * 0.50;

        if (hasSave) {
            // コンティニューボタン（メイン）
            this._makeButton(
                w / 2, btnAreaY,
                360 * PX, 52 * PX,
                '▶  コンティニュー',
                0x1a5c1a, 0x44cc44,
                14 * PX,
                () => this._startGame(),
            );
            // 新規ゲームボタン（サブ）
            this._makeButton(
                w / 2, btnAreaY + 64 * PX,
                280 * PX, 40 * PX,
                '＋ あたらしくはじめる',
                0x2a1a08, 0xaa6622,
                10 * PX,
                () => {
                    gameState.deleteSave();
                    gameState.reset();
                    this._startGame();
                },
            );
            // セーブデータ情報
            this.add.text(w / 2, btnAreaY + 118 * PX,
                `Day ${gameState.load() ? gameState.dayCount : '?'}  Lv.${gameState.level}  から再開`, {
                    fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY,
                    color: '#667788', stroke: '#000', strokeThickness: 1 * PX,
                }).setOrigin(0.5).setDepth(12);
        } else {
            // はじめるボタン（メインのみ）
            this._makeButton(
                w / 2, btnAreaY + 10 * PX,
                360 * PX, 54 * PX,
                '▶  ゲームをはじめる',
                0x1a3a5c, 0x4488cc,
                14 * PX,
                () => this._startGame(),
            );
        }

        // ---- 操作説明 ----
        const guideY = hasSave ? h * 0.78 : h * 0.70;
        this._drawControlGuide(w, guideY);

        // ---- フェードイン ----
        this.cameras.main.fadeIn(900);
    }

    private _makeButton(
        cx: number, cy: number,
        bw: number, bh: number,
        label: string,
        colorBase: number, colorHover: number,
        fontSize: number,
        onClick: () => void,
    ): void {
        const g = this.add.graphics().setDepth(12);
        const drawBtn = (hover: boolean) => {
            g.clear();
            const c = hover ? colorHover : colorBase;
            // グロー
            g.fillStyle(c, 0.12);
            g.fillRoundedRect(cx - bw / 2 - 6 * PX, cy - bh / 2 - 6 * PX, bw + 12 * PX, bh + 12 * PX, bh * 0.5 + 6 * PX);
            // 本体
            g.fillStyle(c, 0.75);
            g.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, bh * 0.45);
            // 縁
            g.lineStyle(1.5 * PX, hover ? colorHover | 0x444444 : colorHover, 0.6);
            g.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, bh * 0.45);
            // 上部ハイライト
            g.fillStyle(0xffffff, hover ? 0.10 : 0.06);
            g.fillRoundedRect(cx - bw / 2 + 4 * PX, cy - bh / 2 + 3 * PX, bw - 8 * PX, bh * 0.4, bh * 0.3);
        };
        drawBtn(false);

        g.setInteractive(
            new Phaser.Geom.Rectangle(cx - bw / 2, cy - bh / 2, bw, bh),
            Phaser.Geom.Rectangle.Contains,
        );
        g.on('pointerover', () => drawBtn(true));
        g.on('pointerout',  () => drawBtn(false));
        g.on('pointerdown', onClick);

        this.add.text(cx, cy, label, {
            fontSize: `${fontSize}px`,
            fontFamily: UI.FONT_FAMILY,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1.5 * PX,
        }).setOrigin(0.5).setDepth(13);
    }

    private _drawControlGuide(w: number, startY: number): void {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const panelW = 300 * PX;
        const rows = isMobile ? [
            ['左スワイプ', '移動'],
            ['上スワイプ / ↑ボタン', 'ジャンプ'],
            ['⚔ボタン', '攻撃 / 採掘'],
            ['E ボタン', 'インタラクト'],
            ['🔨 ボタン', 'クラフト'],
        ] : [
            ['WASD / 矢印', '移動 / ジャンプ'],
            ['クリック', '攻撃 / 採掘'],
            ['E', 'インタラクト'],
            ['C', 'クラフト'],
            ['S', 'セーブ'],
        ];

        const rowH = 16 * PX;
        const panelH = rowH * rows.length + 28 * PX;

        const bg = this.add.graphics().setDepth(11);
        bg.fillStyle(0x000011, 0.55);
        bg.lineStyle(1 * PX, 0x223344, 0.6);
        bg.fillRoundedRect(w / 2 - panelW / 2, startY, panelW, panelH, 8 * PX);
        bg.strokeRoundedRect(w / 2 - panelW / 2, startY, panelW, panelH, 8 * PX);

        // タイトル
        this.add.text(w / 2, startY + 10 * PX, '── 操作方法 ──', {
            fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#556677',
        }).setOrigin(0.5, 0).setDepth(12);

        rows.forEach(([key, desc], i) => {
            const iy = startY + 24 * PX + i * rowH;
            this.add.text(w * 0.28, iy, key, {
                fontSize: `${7.5 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_YELLOW,
            }).setOrigin(0, 0).setDepth(12);
            this.add.text(w * 0.55, iy, desc, {
                fontSize: `${7.5 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#ccddee',
            }).setOrigin(0, 0).setDepth(12);
        });
    }

    private _startGame(): void {
        audioManager.init();
        audioManager.resume();
        this.cameras.main.fade(500, 0, 0, 0);
        this.time.delayedCall(500, () => this.scene.start('GameScene'));
    }

    update(time: number): void {
        this._drawStars(time);
    }

    private _drawStars(time: number): void {
        const g = this.starGfx;
        g.clear();
        for (const s of this.stars) {
            const alpha = 0.45 + 0.55 * Math.sin(time * s.speed + s.phase);
            g.fillStyle(0xffffff, alpha);
            g.fillCircle(s.x, s.y, s.r);
        }
    }

    private _drawMoon(w: number, h: number): void {
        const g = this.add.graphics().setDepth(2);
        const mx = w * 0.73, my = h * 0.17;
        const mr = 22 * PX;
        g.fillStyle(0xffeebb, 0.05); g.fillCircle(mx, my, mr * 3.2);
        g.fillStyle(0xffeebb, 0.10); g.fillCircle(mx, my, mr * 2.0);
        g.fillStyle(0xfffcee);       g.fillCircle(mx, my, mr);
        const shadowColor = Phaser.Display.Color.IntegerToColor(PALETTE.SKY_NIGHT_BOT).color;
        g.fillStyle(shadowColor);    g.fillCircle(mx + mr * 0.38, my - mr * 0.1, mr * 0.82);
        g.fillStyle(0xeeddcc, 0.30); g.fillCircle(mx - mr * 0.22, my + mr * 0.15, mr * 0.18);
        g.fillStyle(0xeeddcc, 0.20); g.fillCircle(mx - mr * 0.45, my - mr * 0.28, mr * 0.11);
    }

    private _drawGroundSilhouette(w: number, h: number): void {
        const g = this.add.graphics().setDepth(5);
        g.fillStyle(0x050d05, 1);
        g.beginPath();
        g.moveTo(0, h);
        const pts: [number, number][] = [];
        const step = w / 60;
        let cy = h * 0.82;
        for (let x = 0; x <= w + step; x += step) {
            cy += (Math.random() - 0.5) * 7 * PX;
            cy = Math.max(h * 0.76, Math.min(h * 0.88, cy));
            pts.push([x, cy]);
        }
        for (const [px, py] of pts) g.lineTo(px, py);
        g.lineTo(w, h);
        g.closePath();
        g.fillPath();

        // 木のシルエット
        const treeCount = 16;
        for (let i = 0; i < treeCount; i++) {
            const tx = (i / treeCount) * w + (Math.random() - 0.5) * (w / treeCount * 0.5);
            const baseY = h * 0.79 + (Math.random() - 0.5) * 4 * PX;
            const th = (16 + Math.random() * 20) * PX;
            const tw = (8 + Math.random() * 8) * PX;
            g.fillStyle(0x050d05);
            g.fillRect(tx - 2 * PX, baseY, 4 * PX, th * 0.45);
            g.fillStyle(0x091509);
            g.fillTriangle(tx, baseY - th, tx - tw * 0.5, baseY - th * 0.15, tx + tw * 0.5, baseY - th * 0.15);
            g.fillStyle(0x0b1c0b);
            g.fillTriangle(tx, baseY - th * 0.70, tx - tw * 0.65, baseY + th * 0.07, tx + tw * 0.65, baseY + th * 0.07);
            g.fillStyle(0x0d220d);
            g.fillTriangle(tx, baseY - th * 0.38, tx - tw * 0.82, baseY + th * 0.24, tx + tw * 0.82, baseY + th * 0.24);
        }
    }
}
