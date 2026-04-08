// ============================
// HUD — HP/XP/レベル/ホットバー/昼夜表示
// ============================
import Phaser from 'phaser';
import { UI, PALETTE, GAME, PX, SAFE_ZONE, PLAYER, ITEM, ItemType } from '../core/Constants';
import { gameState } from '../core/GameState';
import { EventBus, Events } from '../core/EventBus';
import { audioManager } from '../audio/AudioManager';

const ITEM_COLORS: Record<string, number> = {
    [ITEM.WOOD]: 0x8B6914, [ITEM.STONE]: 0x888888, [ITEM.WOOL]: 0xf0f0f0,
    [ITEM.SWORD]: 0x88aaff, [ITEM.AXE]: 0xaa8844, [ITEM.PICKAXE]: 0x999999,
    [ITEM.BOW]: 0xaa7733, [ITEM.ARROW]: 0xeecc66, [ITEM.BED]: 0xcc4444,
    [ITEM.DIRT]: 0x8B5E3C, [ITEM.GRASS]: 0x4a9e4a, [ITEM.IRON_ORE]: 0xcc9944,
    [ITEM.BOX]: 0xA0522D,
    // 新アイテム
    [ITEM.COAL]:          0x333344,
    [ITEM.DIAMOND]:       0x44ddff,
    [ITEM.EMERALD]:       0x44ee66,
    [ITEM.GOLD]:          0xffcc00,
    [ITEM.IRON_INGOT]:    0xaaaaaa,
    [ITEM.GOLD_INGOT]:    0xffcc00,
    [ITEM.IRON_ARMOR]:    0x888899,
    [ITEM.DIAMOND_ARMOR]: 0x44ddff,
    [ITEM.GOLD_ARMOR]:    0xffcc00,
    [ITEM.IRON_SWORD]:    0xaabbcc,
    [ITEM.IRON_PICK]:     0x99aaaa,
    [ITEM.DIAMOND_SWORD]: 0x44ddff,
    [ITEM.DIAMOND_PICK]:  0x44ddff,
    [ITEM.GOLD_SWORD]:    0xffcc00,
    [ITEM.FURNACE_ITEM]:  0x554433,
};
const ITEM_LABELS: Record<string, string> = {
    [ITEM.WOOD]: '木', [ITEM.STONE]: '石', [ITEM.WOOL]: '羊毛',
    [ITEM.SWORD]: '剣', [ITEM.AXE]: '斧', [ITEM.PICKAXE]: 'ツルハシ',
    [ITEM.BOW]: '弓', [ITEM.ARROW]: '矢', [ITEM.BED]: 'ベッド',
    [ITEM.DIRT]: '土', [ITEM.GRASS]: '草', [ITEM.IRON_ORE]: '鉄鉱石',
    [ITEM.BOX]: '箱',
    // 新アイテム
    [ITEM.COAL]:          '石炭',
    [ITEM.DIAMOND]:       'ダイヤ',
    [ITEM.EMERALD]:       'エメラルド',
    [ITEM.GOLD]:          '金鉱石',
    [ITEM.IRON_INGOT]:    '鉄',
    [ITEM.GOLD_INGOT]:    '金',
    [ITEM.IRON_ARMOR]:    '鉄鎧',
    [ITEM.DIAMOND_ARMOR]: 'ダイヤ鎧',
    [ITEM.GOLD_ARMOR]:    '金鎧',
    [ITEM.IRON_SWORD]:    '鉄剣',
    [ITEM.IRON_PICK]:     '鉄掘',
    [ITEM.DIAMOND_SWORD]: 'ダイヤ剣',
    [ITEM.DIAMOND_PICK]:  'ダイヤ掘',
    [ITEM.GOLD_SWORD]:    '金剣',
    [ITEM.FURNACE_ITEM]:  'かまど',
};

