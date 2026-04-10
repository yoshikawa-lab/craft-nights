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
    [ITEM.NETHERITE_SWORD]:  0x660044,
    [ITEM.NETHERITE_ARMOR]:  0x550033,
    [ITEM.NETHERITE_PICK]:   0x550033,
    [ITEM.NETHERITE_BLOCK]:  0x330022,
};
const ITEM_LABELS: Record<string, string> = {
    [ITEM.WOOD]: '木', [ITEM.STONE]: '石', [ITEM.WOOL]: '羊毛',
    [ITEM.SWORD]: '剣', [ITEM.AXE]: '斧', [ITEM.PICKAXE]: 'ツルハシ',
    [ITEM.BOW]: '弓', [ITEM.ARROW]: '矢', [ITEM.BED]: 'ベッド',
    [ITEM.DIRT]: '土', [ITEM.GRASS]: '草', [ITEM.IRON_ORE]: '鉄鉱石',
    [ITEM.BOX]: '箱',
    [ITEM.COAL]:             '石炭',
    [ITEM.DIAMOND]:          'ダイヤ',
    [ITEM.EMERALD]:          'エメラルド',
    [ITEM.GOLD]:             '金鉱石',
    [ITEM.IRON_INGOT]:       '鉄',
    [ITEM.GOLD_INGOT]:       '金',
    [ITEM.IRON_ARMOR]:       '鉄鎧',
    [ITEM.DIAMOND_ARMOR]:    'D鎧',
    [ITEM.GOLD_ARMOR]:       '金鎧',
    [ITEM.IRON_SWORD]:       '鉄剣',
    [ITEM.IRON_PICK]:        '鉄掘',
    [ITEM.DIAMOND_SWORD]:    'D剣',
    [ITEM.DIAMOND_PICK]:     'D掘',
    [ITEM.GOLD_SWORD]:       '金剣',
    [ITEM.FURNACE_ITEM]:     'かまど',
    [ITEM.BUCKET]:           'バケツ',
    [ITEM.NETHERITE]:        'N素材',
    [ITEM.NETHERITE_SWORD]:  'N剣',
    [ITEM.NETHERITE_ARMOR]:  'N鎧',
    [ITEM.NETHERITE_PICK]:   'N掘',
    [ITEM.NETHERITE_BLOCK]:  'Nブロック',
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
    private _helpBtnBg!: Phaser.GameObjects.Graphics;
    private onHelpToggle?: () => void;

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

    // ---- HP ゴーストバー（ダメージ遅延表示）----
    private _hpGhostFill!: Phaser.GameObjects.Rectangle;
    private _hpGhostRatio = 1.0;

    // ---- 夜接近警告ビネット ----
    private _nightWarnGfx!: Phaser.GameObjects.Graphics;
    private _nightWarnSecs = 9999;

    // ---- 画面外敵インジケーター ----
    private _enemyIndicatorGfx!: Phaser.GameObjects.Graphics;

    // ---- コンボカウンター（Round 4）----
    private _comboText!: Phaser.GameObjects.Text;
    private _comboVisible = false;

    // ---- ダッシュゲージ（Round 2）----
    private _dashArcGfx!: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this._buildStatsPanel();
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
        this._buildNightWarnVignette();
        this._buildComboDisplay();
        this._buildDashArc();
        this._buildEnemyIndicator();
        this._buildHelpBtn();
        this._listen();
    }

    // ---- HP/XPエリアの背景パネル ----
    private _buildStatsPanel(): void {
        const x = 8 * PX;
        const y = SAFE_ZONE.TOP + 8 * PX;
        const panelW = (UI.HP_BAR_W + 56) * PX;
        const panelH = 56 * PX;
        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.42);
        g.fillRoundedRect(x, y, panelW, panelH, 5 * PX);
        g.setScrollFactor(0).setDepth(99);
    }

    private _buildHP(): void {
        const x = 12 * PX;
        const y = SAFE_ZONE.TOP + 12 * PX;
        const w = UI.HP_BAR_W * PX;
        const h = UI.HP_BAR_H * PX;
        this.hpBarBg = this.scene.add.rectangle(x, y, w, h, PALETTE.HP_BAR_BG).setOrigin(0).setScrollFactor(0).setDepth(100);
        // ゴーストバー（黄色・HPバーの後ろで遅れて消える）
        this._hpGhostFill = this.scene.add.rectangle(x, y, w, h, 0xffee55).setOrigin(0).setScrollFactor(0).setDepth(100.5);
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

            // タップ/クリックでスロット選択できる透明ヒット領域
            const hit = this.scene.add.rectangle(
                sx + slotSize / 2, y + slotSize / 2,
                slotSize, slotSize, 0x000000, 0,
            );
            hit.setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });
            const idx = i;
            hit.on('pointerdown', () => {
                gameState.hotbarIndex = idx;
                EventBus.emit(Events.HOTBAR_SELECT);
            });
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

            // 数字ラベル（選択中は黄色で強調）
            const num = this.scene.add.text(0, -slotSize * 0.38, `${i + 1}`, {
                fontSize: `${isSelected ? 8 * PX : 7 * PX}px`, fontFamily: UI.FONT_FAMILY,
                color: isSelected ? PALETTE.TEXT_YELLOW : PALETTE.TEXT_GRAY,
                stroke: isSelected ? '#000' : undefined,
                strokeThickness: isSelected ? 1.5 * PX : 0,
            }).setOrigin(0.5);
            con.add(num);
        }
    }

    private _buildDayNight(): void {
        this.dayText = this.scene.add.text(GAME.WIDTH / 2, SAFE_ZONE.TOP + 8 * PX, '☀ Day 1', {
            fontSize: `${11 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: PALETTE.TEXT_YELLOW, stroke: '#000', strokeThickness: 2 * PX,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102);
    }

    private _buildMuteBtn(): void {
        const r = 11 * PX;
        // ミニマップ(右上 118px幅)の下に配置して被りを防ぐ
        const bx = GAME.WIDTH - r - 10 * PX;
        const by = SAFE_ZONE.TOP + 62 * PX;

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
        const by = SAFE_ZONE.TOP + 62 * PX;
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
        // dayText と重ならないよう画面中央寄りに配置（スライドイン/アウト）
        this.statusText = this.scene.add.text(GAME.WIDTH / 2, GAME.HEIGHT * 0.40, '', {
            fontSize: `${11 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#ffffff', stroke: '#000', strokeThickness: 2 * PX,
            backgroundColor: '#00000088',
            padding: { x: 12 * PX, y: 6 * PX },
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
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

    private _buildNightWarnVignette(): void {
        this._nightWarnGfx = this.scene.add.graphics()
            .setScrollFactor(0).setDepth(96);
    }

    /** 夜が来る30秒前から画面端がオレンジ→赤でパルス */
    private _updateNightWarn(): void {
        const g = this._nightWarnGfx;
        g.clear();
        if (gameState.isNight || this._nightWarnSecs > 30) return;
        const t = Math.max(0, (30 - this._nightWarnSecs) / 30);
        const pulse = 0.45 + 0.55 * Math.abs(Math.sin(Date.now() * 0.0065));
        const alpha = t * 0.42 * pulse;
        if (alpha < 0.01) return;
        const w = GAME.WIDTH, h = GAME.HEIGHT;
        const ew = w * 0.10;
        const eh = h * 0.13;
        g.fillStyle(t > 0.6 ? 0xff2200 : 0xff8800, alpha);
        g.fillRect(0,       0,       w,  eh);
        g.fillRect(0,       h - eh,  w,  eh);
        g.fillRect(0,       eh,      ew, h - eh * 2);
        g.fillRect(w - ew,  eh,      ew, h - eh * 2);
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
        if (!this.statusText?.active) return;
        this.scene.tweens.killTweensOf(this.statusText);
        this.statusText.setText(text)
            .setAlpha(0)
            .setY(GAME.HEIGHT * 0.43);
        this.scene.tweens.add({
            targets: this.statusText,
            alpha: 1, y: GAME.HEIGHT * 0.40,
            duration: 280, ease: 'Quad.easeOut',
        });
        this.scene.time.delayedCall(duration, () => {
            if (!this.statusText?.active) return;
            this.scene.tweens.add({
                targets: this.statusText, alpha: 0,
                duration: 400, ease: 'Quad.easeIn',
            });
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

        // ゴーストHPバー（ダメージ遅延表示: 60fpsで約1.3秒かけて消える）
        if (hpRatio < this._hpGhostRatio) {
            this._hpGhostRatio = Math.max(hpRatio, this._hpGhostRatio - 0.75 / 60);
        } else {
            this._hpGhostRatio = hpRatio;
        }
        this._hpGhostFill.setScale(Math.max(0.001, this._hpGhostRatio), 1);
        this._hpGhostFill.x = this.hpBarBg.x - w / 2 * (1 - this._hpGhostRatio);

        // XP
        const xpRatio = gameState.xp / gameState.xpToNext;
        this.xpBarFill.setScale(Math.max(0.001, xpRatio), 1);
        this.levelText.setText(`Lv.${gameState.level}`);
        this.killText.setText(`キル: ${gameState.killCount}`);

        // 昼夜（カウントダウンは setTimeRemaining() で更新）
        const phase = gameState.isNight ? `🌙 Night ${gameState.dayCount}` : `☀ Day ${gameState.dayCount}`;
        this.dayText.setColor(gameState.isNight ? '#aaaaff' : PALETTE.TEXT_YELLOW);
        // テキストはセットされていない場合のみ更新（setTimeRemaining優先）
        if (!this.dayText.text.includes(':')) this.dayText.setText(phase);

        // 夜のオーバーレイ
        const targetAlpha = gameState.isNight ? 0.35 : 0;
        const cur = this.nightOverlay.alpha;
        this.nightOverlay.setAlpha(cur + (targetAlpha - cur) * 0.02);

        // 防具インジケーター（ネザーライト含む）
        const def = gameState.defense;
        if (def > 0) {
            const armorNames: Record<string, string> = {
                iron_armor: '鉄鎧', gold_armor: '金鎧',
                diamond_armor: 'ダイヤ鎧', netherite_armor: '🔥N鎧',
            };
            const armorColors: Record<string, string> = {
                iron_armor: '#aabbcc', gold_armor: '#ffcc44',
                diamond_armor: '#44ddff', netherite_armor: '#cc44ff',
            };
            const armorSet = new Set(Object.keys(armorNames));
            let armorName = '', armorColor = '#aaddff';
            for (const slot of [...gameState.hotbar, ...gameState.inventory]) {
                if (slot.item && slot.count > 0 && armorSet.has(slot.item)) {
                    armorName  = armorNames[slot.item] ?? slot.item;
                    armorColor = armorColors[slot.item] ?? '#aaddff';
                    break;
                }
            }
            this.armorText.setColor(armorColor);
            this.armorText.setText(`🛡 ${armorName} -${Math.round(def * 100)}%`);
        } else {
            this.armorText.setText('');
        }

        // ---- 低HPビネット（Round 6）----
        this._updateVignette();

        // ---- 夜接近警告ビネット ----
        this._updateNightWarn();

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

    /** 昼夜カウントダウン（GameSceneから毎フレーム呼ぶ） */
    setTimeRemaining(seconds: number): void {
        this._nightWarnSecs = seconds;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;
        const phase = gameState.isNight ? `🌙 Night ${gameState.dayCount}` : `☀ Day ${gameState.dayCount}`;
        const color = gameState.isNight ? '#aaaaff' : PALETTE.TEXT_YELLOW;
        // 残り15秒以下は赤で点滅
        if (seconds <= 15 && !gameState.isNight) {
            const blink = 0.6 + 0.4 * Math.sin(Date.now() * 0.012);
            this.dayText.setAlpha(blink).setColor('#ff6644');
        } else {
            this.dayText.setAlpha(1).setColor(color);
        }
        this.dayText.setText(`${phase}  ${timeStr}`);
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

    private _buildHelpBtn(): void {
        const r  = 11 * PX;
        const bx = GAME.WIDTH - r - 10 * PX;
        const by = SAFE_ZONE.TOP + 88 * PX; // ミュートボタンの下

        this._helpBtnBg = this.scene.add.graphics();
        this._helpBtnBg.fillStyle(0x1a2244, 0.9);
        this._helpBtnBg.lineStyle(1 * PX, 0x4466aa, 0.9);
        this._helpBtnBg.fillCircle(bx, by, r);
        this._helpBtnBg.strokeCircle(bx, by, r);
        this._helpBtnBg
            .setInteractive(new Phaser.Geom.Circle(bx, by, r), Phaser.Geom.Circle.Contains)
            .setScrollFactor(0).setDepth(103);
        this._helpBtnBg.on('pointerdown', () => this.onHelpToggle?.());
        this._helpBtnBg.on('pointerover', () => this._helpBtnBg.setAlpha(0.7));
        this._helpBtnBg.on('pointerout',  () => this._helpBtnBg.setAlpha(1));

        this.scene.add.text(bx, by, '?', {
            fontSize: `${11 * PX}px`, fontFamily: UI.FONT_FAMILY,
            color: '#88aaff', stroke: '#000', strokeThickness: 1 * PX,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(104);
    }

    /** HUDの ? ボタンにコールバックを設定（GameSceneから呼ぶ） */
    setHelpCallback(cb: () => void): void {
        this.onHelpToggle = cb;
    }

    private _buildEnemyIndicator(): void {
        this._enemyIndicatorGfx = this.scene.add.graphics();
        this._enemyIndicatorGfx.setScrollFactor(0).setDepth(198);
    }

    /** 画面外の敵を示す矢印インジケーターを更新（GameSceneから毎フレーム呼ぶ） */
    updateEnemyIndicators(
        enemies: Array<{ x: number; y: number; isBoss?: boolean }>,
        camX: number, camY: number,
    ): void {
        const g = this._enemyIndicatorGfx;
        g.clear();
        const W = GAME.WIDTH;
        const H = GAME.HEIGHT;
        const margin = 22 * PX;
        const arrowSize = 9 * PX;
        const cx = W / 2;
        const cy = H / 2;

        for (const e of enemies) {
            // カメラ空間でのスクリーン座標に変換
            const sx = e.x - camX;
            const sy = e.y - camY;
            // 画面内なら表示しない
            if (sx >= margin && sx <= W - margin && sy >= margin && sy <= H - margin) continue;

            // 画面中心からの角度
            const angle = Math.atan2(sy - cy, sx - cx);
            // 画面端にクランプ
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            let ex: number, ey: number;
            const halfW = W / 2 - margin;
            const halfH = H / 2 - margin;
            if (Math.abs(cos) * halfH > Math.abs(sin) * halfW) {
                // 左右の端に当たる
                ex = cx + (cos > 0 ? halfW : -halfW);
                ey = cy + sin * halfW / Math.abs(cos);
            } else {
                // 上下の端に当たる
                ex = cx + cos * halfH / Math.abs(sin);
                ey = cy + (sin > 0 ? halfH : -halfH);
            }

            // ボスは赤パルス、通常は橙
            const isBoss = e.isBoss ?? false;
            const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() * 0.005));
            const color = isBoss ? 0xff2200 : 0xff8800;
            const alpha = isBoss ? (0.7 + 0.3 * pulse) : 0.75;

            // 三角矢印を angle 方向に描画
            g.fillStyle(color, alpha);
            const ax = ex + cos * arrowSize;
            const ay = ey + sin * arrowSize;
            const perpX = -sin * arrowSize * 0.6;
            const perpY =  cos * arrowSize * 0.6;
            g.fillTriangle(
                ax, ay,
                ex + perpX, ey + perpY,
                ex - perpX, ey - perpY,
            );
            // 縁取り
            g.lineStyle(1.5 * PX, 0x000000, alpha * 0.6);
            g.strokeTriangle(ax, ay, ex + perpX, ey + perpY, ex - perpX, ey - perpY);
        }
    }

    destroy(): void {
        EventBus.off(Events.INVENTORY_CHANGED, this._drawHotbar, this);
        EventBus.off(Events.HOTBAR_SELECT, this._drawHotbar, this);
        EventBus.off(Events.PLAYER_LEVEL_UP, this._updateXP, this);
    }
}
