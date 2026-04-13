import Phaser from 'phaser';
import { DAY_NIGHT, ENEMY_DEF, EnemyKind, GAME } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { Enemy } from '../objects/Enemy';
import type { WorldMap } from './WorldMap';

export class EnemySpawner {
  private scene: Phaser.Scene;
  private world: WorldMap;
  private group: Phaser.Physics.Arcade.Group;
  private timer: Phaser.Time.TimerEvent | null = null;
  private isNight = false;

  constructor(scene: Phaser.Scene, world: WorldMap, group: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.world = world;
    this.group = group;

    EventBus.on(EV.NIGHT_START, this.onNight, this);
    EventBus.on(EV.DAY_START,   this.onDay,   this);
    EventBus.on(EV.SLEEP_END,   this.onDay,   this);
  }

  destroy() {
    this.timer?.remove();
    EventBus.off(EV.NIGHT_START, this.onNight, this);
    EventBus.off(EV.DAY_START,   this.onDay,   this);
    EventBus.off(EV.SLEEP_END,   this.onDay,   this);
  }

  private onNight() {
    this.isNight = true;
    this.timer = this.scene.time.addEvent({
      delay: DAY_NIGHT.SPAWN_INTERVAL,
      loop:  true,
      callback: this.spawnEnemy,
      callbackScope: this,
    });
  }

  private onDay() {
    this.isNight = false;
    this.timer?.remove();
    this.timer = null;
    // 昼になったら敵を除去
    this.group.getChildren().forEach(e => (e as unknown as Enemy).destroy());
  }

  private spawnEnemy() {
    if (this.group.getLength() >= DAY_NIGHT.MAX_ENEMIES) return;

    const cam = this.scene.cameras.main;
    const px  = cam.scrollX + cam.width / 2;
    const py  = cam.scrollY + cam.height / 2;

    // プレイヤーからランダム方向に距離を置いて出現
    const angle = Math.random() * Math.PI * 2;
    const dist  = DAY_NIGHT.SPAWN_DIST_MIN + Math.random() * (DAY_NIGHT.SPAWN_DIST_MAX - DAY_NIGHT.SPAWN_DIST_MIN);
    let sx = px + Math.cos(angle) * dist;

    // ワールド内にクリップ
    sx = Math.max(GAME.TILE_SIZE * 2, Math.min(this.world.W * GAME.TILE_SIZE - GAME.TILE_SIZE * 2, sx));
    const tx = Math.floor(sx / GAME.TILE_SIZE);
    const sy = (this.world.getSurfaceY(tx) - 2) * GAME.TILE_SIZE;

    const kind = this.pickKind();
    const enemy = new Enemy(this.scene, sx, sy, kind);
    this.group.add(enemy as unknown as Phaser.GameObjects.GameObject, true);
    EventBus.emit(EV.ENEMY_SPAWNED, enemy);
  }

  private pickKind(): EnemyKind {
    const kinds: EnemyKind[] = ['ZOMBIE', 'SKELETON', 'SPIDER', 'BAT'];
    return kinds[Math.floor(Math.random() * kinds.length)];
  }

  spawnBoss(x: number, y: number) {
    const boss = new Enemy(this.scene, x, y, 'ANCIENT_BOSS');
    this.group.add(boss as unknown as Phaser.GameObjects.GameObject, true);
  }
}