export class HUD {
    private scene: Phaser.Scene;
    private hpBarBg!: Phaser.GameObjects.Rectangle;
    private hpBarFill!: Phaser.GameObjects.Rectangle;
    private hpText!: Phaser.GameObjects.Text;
    private xpBarBg!: Phaser.GameObjects.Rectangle;
    private xpBarFill!: Phaser.GameObjects.Rectangle;
    private levelText!: Phaser.GameObjects.Text;
    private killText!: Phaser.GameObjects.Text;
    private dayText!: Phaser.GameObjects.Text;
    private hotbarBg!: Phaser.GameObjects.Graphics;
    private hotbarSlots: Phaser.GameObjects.Container[] = [];
    private nightOverlay!: Phaser.GameObjects.Rectangle;
    private statusText!: Phaser.GameObjects.Text;
    private muteBtnBg!: Phaser.GameObjects.Graphics;
    private muteBtnText!: Phaser.GameObjects.Text;

    // ボスHPバー
    private bossBarContainer!: Phaser.GameObjects.Container;
    private bossBarFill!: Phaser.GameObjects.Rectangle;
    private bossNameText!: Phaser.GameObjects.Text;

    // 防具インジケーター
    private armorText!: Phaser.GameObjects.Text;

    // インタラクトヒント（村人近傍など）
    private interactHintText!: Phaser.GameObjects.Text;
    private _interactHintVisible = false;

    // ---- 低HPビネット（Round 6）----
    private _vignetteGfx!: Phaser.GameObjects.Graphics;
    private _vignetteAlpha = 0;

    // ---- コンボカウンター（Round 4）----
    private _comboText!: Phaser.GameObjects.Text;
    private _comboVisible = false;

