// ============================
// Player — 横スクロール版
// 物理ボディ: Phaser.Physics.Arcade.Image (Container より確実)
// ビジュアル: 別の Container で描画し、毎フレーム同期する
// ============================
import Phaser from 'phaser';
import { PLAYER, TILE_PX, PX, GAMEPAD, DASH, REGEN } from '../core/Constants';
import { EventBus, Events } from '../core/EventBus';
import { gameState } from '../core/GameState';
import { audioManager } from '../audio/AudioManager';

export class Player {
    /** 実際の物理ボディ（Arcade.Image）— 衝突判定はここで行う */
    readonly phys: Phaser.Physics.Arcade.Image;
    /** ビジュアル用コンテナ（物理なし、毎フレーム phys に追従） */
    private _vis: Phaser.GameObjects.Container;
    private _gfx: Phaser.GameObjects.Graphics;

    private attackCooldown = 0;
    private invulnerable = 0;
    facing = 1; // 1=右 -1=左

    // ジャンプ
    private canJump = false;
    private jumpPressed = false;
    private coyoteTimer = 0;
    private readonly COYOTE_MS = 100;
    private _prevGrounded = false;

    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd?: Record<string, Phaser.Input.Keyboard.Key>;
    private pad?: Phaser.Input.Gamepad.Gamepad;
    private _scene: Phaser.Scene;

    // タッチ入力
    touchLeft    = false;
    touchRight   = false;
    touchJump    = false;
    touchAttack  = false;
    touchInteract = false;

    // ── ダッシュ（Round 2） ────────────────────────────────────
    private _isDashing       = false;
    private _dashTimer       = 0;    // ダッシュ残時間
    private _dashCooldown    = 0;    // クールダウン残時間
    private _lastLeftPress   = 0;    // ダブルタップ判定
    private _lastRightPress  = 0;
    private _dashDir         = 1;
    private _afterimages: Array<{ x: number; y: number; alpha: number; facing: number }> = [];
    private _afterimageTimer = 0;

    // ── HP自動回復（Round 3） ──────────────────────────────────
    private _timeSinceHit  = 0;
    private _regenAccum    = 0;     // 蓄積回復量（小数点管理）

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this._scene = scene;

        // ── 物理ボディ（Arcade.Image）───────────────────────────
        // setVisible(false) で見えないが physics は完全に機能する
        this.phys = scene.physics.add.image(x, y, '__DEFAULT');
        this.phys.setVisible(false).setAlpha(0);

        const body = this.phys.body as Phaser.Physics.Arcade.Body;
        body.setSize(PLAYER.SIZE_W * PX, PLAYER.SIZE_H * PX);
        body.setCollideWorldBounds(true);
        body.setMaxVelocityY(800 * PX);

        // ── ビジュアルコンテナ（物理なし）──────────────────────
        this._vis = scene.add.container(x, y);
        this._vis.setDepth(10);
        this._gfx = scene.add.graphics();
        this._vis.add(this._gfx);
        this._draw();

