import Phaser from 'phaser';
import { ENEMY_TYPES, EnemyKind, PX, BOSS, ELITE } from '../core/Constants';
import { EventBus, Events } from '../core/EventBus';

export class Enemy extends Phaser.GameObjects.Container {
    declare body: Phaser.Physics.Arcade.Body;
    private gfx!: Phaser.GameObjects.Graphics;
    private hpBarFill!: Phaser.GameObjects.Rectangle;
    private hpBarBg!: Phaser.GameObjects.Rectangle;

    readonly kind: EnemyKind;
    maxHp: number;
    hp: number;
    damage: number;
    enemySpeed: number;
    xpValue: number;
    isElite = false;          // エリート敵フラグ（Round 8）
    private _crownGfx?: Phaser.GameObjects.Graphics;

    private attackCooldown = 0;
    active2 = true;

    // ボス専用
    private _stompTimer = 0;
    private _chargeTimer = 0;
    private _isCharging = false;
    private _chargeTime = 0;
    private _chargeDir = 1;
    private _phase2Triggered = false;
    private _stomping = false;
    private _stompAnim = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind) {
        super(scene, x, y);
        this.kind = kind;
        const def = ENEMY_TYPES[kind];
        this.maxHp = def.hp;
        this.hp    = def.hp;
        this.damage = def.damage;
        this.enemySpeed = def.speed * PX;
        this.xpValue = def.xp;

        scene.add.existing(this);
        this.setDepth(this.kind === 'ANCIENT_BOSS' ? 15 : 10);  // タイルマップより前面
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(def.size * PX, def.size * PX);
        body.setOffset(-(def.size * PX) / 2, -(def.size * PX) / 2);
        body.setCollideWorldBounds(true);

        // コウモリは重力ゼロ（飛行）
        if (kind === 'BAT') {
            body.setGravityY(-(700 * PX)); // 世界重力を相殺
            body.setMaxVelocity(200 * PX, 200 * PX);
        } else if (kind === 'ANCIENT_BOSS') {
            body.setMaxVelocityY(900 * PX);
            this._stompTimer = BOSS.STOMP_INTERVAL_MS * 0.5; // 少し待ってから初踏みつけ
            this._chargeTimer = BOSS.CHARGE_INTERVAL_MS;
        }

        this._buildGfx(def);
    }

    private _buildGfx(def: typeof ENEMY_TYPES[EnemyKind]): void {
        this.gfx = this.scene.add.graphics();
        this.add(this.gfx);
        this._drawEnemy(def);

        // HPバー（ボスは大きめ）
        const barW = (this.kind === 'ANCIENT_BOSS' ? 60 : 28) * PX;
        const barH = (this.kind === 'ANCIENT_BOSS' ? 6 : 4) * PX;
        const barY = -(ENEMY_TYPES[this.kind].size * PX) / 2 - 8 * PX;
        this.hpBarBg   = this.scene.add.rectangle(0, barY, barW, barH, 0x333333).setOrigin(0.5);
        this.hpBarFill = this.scene.add.rectangle(0, barY, barW, barH,
            this.kind === 'ANCIENT_BOSS' ? 0xaa0000 : 0x44dd44).setOrigin(0.5);
        this.add([this.hpBarBg, this.hpBarFill]);
    }

    private _drawEnemy(def: typeof ENEMY_TYPES[EnemyKind]): void {
        const g = this.gfx;
        g.clear();
        const s = def.size * PX;
        const hs = s / 2;

        if (this.kind === 'ZOMBIE') {
            // ゾンビ（緑の四角い体）
            g.fillStyle(def.color);
            g.fillRoundedRect(-hs, -hs, s, s, 3 * PX);
            // シャドウエッジ
            g.fillStyle(0x1a4a1a);
            g.fillRect(-hs, hs - 3 * PX, s, 3 * PX);
            g.fillRect(hs - 2 * PX, -hs, 2 * PX, s);
            // 目（赤）
            g.fillStyle(def.eyeColor);
            g.fillRect(-hs * 0.5, -hs * 0.2, hs * 0.35, hs * 0.25);
            g.fillRect( hs * 0.15, -hs * 0.2, hs * 0.35, hs * 0.25);
            // 腕
            g.fillStyle(def.color);
            g.fillRect(-hs - hs * 0.3, -hs * 0.2, hs * 0.3, hs * 0.6);

        } else if (this.kind === 'SKELETON') {
            // スケルトン（白い骨格）
            g.fillStyle(def.color);
            g.fillRoundedRect(-hs, -hs, s, s, 3 * PX);
            g.fillStyle(0x999999);
            g.fillRect(-2 * PX, -hs * 0.8, 4 * PX, s * 0.8);
            g.fillRect(-hs * 0.8, -hs * 0.1, s * 0.8, 4 * PX);
            g.fillStyle(def.eyeColor);
            g.fillCircle(-hs * 0.3, -hs * 0.3, 3 * PX);
            g.fillCircle( hs * 0.3, -hs * 0.3, 3 * PX);

        } else if (this.kind === 'SPIDER') {
            // スパイダー（暗い円形体 + 脚）
            g.fillStyle(def.color);
            g.fillCircle(0, 0, hs * 0.75);
            g.lineStyle(2 * PX, 0x555555);
            for (let i = 0; i < 4; i++) {
                const side = i < 2 ? -1 : 1;
                const yy = (i % 2 === 0 ? -1 : 1) * hs * 0.4;
                g.beginPath();
                g.moveTo(side * hs * 0.6, yy);
                g.lineTo(side * hs * 1.5, yy - hs * 0.3);
                g.strokePath();
            }
            g.fillStyle(def.eyeColor);
            g.fillCircle(-hs * 0.28, -hs * 0.2, 3 * PX);
            g.fillCircle( hs * 0.28, -hs * 0.2, 3 * PX);

        } else if (this.kind === 'BAT') {
            // コウモリ（三角翼 + 円形体）
            g.fillStyle(def.color);
            g.fillCircle(0, hs * 0.1, hs * 0.6);
            // 翼（左右の三角形）
            g.fillStyle(0x3311aa);
            g.fillTriangle(-hs * 0.4, 0, -hs * 1.4, -hs * 0.6, -hs * 0.4, hs * 0.4);
            g.fillTriangle( hs * 0.4, 0,  hs * 1.4, -hs * 0.6,  hs * 0.4, hs * 0.4);
            // 目
            g.fillStyle(def.eyeColor);
            g.fillCircle(-hs * 0.2, -hs * 0.1, 2.5 * PX);
            g.fillCircle( hs * 0.2, -hs * 0.1, 2.5 * PX);
            // 牙
            g.fillStyle(0xffffff);
            g.fillRect(-hs * 0.15, hs * 0.35, 3 * PX, 5 * PX);
            g.fillRect( hs * 0.05, hs * 0.35, 3 * PX, 5 * PX);

        } else if (this.kind === 'GOLEM') {
            // ゴーレム（大きな石の体）
            g.fillStyle(def.color);
            g.fillRoundedRect(-hs, -hs, s, s, 4 * PX);
            // 石のひび割れ
            g.lineStyle(2 * PX, 0x2a3a4a, 0.7);
            g.beginPath(); g.moveTo(-hs * 0.3, -hs * 0.5); g.lineTo(hs * 0.1, 0); g.lineTo(-hs * 0.1, hs * 0.4); g.strokePath();
            g.beginPath(); g.moveTo(hs * 0.4, -hs * 0.3); g.lineTo(hs * 0.1, hs * 0.1); g.strokePath();
            // 光る目
            g.fillStyle(def.eyeColor, 1);
            g.fillCircle(-hs * 0.3, -hs * 0.2, 5 * PX);
            g.fillCircle( hs * 0.3, -hs * 0.2, 5 * PX);
            // 光のコア
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(-hs * 0.3, -hs * 0.2, 2 * PX);
            g.fillCircle( hs * 0.3, -hs * 0.2, 2 * PX);

        } else if (this.kind === 'ANCIENT_BOSS') {
            // 古代ボス（大型・複雑な形状）
            // 本体
            g.fillStyle(def.color);
            g.fillRoundedRect(-hs, -hs, s, s, 6 * PX);
            // 上半身装甲
            g.fillStyle(0x440066);
            g.fillRoundedRect(-hs, -hs, s, s * 0.55, 6 * PX);
            // 王冠型の突起（上部）
            g.fillStyle(0x6600aa);
            g.fillTriangle(-hs * 0.6, -hs,      -hs * 0.6, -hs * 1.3, -hs * 0.3, -hs);
            g.fillTriangle( 0,         -hs,       0,         -hs * 1.4,  hs * 0.2,  -hs);
            g.fillTriangle( hs * 0.5,  -hs,       hs * 0.5,  -hs * 1.25, hs * 0.8,  -hs);
            // 目（大型で光る）
            g.fillStyle(def.eyeColor);
            g.fillCircle(-hs * 0.32, -hs * 0.15, 7 * PX);
            g.fillCircle( hs * 0.32, -hs * 0.15, 7 * PX);
            g.fillStyle(0xffcc00, 0.9);
            g.fillCircle(-hs * 0.32, -hs * 0.15, 3 * PX);
            g.fillCircle( hs * 0.32, -hs * 0.15, 3 * PX);
            // 腕（左右の大きな爪）
            g.fillStyle(0x330055);
            g.fillRoundedRect(-hs - hs * 0.5, -hs * 0.1, hs * 0.5, hs * 0.9, 3 * PX);
            g.fillRoundedRect( hs,             -hs * 0.1, hs * 0.5, hs * 0.9, 3 * PX);
            // 爪先
            g.fillStyle(0x7700cc);
            g.fillTriangle(-hs - hs * 0.2, hs * 0.8, -hs - hs * 0.5, hs * 1.1, -hs - hs * 0.05, hs * 0.8);
            g.fillTriangle( hs + hs * 0.2, hs * 0.8,  hs + hs * 0.5, hs * 1.1,  hs + hs * 0.05, hs * 0.8);
        }
    }

    update(delta: number, targetX: number, targetY: number): void {
        if (!this.active2) return;
        this.attackCooldown = Math.max(0, this.attackCooldown - delta);

        if (this.kind === 'ANCIENT_BOSS') {
            this._updateBossAI(delta, targetX, targetY);
            return;
        }

        const body = this.body as Phaser.Physics.Arcade.Body;
        const dx = targetX - this.x;

        if (this.kind === 'BAT') {
            // コウモリ: 飛行（XY両方向に移動）
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
            // ゆらゆらとした飛行
            const sway = Math.sin(this.scene.time.now * 0.003) * 30 * PX;
            body.setVelocity(
                (dx / dist) * this.enemySpeed + sway,
                (dy / dist) * this.enemySpeed,
            );
        } else if (this.kind === 'SPIDER') {
            // スパイダー: 壁・天井を自在に動く
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
            body.setVelocity(
                (dx / dist) * this.enemySpeed,
                (dy / dist) * this.enemySpeed,
            );
        } else if (this.kind === 'GOLEM') {
            // ゴーレム: 重い歩行、たまにジャンプ
            body.setVelocityX(dx > 0 ? this.enemySpeed : -this.enemySpeed);
            if (body.blocked.down) {
                if ((dx > 0 && body.blocked.right) || (dx < 0 && body.blocked.left)) {
                    body.setVelocityY(-380 * PX);
                }
            }
        } else {
            // ZOMBIE / SKELETON: 地面を歩く、小段差ジャンプ
            body.setVelocityX(dx > 0 ? this.enemySpeed : -this.enemySpeed);
            if (body.blocked.down && Math.abs(dx) < 80 * PX) {
                if ((dx > 0 && body.blocked.right) || (dx < 0 && body.blocked.left)) {
                    body.setVelocityY(-320 * PX);
                }
            }
        }

        // HPバー更新
        const ratio = Math.max(0.001, this.hp / this.maxHp);
        const barW = 28 * PX;
        this.hpBarFill.setScale(ratio, 1);
        this.hpBarFill.x = -(barW / 2) * (1 - ratio);
    }

    // ---- ボスAI ----
    private _updateBossAI(delta: number, targetX: number, targetY: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const dx = targetX - this.x;
        const phase2 = this.hp <= this.maxHp * BOSS.PHASE2_HP_RATIO;

        // フェーズ2移行
        if (phase2 && !this._phase2Triggered) {
            this._phase2Triggered = true;
            EventBus.emit(Events.BOSS_PHASE2);
        }

        const speed = phase2 ? this.enemySpeed * 1.55 : this.enemySpeed;

        // 踏みつけタイマー
        this._stompTimer -= delta;
        if (this._stompTimer <= 0) {
            this._stompTimer = phase2 ? BOSS.STOMP_INTERVAL2_MS : BOSS.STOMP_INTERVAL_MS;
            this._doStomp();
        }

        // 突進タイマー（フェーズ2のみ）
        if (phase2) {
            this._chargeTimer -= delta;
            if (this._chargeTimer <= 0 && !this._isCharging) {
                this._chargeTimer = BOSS.CHARGE_INTERVAL_MS;
                this._startCharge(dx);
            }
        }

        // 突進中
        if (this._isCharging) {
            this._chargeTime -= delta;
            if (this._chargeTime <= 0) {
                this._isCharging = false;
            }
            // 突進方向に高速移動（velocityX は _startCharge で設定済み）
            if (body.blocked.left || body.blocked.right) {
                this._isCharging = false;
                this._chargeTime = 0;
                body.setVelocityX(0);  // 壁激突後の滑り防止
                // 壁激突エフェクト
                EventBus.emit(Events.BOSS_STOMP, { x: this.x, y: this.y });
            }
            this._updateHpBar();
            return;
        }

        // 踏みつけアニメ中は少し停止
        if (this._stomping) {
            this._stompAnim -= delta;
            if (this._stompAnim <= 0) this._stomping = false;
            body.setVelocityX(0);
            this._updateHpBar();
            return;
        }

        // 通常移動
        body.setVelocityX(dx > 0 ? speed : -speed);
        // ジャンプ（段差越え）
        if (body.blocked.down) {
            if ((dx > 0 && body.blocked.right) || (dx < 0 && body.blocked.left)) {
                body.setVelocityY(-420 * PX);
            }
        }

        this._updateHpBar();
    }

    private _doStomp(): void {
        this._stomping = true;
        this._stompAnim = 500;
        // 踏みつけスカッシュ
        this.scene.tweens.add({
            targets: this, scaleX: 1.3, scaleY: 0.75,
            duration: 150, yoyo: true, ease: 'Quad.easeOut',
        });
        EventBus.emit(Events.BOSS_STOMP, { x: this.x, y: this.y });
    }

    private _startCharge(dx: number): void {
        this._isCharging = true;
        this._chargeTime = BOSS.CHARGE_DURATION_MS;
        this._chargeDir = dx > 0 ? 1 : -1;
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(this._chargeDir * this.enemySpeed * BOSS.CHARGE_SPEED_MULT);
        // 突進フラッシュ
        this.scene.tweens.add({
            targets: this.gfx, alpha: 0.5,
            duration: 80, yoyo: true, repeat: 2,
        });
        EventBus.emit(Events.BOSS_CHARGE, { x: this.x, facing: this._chargeDir });
    }

    private _updateHpBar(): void {
        const ratio = Math.max(0.001, this.hp / this.maxHp);
        const barW = 60 * PX;
        this.hpBarFill.setScale(ratio, 1);
        this.hpBarFill.x = -(barW / 2) * (1 - ratio);
    }

    takeDamage(amount: number): void {
        if (!this.active2 || !this.scene) return;  // 死亡処理中は無視
        this.hp = Math.max(0, this.hp - amount);
        // フラッシュtween（破壊後に完了しても安全）
        this.scene.tweens.add({
            targets: this.gfx,
            alpha: 0.2, duration: 60,
            yoyo: true, repeat: 2,
            onComplete: () => {
                if (this.gfx && this.gfx.active && this.active2) {
                    this.gfx.setAlpha(1);
                }
            },
        });
        if (this.hp <= 0) this._die();
    }

    private _die(): void {
        if (!this.active2) return;  // 二重呼び出し防止
        this.active2 = false;
        // 実行中のtweenをすべて停止
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.killTweensOf(this.gfx);
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) body.setVelocity(0, 0);
        EventBus.emit(Events.ENEMY_DIED, { x: this.x, y: this.y, xp: this.xpValue, kind: this.kind, isElite: this.isElite });
        if (this.kind === 'ANCIENT_BOSS') {
            EventBus.emit(Events.BOSS_DEFEATED, { x: this.x, y: this.y });
        }
        EventBus.emit(Events.SPECTACLE_HIT);
        this.scene.tweens.add({
            targets: this,
            alpha: 0, scaleX: this.kind === 'ANCIENT_BOSS' ? 2.5 : 2, scaleY: 0,
            duration: this.kind === 'ANCIENT_BOSS' ? 600 : 300,
            ease: 'Quad.easeOut',
            onComplete: () => { this.destroy(); },
        });
    }

    /** エリート化（Round 8）— HP/ダメージ/XP強化 + 王冠マーカー */
    makeElite(): void {
        if (this.kind === 'ANCIENT_BOSS' || this.isElite) return;
        this.isElite = true;
        this.maxHp   = Math.round(this.maxHp   * ELITE.HP_MULT);
        this.hp      = this.maxHp;
        this.damage  = Math.round(this.damage  * ELITE.DMG_MULT);
        this.xpValue = Math.round(this.xpValue * ELITE.XP_MULT);

        // サイズを少し大きく（金色のリング）
        this.setScale(1.28);

        // 王冠風のグロー（頭上に金リング）
        const def = ENEMY_TYPES[this.kind];
        const hs = (def.size * PX) / 2;
        this._crownGfx = this.scene.add.graphics();
        this._crownGfx.lineStyle(2 * PX, 0xffdd44, 0.85);
        this._crownGfx.strokeCircle(0, 0, hs * 1.4);
        this._crownGfx.fillStyle(0xffdd44, 0.7);
        const tipH = 8 * PX;
        const tips = 3;
        for (let i = 0; i < tips; i++) {
            const angle = (-Math.PI / 2) + (i - 1) * (Math.PI / (tips + 1));
            const tx = Math.cos(angle) * hs * 1.4;
            const ty = Math.sin(angle) * hs * 1.4 - hs * 0.2;
            this._crownGfx.fillTriangle(tx - 4 * PX, ty, tx + 4 * PX, ty, tx, ty - tipH);
        }
        this.add(this._crownGfx);
    }

    /** 夜数スケーリング（dayCount が増えるほど強くなる） */
    scaleByNight(nightNum: number): void {
        if (this.kind === 'ANCIENT_BOSS') return;  // ボスはスケールしない
        const mult = Math.min(1 + (nightNum - 1) * 0.12, 3.0);  // 最大3倍
        this.maxHp = Math.round(this.maxHp * mult);
        this.hp    = this.maxHp;
        this.damage = Math.round(this.damage * Math.min(1 + (nightNum - 1) * 0.08, 2.5));
    }

    /** ヒットノックバック（Hollow Knight / Celeste スタイル） */
    knockback(fromX: number): void {
        if (!this.active2) return;
        const body = this.body as Phaser.Physics.Arcade.Body;
        const dir = this.x > fromX ? 1 : -1;
        // ボス・ゴーレムはノックバックしにくい
        const force = this.kind === 'ANCIENT_BOSS' ? 30
            : this.kind === 'GOLEM' ? 70 : 180;
        body.setVelocityX(dir * force * PX);
        if (this.kind !== 'ANCIENT_BOSS') body.setVelocityY(-60 * PX);
    }

    canAttack(dist: number): boolean {
        if (!this.active2) return false;
        const range = this.kind === 'ANCIENT_BOSS'
            ? ENEMY_TYPES[this.kind].size * PX * BOSS.ATTACK_RANGE_TILES
            : 28 * PX;
        return this.attackCooldown <= 0 && dist < range;
    }

    doAttack(): void {
        this.attackCooldown = this.kind === 'ANCIENT_BOSS' ? 1800 : 1200;
        EventBus.emit(Events.ENEMY_ATTACK, { damage: this.damage });
    }
}
