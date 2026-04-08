// ============================
// TitleScene — タイトル画面
// ============================
import Phaser from 'phaser';
import { GAME, PX, UI, PALETTE, SAFE_ZONE } from '../core/Constants';
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
        for (let i = 0; i < 130; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h * 0.68,
                r: (0.7 + Math.random() * 1.6) * PX,
                phase: Math.random() * Math.PI * 2,
                speed: 0.001 + Math.random() * 0.002,
            });
        }
        this.starGfx = this.add.graphics().setDepth(1);

        // ---- 月 ----
        this._drawMoon(w, h);

        // ---- 地面シルエット ----
        this._drawGroundSilhouette(w, h);

        // ---- タイトル影 ----
        this.add.text(w / 2 + 3 * PX, h * 0.30 + 3 * PX, '⛏ CraftNights', {
            fontSize: `${32 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#001122',
        }).setOrigin(0.5).setDepth(10);

        // ---- タイトル本体 ----
        const title = this.add.text(w / 2, h * 0.30, '⛏ CraftNights', {
            fontSize: `${32 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffdd44', stroke: '#7a4000', strokeThickness: 4 * PX,
        }).setOrigin(0.5).setDepth(11);

        // ---- サブタイトル ----
        const sub = this.add.text(w / 2, h * 0.30 + 40 * PX, '🌙 夜を生き延びろ', {
            fontSize: `${13 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#aaaacc',
            stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5).setDepth(11);

        // タイトルゆったりフロート
        this.tweens.add({
            targets: [title, sub],
            y: `-=${5 * PX}`,
            duration: 2200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // ---- 操作説明パネル ----
        const panelY = h * 0.50;
        const panelW = 260 * PX, panelH = 106 * PX;
        const panelBg = this.add.graphics().setDepth(10);
        panelBg.fillStyle(0x000022, 0.65);
        panelBg.lineStyle(1 * PX, 0x334455);
        panelBg.fillRoundedRect(w / 2 - panelW / 2, panelY, panelW, panelH, 6 * PX);
        panelBg.strokeRoundedRect(w / 2 - panelW / 2, panelY, panelW, panelH, 6 * PX);

        const controls: [string, string][] = [
            ['WASD / 矢印', '移動'],
            ['Space / ↑', 'ジャンプ'],
            ['クリック', '攻撃 / 採掘'],
            ['E', 'インタラクト（チェスト・ベッド）'],
            ['C', 'クラフト画面'],
        ];
        controls.forEach(([key, desc], i) => {
            const iy = panelY + 12 * PX + i * 18 * PX;
            this.add.text(w * 0.28, iy, key, {
                fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: PALETTE.TEXT_YELLOW,
            }).setOrigin(0, 0).setDepth(12);
            this.add.text(w * 0.55, iy, desc, {
                fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: PALETTE.TEXT_WHITE,
            }).setOrigin(0, 0).setDepth(12);
        });

        // ---- ゲームの目的 ----
        this.add.text(w / 2, panelY + panelH + 10 * PX,
            '昼は素材を集め、夜の敵を生き延びろ！\nベッドで夜を飛ばすこともできる。', {
                fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: '#88aacc', align: 'center',
                stroke: '#000', strokeThickness: 1 * PX,
            }).setOrigin(0.5, 0).setDepth(12);

        // ---- スタートテキスト（点滅） ----
        const startY = Math.min(h * 0.87, h - SAFE_ZONE.BOTTOM - 20 * PX);
        const startText = this.add.text(w / 2, startY, '▶  クリック / タップで開始', {
            fontSize: `${12 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffffff', stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5).setDepth(12);

        this.tweens.add({
            targets: startText,
            alpha: 0.15,
            duration: 650,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // ---- バージョン ----
        this.add.text(w - 6 * PX, h - 6 * PX - SAFE_ZONE.BOTTOM, 'v1.0', {
            fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#334455',
        }).setOrigin(1, 1).setDepth(12);

        // ---- フェードイン ----
        this.cameras.main.fadeIn(800);

        // ---- スタート入力 ----
        const startGame = () => {
            audioManager.init();
            audioManager.resume();
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => this.scene.start('GameScene'));
        };
        this.input.once('pointerdown', startGame);
        this.input.keyboard?.once('keydown', startGame);
    }

    update(time: number): void {
        this._drawStars(time);
    }

    private _drawStars(time: number): void {
        const g = this.starGfx;
        g.clear();
        for (const s of this.stars) {
            const alpha = 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
            g.fillStyle(0xffffff, alpha);
            g.fillCircle(s.x, s.y, s.r);
        }
    }

    private _drawMoon(w: number, h: number): void {
        const g = this.add.graphics().setDepth(2);
        const mx = w * 0.73, my = h * 0.19;
        const mr = 20 * PX;
        // グロー
        g.fillStyle(0xffeebb, 0.06); g.fillCircle(mx, my, mr * 2.8);
        g.fillStyle(0xffeebb, 0.10); g.fillCircle(mx, my, mr * 1.9);
        // 月本体
        g.fillStyle(0xfffcee); g.fillCircle(mx, my, mr);
        // 三日月の影
        const shadowColor = Phaser.Display.Color.IntegerToColor(PALETTE.SKY_NIGHT_BOT).color;
        g.fillStyle(shadowColor); g.fillCircle(mx + mr * 0.38, my - mr * 0.1, mr * 0.8);
        // 表面のクレーター風
        g.fillStyle(0xeeddcc, 0.35); g.fillCircle(mx - mr * 0.22, my + mr * 0.15, mr * 0.18);
        g.fillStyle(0xeeddcc, 0.25); g.fillCircle(mx - mr * 0.45, my - mr * 0.28, mr * 0.1);
    }

    private _drawGroundSilhouette(w: number, h: number): void {
        const g = this.add.graphics().setDepth(5);

        // 地面ベース
        g.fillStyle(0x060e06, 1);
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
        const treeCount = 14;
        for (let i = 0; i < treeCount; i++) {
            const tx = (i / treeCount) * w + (Math.random() - 0.5) * (w / treeCount * 0.5);
            const baseY = h * 0.79 + (Math.random() - 0.5) * 4 * PX;
            const th = (18 + Math.random() * 18) * PX;
            const tw = (9 + Math.random() * 7) * PX;
            // 幹
            g.fillStyle(0x060e06);
            g.fillRect(tx - 2 * PX, baseY, 4 * PX, th * 0.45);
            // 葉（三角3層）
            g.fillStyle(0x0a160a);
            g.fillTriangle(
                tx, baseY - th,
                tx - tw * 0.5, baseY - th * 0.15,
                tx + tw * 0.5, baseY - th * 0.15,
            );
            g.fillStyle(0x0c1c0c);
            g.fillTriangle(
                tx, baseY - th * 0.72,
                tx - tw * 0.65, baseY + th * 0.05,
                tx + tw * 0.65, baseY + th * 0.05,
            );
            g.fillStyle(0x0e220e);
            g.fillTriangle(
                tx, baseY - th * 0.4,
                tx - tw * 0.8, baseY + th * 0.22,
                tx + tw * 0.8, baseY + th * 0.22,
            );
        }
    }
}
