import Phaser from 'phaser';
import { DAY_NIGHT, PALETTE } from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { GameState } from '../core/GameState';

export type TimePhase = 'day' | 'night' | 'sleeping';

export class DayNightSystem {
  private scene: Phaser.Scene;
  private elapsed = 0;
  private phase: TimePhase = 'day';
  private skyTop!: Phaser.GameObjects.Rectangle;
  private skyBot!: Phaser.GameObjects.Rectangle;
  private overlay!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, skyTop: Phaser.GameObjects.Rectangle, skyBot: Phaser.GameObjects.Rectangle) {
    this.scene  = scene;
    this.skyTop = skyTop;
    this.skyBot = skyBot;

    // 夜間オーバーレイ
    this.overlay = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000022, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(90);
  }

  get isDay()     { return this.phase === 'day'; }
  get isNight()   { return this.phase === 'night'; }
  get isSleeping(){ return this.phase === 'sleeping'; }
  get currentPhase() { return this.phase; }

  /** 経過時間 (0~1) within current phase */
  get progress() {
    const total = this.phase === 'day' ? DAY_NIGHT.DAY_MS : DAY_NIGHT.NIGHT_MS;
    return Math.min(1, this.elapsed / total);
  }

  update(delta: number) {
    if (this.phase === 'sleeping') return;

    this.elapsed += delta;

    if (this.phase === 'day' && this.elapsed >= DAY_NIGHT.DAY_MS) {
      this.elapsed = 0;
      this.phase   = 'night';
      EventBus.emit(EV.NIGHT_START);
    } else if (this.phase === 'night' && this.elapsed >= DAY_NIGHT.NIGHT_MS) {
      this.elapsed = 0;
      this.phase   = 'day';
      GameState.incrementDay();
      EventBus.emit(EV.DAY_START);
    }

    this.updateVisuals();
  }

  sleep() {
    if (this.phase !== 'night') return;
    this.phase   = 'sleeping';
    this.elapsed = 0;
    EventBus.emit(EV.SLEEP_START);

    this.scene.time.delayedCall(DAY_NIGHT.SLEEP_MS, () => {
      this.phase = 'day';
      this.elapsed = 0;
      GameState.incrementDay();
      EventBus.emit(EV.SLEEP_END);
      EventBus.emit(EV.DAY_START);
    });
  }

  private updateVisuals() {
    let alpha = 0;

    if (this.phase === 'night') {
      alpha = Math.min(0.55, this.progress * 0.7);
      const t = this.progress;
      const r = Math.round(0x87 + (0x0a - 0x87) * t);
      const g = Math.round(0xce + (0x0a - 0xce) * t);
      const b = Math.round(0xeb + (0x1e - 0xeb) * t);
      this.skyTop.setFillStyle((r << 16) | (g << 8) | b);
    } else {
      alpha = Math.max(0, 0.55 - this.progress * 0.7);
      const t = this.progress;
      const r = Math.round(0x0a + (0x87 - 0x0a) * t);
      const g = Math.round(0x0a + (0xce - 0x0a) * t);
      const b = Math.round(0x1e + (0xeb - 0x1e) * t);
      this.skyTop.setFillStyle((r << 16) | (g << 8) | b);
    }

    this.overlay.setAlpha(alpha);
  }
}
