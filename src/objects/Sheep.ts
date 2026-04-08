import Phaser from 'phaser';
import { SHEEP, PX, ITEM } from '../core/Constants';
import { EventBus, Events } from '../core/EventBus';

export class Sheep extends Phaser.GameObjects.Container {
    declare body: Phaser.Physics.Arcade.Body;
    private gfx!: Phaser.GameObjects.Graphics;
    hp = SHEEP.HP;
    active2 = true;
    private wanderTimer = 0;
    private wanderDir = 1;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        scene.add.existing(this);
        this.setDepth(10);  // タイルマップより前面
        scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(SHEEP.SIZE_W * PX, SHEEP.SIZE_H * PX);
        body.setOffset(-(SHEEP.SIZE_W * PX) / 2, -(SHEEP.SIZE_H * PX) / 2);
        body.setCollideWorldBounds(true);

        this.gfx = scene.add.graphics();
        this.add(this.gfx);
        this._draw();
    }

    private _draw(): void {
        const g = this.gfx;
        g.clear();
        const hw = (SHEEP.SIZE_W * PX) / 2;
        const hh = (SHEEP.SIZE_H * PX) / 2;

        // 毛（白いふわふわ体）
        g.fillStyle(SHEEP.COLOR);
        g.fillEllipse(0, -hh * 0.1, hw * 2, hh * 1.4);
        g.fillCircle(-hw * 0.5, -hh * 0.5, hh * 0.55);
        g.fillCircle( hw * 0.3, -hh * 0.6, hh * 0.5);
        g.fillCircle(0, -hh * 0.7, hh * 0.6);

        // 顔
        g.fillStyle(0xddddbb);
        g.fillRoundedRect(hw * 0.4, -hh * 0.3, hw * 0.65, hh * 0.55, 3 * PX);
        g.fillStyle(0x000000);
        g.fillCircle(hw * 0.85, -hh * 0.1, 2 * PX);

        // 脚
        g.fillStyle(0xddddbb);
        for (let i = 0; i < 4; i++) {
            const lx = -hw * 0.5 + i * hw * 0.4;
            g.fillRect(lx, hh * 0.5, hw * 0.2, hh * 0.5);
        }
    }

    update(delta: number, playerX: number, playerY: number): void {
        if (!this.active2) return;
        this.wanderTimer = Math.max(0, this.wanderTimer - delta);

        const body = this.body as Phaser.Physics.Arcade.Body;
        const dx = this.x - playerX;
        const dist = Math.abs(dx);
        const fleeRange = SHEEP.FLEE_RANGE * PX;

        if (dist < fleeRange) {
            // プレイヤーと逆方向に逃げる
            const speed = SHEEP.SPEED * PX * 1.4;
            body.setVelocityX(dx > 0 ? speed : -speed);
            this.wanderTimer = 1200;
            // 壁ジャンプ
            if (body.blocked.left || body.blocked.right) {
                body.setVelocityY(-300 * PX);
            }
        } else if (this.wanderTimer <= 0) {
            this.wanderTimer = 1800 + Math.random() * 2000;
            if (Math.random() < 0.25) {
                body.setVelocityX(0);
            } else {
                this.wanderDir = Math.random() < 0.5 ? 1 : -1;
                body.setVelocityX(this.wanderDir * SHEEP.SPEED * PX * 0.5);
            }
        }
    }

    takeDamage(amount: number): void {
        this.hp -= amount;
        this.scene.tweens.add({
            targets: this.gfx,
            alpha: 0.2,
            duration: 60,
            yoyo: true,
            repeat: 2,
            onComplete: () => { if (this.gfx?.active) this.gfx.setAlpha(1); },
        });
        if (this.hp <= 0) this._die();
    }

    private _die(): void {
        this.active2 = false;
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        EventBus.emit(Events.SHEEP_DIED, { x: this.x, y: this.y, drops: ITEM.WOOL, count: SHEEP.WOOL_DROP });
        this.scene.tweens.add({
            targets: this,
            alpha: 0, scale: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete: () => { if (this.active) this.destroy(); },
        });
    }
}