    // ---- ダッシュゲージ（Round 2）----
    private _dashArcGfx!: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._buildHP();
        this._buildXP();
        this._buildHotbar();
        this._buildDayNight();
        this._buildMuteBtn();
        this._buildNightOverlay();
        this._buildStatus();
        this._buildBossBar();
        this._buildArmorIndicator();
        this._buildVignette();
        this._buildComboDisplay();
        this._buildDashArc();
        this._listen();
    }

    private _buildHP(): void {
        const x = 12 * PX;
        const y = SAFE_ZONE.TOP + 12 * PX;
        const w = UI.HP_BAR_W * PX;
        const h = UI.HP_BAR_H * PX;
        this.hpBarBg = this.scene.add.rectangle(x, y, w, h, PALETTE.HP_BAR_BG).setOrigin(0).setScrollFactor(0).setDepth(100);
        this.hpBarFill = this.scene.add.rectangle(x, y, w, h, PALETTE.HP_BAR_FILL).setOrigin(0).setScrollFactor(0).setDepth(101);
        this.hpText = this.scene.add.text(x + w / 2, y + h / 2, 'HP 100', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: PALETTE.TEXT_WHITE, stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
    }

    private _buildXP(): void {
        const x = 12 * PX;
        const y = SAFE_ZONE.TOP + 30 * PX;
        const w = UI.HP_BAR_W * PX;
        const h = 8 * PX;
        this.xpBarBg = this.scene.add.rectangle(x, y, w, h, 0x222266).setOrigin(0).setScrollFactor(0).setDepth(100);
        this.xpBarFill = this.scene.add.rectangle(x, y, w, h, PALETTE.XP_BAR_FILL).setOrigin(0).setScrollFactor(0).setDepth(101);
        this.levelText = this.scene.add.text(x + w + 6 * PX, y + h / 2, 'Lv.1', {
            fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: PALETTE.TEXT_YELLOW, stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(102);
        this.killText = this.scene.add.text(x, y + h + 4 * PX, 'キル: 0', {
            fontSize: `${8 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: PALETTE.TEXT_GRAY, stroke: '#000', strokeThickness: 1 * PX,
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(102);
    }

    private _buildHotbar(): void {
        const slotSize = UI.SLOT_SIZE * PX;
        const pad = UI.PADDING * PX;
        const cols = UI.HOTBAR_SLOTS;
        const totalW = cols * slotSize + (cols - 1) * pad;
        const startX = (GAME.WIDTH - totalW) / 2;
        const y = GAME.HEIGHT - slotSize - 20 * PX;

        this.hotbarBg = this.scene.add.graphics();
        this.hotbarBg.setScrollFactor(0).setDepth(100);

        for (let i = 0; i < cols; i++) {
            const sx = startX + i * (slotSize + pad);
            const con = this.scene.add.container(sx + slotSize / 2, y + slotSize / 2);
            con.setScrollFactor(0).setDepth(101);
            this.hotbarSlots.push(con);
        }
        this._drawHotbar();
    }

    private _drawHotbar(): void {
        const g = this.hotbarBg;
        g.clear();
        const slotSize = UI.SLOT_SIZE * PX;
        const pad = UI.PADDING * PX;
        const cols = UI.HOTBAR_SLOTS;
        const totalW = cols * slotSize + (cols - 1) * pad;
        const startX = (GAME.WIDTH - totalW) / 2;
        const y = GAME.HEIGHT - slotSize - 20 * PX;

        for (let i = 0; i < cols; i++) {
            const sx = startX + i * (slotSize + pad);
            const isSelected = i === gameState.hotbarIndex;
            g.lineStyle(2 * PX, isSelected ? PALETTE.UI_SLOT_SELECT : PALETTE.UI_BORDER);
            g.fillStyle(isSelected ? 0x444422 : PALETTE.UI_SLOT);
            g.fillRoundedRect(sx, y, slotSize, slotSize, 4 * PX);
            g.strokeRoundedRect(sx, y, slotSize, slotSize, 4 * PX);

            // コンテンツを更新
            const con = this.hotbarSlots[i];
            con.removeAll(true);
            const slot = gameState.hotbar[i];
            if (slot && slot.item && slot.count > 0) {
                const color = ITEM_COLORS[slot.item] ?? 0xffffff;
                const sq = this.scene.add.graphics();
                const qs = slotSize * 0.5;
                sq.fillStyle(color);
                sq.fillRoundedRect(-qs / 2, -qs / 2, qs, qs, 2 * PX);
                const label = ITEM_LABELS[slot.item] ?? slot.item;
                const lbl = this.scene.add.text(-qs / 2 + 2 * PX, qs / 2 - 2 * PX, label.slice(0, 3), {
                    fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#fff',
                }).setOrigin(0, 1);
                const cnt = this.scene.add.text(qs / 2, qs / 2, `${slot.count}`, {
                    fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_YELLOW,
                }).setOrigin(1, 1);
                con.add([sq, lbl, cnt]);
            }

            // 数字ラベル
            const num = this.scene.add.text(0, -slotSize * 0.38, `${i + 1}`, {
                fontSize: `${7 * PX}px`, fontFamily: UI.FONT_FAMILY, color: PALETTE.TEXT_GRAY,
            }).setOrigin(0.5);
            con.add(num);
        }
    }

    private _buildDayNight(): void {
        this.dayText = this.scene.add.text(GAME.WIDTH - 12 * PX, SAFE_ZONE.TOP + 12 * PX, '☀ Day 1', {
            fontSize: `${11 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: PALETTE.TEXT_YELLOW, stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(102);
    }

    private _buildMuteBtn(): void {
        const r = 11 * PX;
        const bx = GAME.WIDTH - r - 10 * PX;
        const by = SAFE_ZONE.TOP + 30 * PX;

        this.muteBtnBg = this.scene.add.graphics();
        this._renderMuteBtn(false);

        this.muteBtnBg.setInteractive(
            new Phaser.Geom.Circle(bx, by, r),
            Phaser.Geom.Circle.Contains,
        ).setScrollFactor(0).setDepth(103);

        this.muteBtnText = this.scene.add.text(bx, by, '♪', {
            fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY, color: '#ffffff',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(104);

        this.muteBtnBg.on('pointerdown', () => {
            const muted = audioManager.toggleMute();
            this.muteBtnText.setText(muted ? '🔇' : '♪');
            this._renderMuteBtn(muted);
        });
        this.muteBtnBg.on('pointerover', () => this.muteBtnBg.setAlpha(0.75));
        this.muteBtnBg.on('pointerout',  () => this.muteBtnBg.setAlpha(1));
    }

    private _renderMuteBtn(muted: boolean): void {
        const r = 11 * PX;
        const bx = GAME.WIDTH - r - 10 * PX;
        const by = SAFE_ZONE.TOP + 30 * PX;
        this.muteBtnBg.clear();
        this.muteBtnBg.fillStyle(muted ? 0x551111 : 0x224422, 0.85);
        this.muteBtnBg.lineStyle(1 * PX, muted ? 0xaa4444 : 0x44aa44, 0.8);
        this.muteBtnBg.fillCircle(bx, by, r);
        this.muteBtnBg.strokeCircle(bx, by, r);
    }

    private _buildNightOverlay(): void {
        this.nightOverlay = this.scene.add.rectangle(
            GAME.WIDTH / 2, GAME.HEIGHT / 2,
            GAME.WIDTH, GAME.HEIGHT,
            PALETTE.NIGHT_OVERLAY, 0,
        ).setScrollFactor(0).setDepth(80);
    }

    private _buildStatus(): void {
        this.statusText = this.scene.add.text(GAME.WIDTH / 2, SAFE_ZONE.TOP + 8 * PX, '', {
            fontSize: `${12 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffffff', stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200);
    }

    private _buildArmorIndicator(): void {
        const slotSize = UI.SLOT_SIZE * PX;
        const y = GAME.HEIGHT - slotSize - 20 * PX - 18 * PX;
        const x = GAME.WIDTH - 12 * PX;
        this.armorText = this.scene.add.text(x, y, '', {
            fontSize: `${9 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#aaddff', stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(102);

        // インタラクトヒント（画面中央下）
        this.interactHintText = this.scene.add.text(
            GAME.WIDTH / 2,
            GAME.HEIGHT - slotSize - 36 * PX,
            '',
            {
                fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: '#ffffff', stroke: '#000', strokeThickness: 2 * PX,
                backgroundColor: '#00000055', padding: { x: 8 * PX, y: 4 * PX },
            },
        ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(102);
    }

    private _buildVignette(): void {
        this._vignetteGfx = this.scene.add.graphics()
            .setScrollFactor(0).setDepth(95);
    }

    private _buildComboDisplay(): void {
        this._comboText = this.scene.add.text(
            GAME.WIDTH / 2, GAME.HEIGHT * 0.38, '',
            {
                fontSize: `${16 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: '#ffdd44', stroke: '#000', strokeThickness: 3 * PX,
            },
        ).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
    }

    private _buildDashArc(): void {
        this._dashArcGfx = this.scene.add.graphics()
            .setScrollFactor(0).setDepth(103);
    }

    private _buildBossBar(): void {
        const cx = GAME.WIDTH / 2;
        const by = GAME.HEIGHT - 55 * PX - SAFE_ZONE.BOTTOM;
        const bw = UI.BOSS_BAR_W * PX;
        const bh = UI.BOSS_BAR_H * PX;

        this.bossBarContainer = this.scene.add.container(cx, by)
            .setScrollFactor(0).setDepth(200).setVisible(false);

        // 背景
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x110000, 0.9);
        bg.lineStyle(2 * PX, 0x880000, 1);
        bg.fillRoundedRect(-bw / 2 - 8 * PX, -bh - 14 * PX, bw + 16 * PX, bh + 28 * PX, 4 * PX);
        bg.strokeRoundedRect(-bw / 2 - 8 * PX, -bh - 14 * PX, bw + 16 * PX, bh + 28 * PX, 4 * PX);
        this.bossBarContainer.add(bg);

        // ボス名
        this.bossNameText = this.scene.add.text(0, -bh - 6 * PX, '⚠ ANCIENT BOSS', {
            fontSize: `${10 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ff4444', stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5, 1);
        this.bossBarContainer.add(this.bossNameText);

        // バー背景
        const barBg = this.scene.add.rectangle(0, 0, bw, bh, PALETTE.BOSS_BAR_BG).setOrigin(0.5);
        this.bossBarFill = this.scene.add.rectangle(-bw / 2, -bh / 2, bw, bh, PALETTE.BOSS_BAR_FILL).setOrigin(0);
        this.bossBarContainer.add([barBg, this.bossBarFill]);
    }

    private _listen(): void {
        EventBus.on(Events.INVENTORY_CHANGED, this._drawHotbar, this);
        EventBus.on(Events.HOTBAR_SELECT, this._drawHotbar, this);
        EventBus.on(Events.PLAYER_LEVEL_UP, this._updateXP, this);
    }

    private _updateXP(): void {
        this.levelText.setText(`Lv.${gameState.level}`);
    }

    showStatus(text: string, duration = 2000): void {
        this.statusText.setText(text);
        this.scene.time.delayedCall(duration, () => {
            if (this.statusText?.active) this.statusText.setText('');
        });
    }

    showInteractHint(text: string): void {
        if (!this._interactHintVisible || this.interactHintText.text !== text) {
            this.interactHintText.setText(text);
            this._interactHintVisible = true;
        }
    }

    hideInteractHint(): void {
        if (this._interactHintVisible) {
            this.interactHintText.setText('');
            this._interactHintVisible = false;
        }
    }

    update(): void {
        // HP
        const hpRatio = Math.max(0, gameState.hp / gameState.maxHp);
        const w = UI.HP_BAR_W * PX;
        this.hpBarFill.setScale(hpRatio, 1);
        this.hpBarFill.x = this.hpBarBg.x - w / 2 * (1 - hpRatio);
        this.hpText.setText(`HP ${gameState.hp}/${gameState.maxHp}`);

        // HPバーの色（残り少ないと赤くパルス）
        let hpColor = hpRatio > 0.5 ? PALETTE.HP_BAR_FILL : hpRatio > 0.25 ? 0xffaa00 : 0xff3333;
        if (hpRatio < 0.15) {
            // 危険時点滅
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.007);
            const r = Math.round(0xff * pulse);
            hpColor = (r << 16) | 0x1111;
        }
        this.hpBarFill.setFillStyle(hpColor);

        // XP
        const xpRatio = gameState.xp / gameState.xpToNext;
        this.xpBarFill.setScale(Math.max(0.001, xpRatio), 1);
        this.levelText.setText(`Lv.${gameState.level}`);
        this.killText.setText(`キル: ${gameState.killCount}`);

        // 昼夜
        const phase = gameState.isNight ? `🌙 Night ${gameState.dayCount}` : `☀ Day ${gameState.dayCount}`;
        this.dayText.setText(phase);
        this.dayText.setColor(gameState.isNight ? '#aaaaff' : PALETTE.TEXT_YELLOW);

        // 夜のオーバーレイ
        const targetAlpha = gameState.isNight ? 0.35 : 0;
        const cur = this.nightOverlay.alpha;
        this.nightOverlay.setAlpha(cur + (targetAlpha - cur) * 0.02);

        // 防具インジケーター
        const def = gameState.defense;
        if (def > 0) {
            const armorNames: Record<string, string> = {
                'iron_armor': '鉄鎧', 'gold_armor': '金鎧', 'diamond_armor': 'ダイヤ鎧',
            };
            let armorName = '';
            for (const slot of [...gameState.hotbar, ...gameState.inventory]) {
                if (slot.item && slot.count > 0 && slot.item in { iron_armor: 1, gold_armor: 1, diamond_armor: 1 }) {
                    armorName = armorNames[slot.item] ?? slot.item;
                    break;
                }
            }
            this.armorText.setText(`🛡 ${armorName} ${Math.round(def * 100)}%`);
        } else {
            this.armorText.setText('');
        }

        // ---- 低HPビネット（Round 6）----
        this._updateVignette();

        // ---- ダッシュゲージ（Round 2）----
        this._updateDashArc();

        // ボスHPバー
        if (gameState.bossAlive && gameState.bossMaxHp > 0) {
            this.bossBarContainer.setVisible(true);
            const ratio = Math.max(0, gameState.bossHp / gameState.bossMaxHp);
            this.bossBarFill.setScale(Math.max(0.001, ratio), 1);
            // フェーズ2 は点滅赤
            const phase2 = ratio <= 0.5;
            const blink = phase2 ? (0.5 + 0.5 * Math.sin(Date.now() * 0.008)) : 1;
            this.bossBarFill.setFillStyle(phase2 ? 0xff0000 : PALETTE.BOSS_BAR_FILL);
            this.bossBarFill.setAlpha(phase2 ? 0.7 + 0.3 * blink : 1);
        } else {
            this.bossBarContainer.setVisible(false);
        }
    }

    /** コンボ表示（GameSceneから呼ぶ） */
    showCombo(count: number): void {
        if (count < 2) {
            this.scene.tweens.add({ targets: this._comboText, alpha: 0, duration: 300 });
            this._comboVisible = false;
            return;
        }
        const labels = ['', '', 'COMBO!', 'TRIPLE!', 'QUAD!', 'PENTA!'];
        const label = labels[Math.min(count, labels.length - 1)] ?? `${count} KILLS!`;
        const colors = ['', '', '#ffdd44', '#ff8844', '#ff4488', '#ff00ff'];
        const color  = colors[Math.min(count, colors.length - 1)] ?? '#ffffff';
        this._comboText.setText(`⚡ ${label} x${count}`);
        this._comboText.setColor(color);
        this._comboText.setAlpha(1).setScale(1.2);
        this.scene.tweens.add({ targets: this._comboText, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut' });
        this._comboVisible = true;
    }

    private _updateVignette(): void {
        const ratio = gameState.hp / gameState.maxHp;
        let targetAlpha = 0;
        if (ratio < 0.25) targetAlpha = (0.25 - ratio) / 0.25 * 0.7;
        else if (ratio < 0.5) targetAlpha = (0.5 - ratio) / 0.25 * 0.3;

        // パルス（低HP時）
        if (ratio < 0.15) {
            targetAlpha *= 0.6 + 0.4 * Math.sin(Date.now() * 0.006);
        }

        this._vignetteAlpha += (targetAlpha - this._vignetteAlpha) * 0.08;

        const g = this._vignetteGfx;
        g.clear();
        if (this._vignetteAlpha < 0.02) return;

        const w = GAME.WIDTH, h = GAME.HEIGHT;
        const steps = 8;
        for (let i = steps; i >= 1; i--) {
            const t = i / steps;
            const alpha = this._vignetteAlpha * (1 - t) * (1 - t);
            if (alpha < 0.005) continue;
            g.fillStyle(0xcc0000, alpha);
            // 四隅から内側に向けてフェード（楕円近似）
            const rx = w * 0.5 * t;
            const ry = h * 0.5 * t;
            g.fillRect(0,       0,       w,       ry);          // 上
            g.fillRect(0,       h - ry,  w,       ry);          // 下
            g.fillRect(0,       ry,      rx,      h - ry * 2);  // 左
            g.fillRect(w - rx,  ry,      rx,      h - ry * 2);  // 右
        }
    }

    private _updateDashArc(): void {
        // Playerへの参照がないので外から呼ぶ形にする（setDashCooldown API）
    }

    setDashCooldown(ratio: number): void {
        const g = this._dashArcGfx;
        g.clear();
        if (ratio <= 0) return;
        // HPバーの下にダッシュゲージを描画
        const x = 12 * PX;
        const y = SAFE_ZONE.TOP + 42 * PX;
        const w = 60 * PX;
        const h = 4 * PX;
        g.fillStyle(0x222222, 0.8);
        g.fillRect(x, y, w, h);
        g.fillStyle(0x44aaff);
        g.fillRect(x, y, w * (1 - ratio), h);
        // ダッシュアイコン
        if (ratio > 0) {
            g.fillStyle(0x666666, 0.9);
            g.fillTriangle(x + 66 * PX, y + h / 2, x + 74 * PX, y, x + 74 * PX, y + h);
        }
    }

    destroy(): void {
        EventBus.off(Events.INVENTORY_CHANGED, this._drawHotbar, this);
        EventBus.off(Events.HOTBAR_SELECT, this._drawHotbar, this);
        EventBus.off(Events.PLAYER_LEVEL_UP, this._updateXP, this);
    }
}