        this._setupInput(scene);
    }

    // ─── public 座標アクセサ ────────────────────────────────────
    get x(): number  { return this.phys.x; }
    get y(): number  { return this.phys.y; }
    get body(): Phaser.Physics.Arcade.Body {
        return this.phys.body as Phaser.Physics.Arcade.Body;
    }
    get tileX(): number { return Math.floor(this.x / TILE_PX); }
    get tileY(): number { return Math.floor(this.y / TILE_PX); }
    get isGrounded(): boolean {
        return (this.phys.body as Phaser.Physics.Arcade.Body).blocked.down;
    }

    // ─── 描画 ───────────────────────────────────────────────────
    private _draw(): void {
        const g = this._gfx;
        g.clear();
        const hw = (PLAYER.SIZE_W * PX) / 2;
        const hh = (PLAYER.SIZE_H * PX) / 2;

        // 胴体
        g.fillStyle(0x4488ff);
        g.fillRoundedRect(-hw, -hh, hw * 2, hh * 2, 4 * PX);

        // 顔
        const eyeR  = 5 * PX;
        const eyeY  = -hh * 0.15;
        const eyeOX = hw * 0.35 * this.facing;
        g.fillStyle(0xffffff);
        g.fillCircle(eyeOX, eyeY, eyeR);
        g.fillStyle(0x111111);
        g.fillCircle(eyeOX + this.facing * 1.5 * PX, eyeY, eyeR * 0.55);

        // 口
        g.lineStyle(2 * PX, 0x224488);
        g.beginPath();
        const mx = this.facing * hw * 0.15;
        g.moveTo(mx - 4 * PX, hh * 0.3);
        g.lineTo(mx + 4 * PX, hh * 0.3);
        g.strokePath();

        // 腕
        g.fillStyle(0x3366cc);
        g.fillRoundedRect(this.facing * hw * 0.7, -hh * 0.1, hw * 0.4, hh * 0.6, 2 * PX);

        // 脚
        g.fillStyle(0x224488);
        g.fillRect(-hw * 0.4, hh * 0.65, hw * 0.35, hh * 0.35);
        g.fillRect( hw * 0.05, hh * 0.65, hw * 0.35, hh * 0.35);
    }

    // ─── 入力 ───────────────────────────────────────────────────
    private _setupInput(scene: Phaser.Scene): void {
        if (scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasd = {
                up:    scene.input.keyboard.addKey('W'),
                down:  scene.input.keyboard.addKey('S'),
                left:  scene.input.keyboard.addKey('A'),
                right: scene.input.keyboard.addKey('D'),
            };
        }
    }

    // ─── ダッシュ公開API ──────────────────────────────────────
    get isDashing(): boolean { return this._isDashing; }
    get dashCooldownRatio(): number {
        return this._dashCooldown > 0 ? this._dashCooldown / DASH.COOLDOWN_MS : 0;
    }

    // ─── メイン更新 ─────────────────────────────────────────────
    update(delta: number): void {
        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        this.invulnerable   = Math.max(0, this.invulnerable - delta);
        this._dashCooldown  = Math.max(0, this._dashCooldown - delta);
        this._timeSinceHit += delta;

        if (this._scene.input.gamepad?.total) {
            this.pad = this._scene.input.gamepad.getPad(0) ?? undefined;
        }

        const body = this.phys.body as Phaser.Physics.Arcade.Body;

        // 接地判定
        const grounded = body.blocked.down;
        if (grounded) {
            this.coyoteTimer = this.COYOTE_MS;
        } else {
            this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
        }
        this.canJump = this.coyoteTimer > 0;

        // 着地検出
        if (grounded && !this._prevGrounded && body.velocity.y > 40 * PX) {
            audioManager.sfx('land');
            this._scene.tweens.add({
                targets: this._vis,
                scaleY: 0.72, scaleX: 1.22,
                duration: 65,
                yoyo: true,
                ease: 'Quad.easeOut',
            });
        }
        this._prevGrounded = grounded;

        this._handleMovement(delta);
        this._updateFacing();
        this._updateDash(delta);
        this._updateRegen(delta);
        this._updateAfterimages(delta);

        // ビジュアルを物理ボディに追従させる
        this._vis.setPosition(this.phys.x, this.phys.y);
        this._draw();
    }

    // ─── ダッシュ処理 ──────────────────────────────────────────
    private _updateDash(delta: number): void {
        if (this._isDashing) {
            this._dashTimer -= delta;
            // アフターイメージ追加
            this._afterimageTimer -= delta;
            if (this._afterimageTimer <= 0) {
                this._afterimageTimer = 30;
                this._afterimages.push({ x: this.x, y: this.y, alpha: 0.55, facing: this.facing });
            }
            if (this._dashTimer <= 0) {
                this._isDashing = false;
                (this.phys.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
            }
        }
    }

    private _checkDashInput(): void {
        const now = this._scene.time.now;
        const leftDown  = !!(this.cursors?.left.isDown  || this.wasd?.left.isDown);
        const rightDown = !!(this.cursors?.right.isDown || this.wasd?.right.isDown);

        // ダブルタップ検出（JustDown でのみ）
        const leftJust  = Phaser.Input.Keyboard.JustDown(this.cursors?.left  as Phaser.Input.Keyboard.Key)
            || Phaser.Input.Keyboard.JustDown(this.wasd?.left as Phaser.Input.Keyboard.Key);
        const rightJust = Phaser.Input.Keyboard.JustDown(this.cursors?.right as Phaser.Input.Keyboard.Key)
            || Phaser.Input.Keyboard.JustDown(this.wasd?.right as Phaser.Input.Keyboard.Key);

        if (leftJust) {
            if (now - this._lastLeftPress < DASH.DBL_TAP_MS && this._dashCooldown <= 0) {
                this._startDash(-1);
            }
            this._lastLeftPress = now;
        }
        if (rightJust) {
            if (now - this._lastRightPress < DASH.DBL_TAP_MS && this._dashCooldown <= 0) {
                this._startDash(1);
            }
            this._lastRightPress = now;
        }
        void leftDown; void rightDown;  // suppress unused warning
    }

    private _startDash(dir: number): void {
        if (this._isDashing) return;
        this._isDashing     = true;
        this._dashTimer     = DASH.DURATION_MS;
        this._dashCooldown  = DASH.COOLDOWN_MS;
        this._dashDir       = dir;
        this.invulnerable   = Math.max(this.invulnerable, DASH.IFRAMES_MS);
        const body = this.phys.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(dir * DASH.SPEED * PX);
        audioManager.sfx('jump');  // ダッシュ音（近似）
        EventBus.emit(Events.PLAYER_DASH, { x: this.x, y: this.y, dir });
        this._scene.tweens.add({
            targets: this._vis,
            scaleX: 0.6, scaleY: 0.75,
            duration: 80, yoyo: true, ease: 'Quad.easeOut',
        });
    }

    // ─── HP自動回復 ──────────────────────────────────────────
    private _updateRegen(delta: number): void {
        if (this._timeSinceHit < REGEN.SAFE_TIME_MS) return;
        const maxRegen = gameState.maxHp * REGEN.MAX_RATIO;
        if (gameState.hp >= maxRegen) return;

        this._regenAccum += (REGEN.RATE_PER_SEC / 1000) * delta;
        if (this._regenAccum >= 1) {
            const heal = Math.floor(this._regenAccum);
            this._regenAccum -= heal;
            gameState.hp = Math.min(gameState.hp + heal, Math.round(maxRegen));
            EventBus.emit(Events.PLAYER_HEALED, { amount: heal });
        }
    }

    // ─── アフターイメージ描画 ────────────────────────────────
    private _updateAfterimages(delta: number): void {
        for (let i = this._afterimages.length - 1; i >= 0; i--) {
            this._afterimages[i].alpha -= delta * 0.004;
            if (this._afterimages[i].alpha <= 0) {
                this._afterimages.splice(i, 1);
            }
        }
    }

    /** ダッシュアフターイメージをシーンに描画（GameSceneから呼ぶ） */
    renderAfterimages(g: Phaser.GameObjects.Graphics): void {
        g.clear();
        const hw = (PLAYER.SIZE_W * PX) / 2;
        const hh = (PLAYER.SIZE_H * PX) / 2;
        for (const af of this._afterimages) {
            g.fillStyle(0x4488ff, af.alpha);
            g.fillRoundedRect(af.x - hw, af.y - hh, hw * 2, hh * 2, 4 * PX);
        }
    }

    private _handleMovement(_delta: number): void {
        this._checkDashInput();  // ダッシュ入力チェック（JustDown依存のためここで呼ぶ）
        if (this._isDashing) return;  // ダッシュ中は通常移動を無効化

        const body = this.phys.body as Phaser.Physics.Arcade.Body;
        // bonusSpeedによる速度ボーナス（最大+60%）
        const speedMult = 1 + Math.min(gameState.bonusSpeed, 0.6);
        const speed = PLAYER.SPEED * PX * speedMult;

        let vx = 0;
        if (this._isLeft())  vx = -speed;
        if (this._isRight()) vx = speed;
        body.setVelocityX(vx);

        const jumpNow = this._isJump();
        if (jumpNow && !this.jumpPressed && this.canJump) {
            body.setVelocityY(PLAYER.JUMP_FORCE * PX);
            this.coyoteTimer = 0;
            audioManager.sfx('jump');
            EventBus.emit(Events.SPECTACLE_ACTION);
            this._scene.tweens.add({
                targets: this._vis,
                scaleX: 0.8, scaleY: 1.2,
                duration: 80,
                yoyo: true,
                ease: 'Quad.easeOut',
            });
        }
        if (!jumpNow && body.velocity.y < 0) {
            body.setVelocityY(body.velocity.y * 0.88);
        }
        this.jumpPressed = jumpNow;
    }

    private _updateFacing(): void {
        const vx = (this.phys.body as Phaser.Physics.Arcade.Body).velocity.x;
        if (vx > 10) this.facing = 1;
        else if (vx < -10) this.facing = -1;
    }

    // ─── 入力ヘルパー ─────────────────────────────────────────
    private _isLeft()  { return !!(this.cursors?.left.isDown  || this.wasd?.left.isDown  || this.touchLeft  || (this.pad && this.pad.leftStick.x < -GAMEPAD.DEADZONE)); }
    private _isRight() { return !!(this.cursors?.right.isDown || this.wasd?.right.isDown || this.touchRight || (this.pad && this.pad.leftStick.x > GAMEPAD.DEADZONE)); }
    private _isJump()  {
        return !!(
            this.cursors?.up.isDown || this.cursors?.space?.isDown ||
            this.wasd?.up.isDown || this.touchJump ||
            (this.pad?.buttons[GAMEPAD.JUMP_BTN]?.pressed)
        );
    }

    isAttackPressed(): boolean {
        return !!(this.cursors?.space?.isDown || this.touchAttack || (this.pad?.buttons[GAMEPAD.ATTACK_BTN]?.pressed));
    }
    canAttack(): boolean { return this.attackCooldown <= 0; }

    doAttack(): void {
        this.attackCooldown = PLAYER.ATTACK_COOLDOWN;
        EventBus.emit(Events.PLAYER_ATTACK, { x: this.x, y: this.y, facing: this.facing });
        EventBus.emit(Events.SPECTACLE_ACTION);
        this._scene.tweens.add({
            targets: this._vis,
            scaleX: 1 + 0.15 * this.facing,
            duration: 80,
            yoyo: true,
            ease: 'Expo.easeOut',
        });
    }

    takeDamage(amount: number): void {
        if (this.invulnerable > 0) return;
        const reduced = Math.max(1, Math.round(amount * (1 - gameState.defense)));
        gameState.hp = Math.max(0, gameState.hp - reduced);
        this.invulnerable = PLAYER.INVULNERABLE_MS;
        this._timeSinceHit = 0;   // 回復タイマーリセット
        this._regenAccum   = 0;
        EventBus.emit(Events.PLAYER_DAMAGED, { hp: gameState.hp });
        this._scene.tweens.add({
            targets: this._gfx,
            alpha: 0.2,
            duration: 80,
            yoyo: true,
            repeat: 3,
            onComplete: () => { if (this._gfx?.active) this._gfx.setAlpha(1); },
        });
        this._scene.cameras.main.shake(100, 0.01);
        if (gameState.hp <= 0) EventBus.emit(Events.PLAYER_DIED);
    }

    /** シーン再起動時にオブジェクトを破棄する */
    destroy(): void {
        this.phys.destroy();
        this._vis.destroy();
    }
}
