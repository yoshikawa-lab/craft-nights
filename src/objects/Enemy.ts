import Phaser from 'phaser';
import { ENEMY_DEF, EnemyKind, DUNGEON_FRAME, ELITE, ITEM, ItemType, PALETTE } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';

interface DropEntry { item: ItemType; chance: number; min: number; max: number }

const DROPS: Partial<Record<EnemyKind, DropEntry[]>> = {
  ZOMBIE:       [{ item: ITEM.WOOL,   chance: 0.6, min: 1, max: 2 }],
  SKELETON:     [{ item: ITEM.ARROW,  chance: 0.7, min: 1, max: 3 },
                 { item: ITEM.STONE, chance: 0.4, min: 1, max: 2 }],
  SPIDER:       [{ item: ITEM.WOOL,   chance: 0.5, min: 1, max: 2 }],
  BAT:          [],
  GOLEM:        [{ item: ITEM.STONE,  chance: 1.0, min: 3, max: 6 }],
  ANCIENT_BOSS: [{ item: ITEM.NETHERITE, chance: 1.0, min: 1, max: 2 },
                 { item: ITEM.DIAMOND,   chance: 1.0, min: 3, max: 5 }],
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  readonly def: typeof ENEMY_DEF[EnemyKind];
  readonly isElite: boolean;

  maxHp: number;
  hp: number;
  dmg: number;
  private hpBar: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text | null = null;
  private attackCd = 0;
  private dir = 1;
  private stateTimer = 0;
  private aiState: 'patrol' | 'chase' | 'attack' = 'patrol';

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind) {
    const def = ENEMY_DEF[kind];
    super(scene, x, y, 'dungeon', DUNGEON_FRAME[`${kind}_IDLE` as keyof typeof DUNGEON_FRAME] ?? DUNGEON_FRAME.ZOMBIE_IDLE);
    this.kind    = kind;
    this.def     = def;
    this.isElite = Math.random() < ELITE.CHANCE;

    this.maxHp = Math.round(def.hp  * (this.isElite ? ELITE.HP_MULT  : 1));
    this.hp    = this.maxHp;
    this.dmg   = Math.round(def.dmg * (this.isElite ? ELITE.DMG_MULT : 1));

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(def.w, def.h);
    body.setGravityY(600);
    body.setCollideWorldBounds(true);

    this.setDepth(10);
    this.setScale(kind === 'ANCIENT_BOSS' ? 2.5 : 2);
    if (this.isElite) this.setTint(0xff8800);

    // HP バー
    this.hpBar = scene.add.graphics().setDepth(11);

    // エリートラベル
    if (this.isElite) {
      this.label = scene.add.text(x, y - 20, '★ ' + def.label, {
        fontSize: '8px', color: '#ff8800', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(12);
    }

    this.buildAnimations();
  }

  private buildAnimations() {
    const k = this.kind;
    const sc = this.scene;

    const idleKey  = `${k}_idle`;
    const walkKey  = `${k}_walk`;
    const atkKey   = `${k}_atk`;

    const FRAMES = DUNGEON_FRAME as Record<string, number>;
    const idle  = FRAMES[`${k}_IDLE`]  ?? FRAMES['ZOMBIE_IDLE'];
    const walk  = FRAMES[`${k}_WALK`]  ?? idle;
    const atk   = FRAMES[`${k}_ATTACK`] ?? idle;

    if (!sc.anims.exists(idleKey)) {
      sc.anims.create({ key: idleKey, frames: [{ key: 'dungeon', frame: idle }], frameRate: 4, repeat: -1 });
    }
    if (!sc.anims.exists(walkKey)) {
      sc.anims.create({ key: walkKey, frames: sc.anims.generateFrameNumbers('dungeon', { frames: [walk, idle] }), frameRate: 6, repeat: -1 });
    }
    if (!sc.anims.exists(atkKey)) {
      sc.anims.create({ key: atkKey,  frames: [{ key: 'dungeon', frame: atk }],  frameRate: 8, repeat: 0 });
    }

    this.play(idleKey);
  }

  update(delta: number, playerX: number, playerY: number) {
    if (!this.active) return;

    this.attackCd  -= delta;
    this.stateTimer -= delta;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const body  = this.body as Phaser.Physics.Arcade.Body;
    const speed = this.def.speed * (this.isElite ? 1.2 : 1);

    // ---- State machine ----
    if (dist < 250) {
      this.aiState = dist < 30 ? 'attack' : 'chase';
    } else {
      if (this.stateTimer <= 0) {
        this.dir = Math.random() < 0.5 ? 1 : -1;
        this.stateTimer = 1500 + Math.random() * 2000;
      }
      this.aiState = 'patrol';
    }

    // ---- Movement ----
    if (this.aiState === 'patrol') {
      body.setVelocityX(this.dir * speed * 0.4);
      this.setFlipX(this.dir < 0);
      this.play(`${this.kind}_idle`, true);
    } else if (this.aiState === 'chase') {
      const vx = (dx / dist) * speed;
      body.setVelocityX(vx);
      this.setFlipX(dx < 0);
      this.play(`${this.kind}_walk`, true);

      // BAT と SPIDER は飛んだり壁を登ったりする
      if (this.kind === 'BAT') {
        body.setVelocityY((dy / dist) * speed);
        body.setGravityY(-600); // 浮遊
      } else if (this.kind === 'SPIDER') {
        if (dist < 150 && body.blocked.right || body.blocked.left) {
          body.setVelocityY(-280);
        }
      } else {
        if (body.blocked.right || body.blocked.left) body.setVelocityY(-280);
      }
    } else if (this.aiState === 'attack') {
      body.setVelocityX(0);
      this.play(`${this.kind}_atk`, true);
    }

    // HP バー更新
    this.drawHpBar();
    if (this.label) this.label.setPosition(this.x, this.y - this.def.h - 8);
  }

  private drawHpBar() {
    const g = this.hpBar;
    g.clear();
    const bw = this.def.w * this.scale;
    const bx = this.x - bw / 2;
    const by = this.y - this.def.h * this.scale / 2 - 6;
    const ratio = this.hp / this.maxHp;

    g.fillStyle(0x333333);
    g.fillRect(bx, by, bw, 3);
    g.fillStyle(this.isElite ? 0xff8800 : 0xdd4444);
    g.fillRect(bx, by, bw * ratio, 3);
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
      if (this.active && this.isElite) this.setTint(0xff8800);
    });

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die() {
    // ドロップ
    const drops = DROPS[this.kind] ?? [];
    const dropList: { item: ItemType; count: number }[] = [];
    for (const d of drops) {
      if (Math.random() < d.chance) {
        const cnt = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
        dropList.push({ item: d.item, count: cnt });
      }
    }
    const xp = this.def.xp * (this.isElite ? ELITE.XP_MULT : 1);
    EventBus.emit(EV.ENEMY_DIED, { kind: this.kind, x: this.x, y: this.y, drops: dropList, xp });
    this.label?.destroy();
    this.hpBar.destroy();
    this.destroy();
  }

  /** 攻撃クールダウンが終わっていれば攻撃 */
  tryAttack(): number {
    if (this.attackCd > 0) return 0;
    this.attackCd = 1200;
    return this.dmg;
  }
}
