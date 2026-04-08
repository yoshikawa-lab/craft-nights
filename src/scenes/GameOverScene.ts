// ============================
// GameOverScene — ゲームオーバー画面
// ============================
import Phaser from 'phaser';
import { GAME, PALETTE, PX, UI, SAFE_ZONE } from '../core/Constants';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';

export class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }

    // ---- LocalStorage ベストスコア ----
    private static readonly _STORAGE_KEY = 'craft-nights-best-v1';

    private _loadBest(): { score: number; level: number; days: number } {
        try {
            const json = localStorage.getItem(GameOverScene._STORAGE_KEY);
            if (json) return JSON.parse(json);
        } catch (_) { /* ignore */ }
        return { score: 0, level: 0, days: 0 };
    }

    private _saveBest(score: number, level: number, days: number): boolean {
        const existing = this._loadBest();
        if (score > existing.score) {
            try {
                localStorage.setItem(GameOverScene._STORAGE_KEY,
                    JSON.stringify({ score, level, days }));
            } catch (_) { /* ignore */ }
            return true;
        }
        return false;
    }

    create(): void {
        const w = GAME.WIDTH, h = GAME.HEIGHT;
        const cy = h / 2;

        // ---- 背景グラデーション ----
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x110011, 0x110011, 0x220022, 0x220022, 1);
        bg.fillRect(0, 0, w, h);

        // ---- アンビエントパーティクル（血のような赤い粒） ----
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = (1 + Math.random() * 3) * PX;
            const c = Math.random() < 0.5 ? 0xdd3333 : 0x7700aa;
            const p = this.add.circle(x, y, r, c, Math.random() * 0.4 + 0.1);
            this.tweens.add({
                targets: p,
                y: y - (20 + Math.random() * 30) * PX,
                alpha: 0,
                duration: 2500 + Math.random() * 2500,
                ease: 'Sine.easeIn',
                delay: Math.random() * 2000,
                repeat: -1,
                onRepeat: () => {
                    p.setPosition(Math.random() * w, h);
                    p.setAlpha(Math.random() * 0.4 + 0.1);
                },
            });
        }

        // ---- 装飾ライン ----
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(1 * PX, 0x880022, 0.6);
        lineGfx.beginPath();
        lineGfx.moveTo(w * 0.1, h * 0.32);
        lineGfx.lineTo(w * 0.9, h * 0.32);
        lineGfx.strokePath();
        lineGfx.beginPath();
        lineGfx.moveTo(w * 0.1, h * 0.72);
        lineGfx.lineTo(w * 0.9, h * 0.72);
        lineGfx.strokePath();

        // ---- GAME OVER タイトル ----
        const titleY = h * 0.18 + SAFE_ZONE.TOP;
        const titleShadow = this.add.text(w / 2 + 4 * PX, titleY + 4 * PX, 'GAME OVER', {
            fontSize: `${38 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#550000',
        }).setOrigin(0.5).setAlpha(0);
        const titleText = this.add.text(w / 2, titleY, 'GAME OVER', {
            fontSize: `${38 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ff3333', stroke: '#000', strokeThickness: 5 * PX,
        }).setOrigin(0.5).setAlpha(0);

        // ---- スコア計算 ----
        const score = gameState.killCount * gameState.level * 10 + (gameState.dayCount - 1) * 100
            + (gameState.victory ? 500 : 0);  // ボス討伐ボーナス

        // Round 5: LocalStorage ベストスコア
        const isNewBest = this._saveBest(score, gameState.level, gameState.dayCount);
        const best = this._loadBest();

        // ---- スコアパネル ----
        const panelY = cy - 22 * PX;
        const panelW = 300 * PX, panelH = 155 * PX;
        const panelBg = this.add.graphics().setAlpha(0);
        panelBg.fillStyle(0x1a0011, 0.85);
        panelBg.lineStyle(1 * PX, isNewBest ? 0xffdd44 : 0x663355);
        panelBg.fillRoundedRect(w / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH, 8 * PX);
        panelBg.strokeRoundedRect(w / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH, 8 * PX);

        // ベストスコア更新時はゴールドの光彩
        if (isNewBest) {
            const glow = this.add.graphics().setAlpha(0);
            glow.lineStyle(3 * PX, 0xffdd44, 0.45);
            glow.strokeRoundedRect(w / 2 - panelW / 2 - 3 * PX, panelY - panelH / 2 - 3 * PX, panelW + 6 * PX, panelH + 6 * PX, 10 * PX);
            this.tweens.add({ targets: glow, alpha: 1, duration: 500, delay: 400 });
        }

        const scoreText = this.add.text(w / 2, panelY - 50 * PX,
            `SCORE  ${score.toLocaleString()}`, {
            fontSize: `${18 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: isNewBest ? '#ffdd44' : '#ffffff',
            stroke: '#000', strokeThickness: 3 * PX,
        }).setOrigin(0.5).setAlpha(0);

        // ベストスコアラベル
        const bestLabel = isNewBest
            ? '🏆 NEW BEST!'
            : `BEST  ${best.score.toLocaleString()}`;
        const bestText = this.add.text(w / 2, panelY - 35 * PX, bestLabel, {
            fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: isNewBest ? '#ffdd44' : '#888866',
            stroke: '#000', strokeThickness: 1 * PX,
        }).setOrigin(0.5).setAlpha(0);

        const stats = [
            [`生存日数`, `Day ${gameState.dayCount}`],
            [`レベル`,   `Lv.${gameState.level}`],
            [`敵討伐数`, `${gameState.killCount} 体`],
            [`結果`,     gameState.victory ? '🏆 CLEAR！' : 'ゲームオーバー'],
        ];
        const statTexts: Phaser.GameObjects.Text[] = [];
        stats.forEach(([label, value], i) => {
            const sy = panelY - 10 * PX + i * 22 * PX;
            const lt = this.add.text(w * 0.28, sy, label, {
                fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#aaaacc',
            }).setOrigin(0, 0.5).setAlpha(0);
            const vt = this.add.text(w * 0.72, sy, value, {
                fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: i === 3 && gameState.victory ? '#ffdd44' : PALETTE.TEXT_WHITE,
                stroke: '#000', strokeThickness: 1 * PX,
            }).setOrigin(1, 0.5).setAlpha(0);
            statTexts.push(lt, vt);
        });

        // ---- ランク表示 ----
        const rank = this._getRank(score);
        const rankText = this.add.text(w / 2, panelY + 88 * PX, `評価: ${rank}`, {
            fontSize: `${12 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: rank === 'S' ? '#ffdd44' : rank === 'A' ? '#aaffaa' : '#aaaaaa',
            stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5).setAlpha(0);

        // ---- ボタン ----
        const btnAreaY = h * 0.82 - SAFE_ZONE.BOTTOM;
        const replayBtn = this._makeButton(w / 2 - 90 * PX, btnAreaY, 'もう一度', 0x226622, 0x33aa33, () => {
            EventBus.emit(Events.GAME_RESTART);
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                gameState.reset();
                this.scene.start('GameScene');
            });
        });
        const titleBtn = this._makeButton(w / 2 + 90 * PX, btnAreaY, 'タイトルへ', 0x222266, 0x3333aa, () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                gameState.reset();
                this.scene.start('TitleScene');
            });
        });
        replayBtn.setAlpha(0);
        titleBtn.setAlpha(0);

        // ---- アニメーション入場 ----
        this.tweens.add({
            targets: [titleText, titleShadow],
            alpha: 1, y: `-=${6 * PX}`,
            duration: 600, ease: 'Back.easeOut',
        });
        this.time.delayedCall(400, () => {
            this.tweens.add({
                targets: [panelBg, scoreText, bestText, rankText, ...statTexts],
                alpha: 1,
                duration: 500, ease: 'Quad.easeOut',
            });
        });
        this.time.delayedCall(900, () => {
            this.tweens.add({
                targets: [replayBtn, titleBtn],
                alpha: 1,
                duration: 400, ease: 'Quad.easeOut',
            });
        });

        // ---- タイトルのパルス ----
        this.time.delayedCall(700, () => {
            this.tweens.add({
                targets: titleText,
                scaleX: 1.04, scaleY: 1.04,
                duration: 900,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
            });
        });

        // ---- キーボードショートカット ----
        this.input.keyboard?.once('keydown-SPACE', () => {
            EventBus.emit(Events.GAME_RESTART);
            gameState.reset();
            this.cameras.main.fade(300, 0, 0, 0);
            this.time.delayedCall(300, () => this.scene.start('GameScene'));
        });
        this.input.keyboard?.once('keydown-ENTER', () => {
            EventBus.emit(Events.GAME_RESTART);
            gameState.reset();
            this.cameras.main.fade(300, 0, 0, 0);
            this.time.delayedCall(300, () => this.scene.start('GameScene'));
        });

        this.cameras.main.fadeIn(500);
    }

    private _getRank(score: number): string {
        if (score >= 3000) return 'S+';
        if (score >= 2000) return 'S';
        if (score >= 1200) return 'A';
        if (score >= 600)  return 'B';
        if (score >= 250)  return 'C';
        return 'D';
    }

    private _makeButton(
        x: number, y: number, label: string,
        colorNormal: number, colorHover: number,
        callback: () => void,
    ): Phaser.GameObjects.Container {
        const bw = 120 * PX, bh = 38 * PX;
        const con = this.add.container(x, y);

        const bg = this.add.graphics();
        const draw = (c: number) => {
            bg.clear();
            bg.fillStyle(c);
            bg.lineStyle(1 * PX, 0x88aacc, 0.6);
            bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 6 * PX);
            bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 6 * PX);
        };
        draw(colorNormal);

        const txt = this.add.text(0, 0, label, {
            fontSize: `${11 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffffff', stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5);

        con.add([bg, txt]);
        bg.setInteractive(new Phaser.Geom.Rectangle(-bw / 2, -bh / 2, bw, bh), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerover', () => { draw(colorHover); this.tweens.add({ targets: con, scaleX: 1.05, scaleY: 1.05, duration: 100 }); });
        bg.on('pointerout',  () => { draw(colorNormal); this.tweens.add({ targets: con, scaleX: 1, scaleY: 1, duration: 100 }); });
        bg.on('pointerdown', callback);
        return con;
    }
}
