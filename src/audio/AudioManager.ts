// ============================
// AudioManager — Web Audio API 手続き型サウンド
// ============================

export type SfxKey =
    | 'jump' | 'land' | 'hit_enemy' | 'hit_player'
    | 'break_block' | 'place_block' | 'pickup'
    | 'sword_swing' | 'bow_shoot' | 'level_up'
    | 'craft_success' | 'chest_open' | 'sleep_start'
    | 'day_start' | 'night_start' | 'enemy_die' | 'player_die'
    | 'boss_roar' | 'boss_stomp' | 'boss_die' | 'lava_damage';

class AudioManager {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private _muted = false;

    get isMuted(): boolean { return this._muted; }

    init(): void {
        if (this.ctx) return;
        try {
            this.ctx = new AudioContext();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.35;
            this.master.connect(this.ctx.destination);
        } catch { /* silently fail in restricted environments */ }
    }

    resume(): void {
        if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    }

    toggleMute(): boolean {
        this._muted = !this._muted;
        if (this.master && this.ctx) {
            this.master.gain.setTargetAtTime(
                this._muted ? 0 : 0.35,
                this.ctx.currentTime,
                0.05,
            );
        }
        return this._muted;
    }

    sfx(key: SfxKey): void {
        if (this._muted || !this.ctx || !this.master) return;
        this.resume();
        try {
            switch (key) {
                case 'jump':          this._jump();         break;
                case 'land':          this._land();         break;
                case 'hit_enemy':     this._hitEnemy();     break;
                case 'hit_player':    this._hitPlayer();    break;
                case 'break_block':   this._breakBlock();   break;
                case 'place_block':   this._placeBlock();   break;
                case 'pickup':        this._pickup();       break;
                case 'sword_swing':   this._swordSwing();   break;
                case 'bow_shoot':     this._bowShoot();     break;
                case 'level_up':      this._levelUp();      break;
                case 'craft_success': this._craftSuccess(); break;
                case 'chest_open':    this._chestOpen();    break;
                case 'sleep_start':   this._sleepSound();   break;
                case 'day_start':     this._daySound();     break;
                case 'night_start':   this._nightSound();   break;
                case 'enemy_die':     this._enemyDie();     break;
                case 'player_die':    this._playerDie();    break;
                case 'boss_roar':     this._bossRoar();     break;
                case 'boss_stomp':    this._bossStomp();    break;
                case 'boss_die':      this._bossDie();      break;
                case 'lava_damage':   this._lavaDamage();   break;
            }
        } catch { /* ignore AudioContext errors */ }
    }

    // ---- Oscillator helper ----
    private _osc(
        freq: number,
        endFreq: number,
        duration: number,
        type: OscillatorType,
        gainVal: number,
        startDelay = 0,
    ): void {
        if (!this.ctx || !this.master) return;
        const now = this.ctx.currentTime + startDelay;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gainVal, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        g.connect(this.master);

        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(Math.max(1, freq), now);
        if (endFreq !== freq) {
            o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
        }
        o.connect(g);
        o.start(now);
        o.stop(now + duration + 0.01);
    }

    // ---- Noise helper ----
    private _noise(duration: number, gainVal: number, cutoff = 2000, startDelay = 0): void {
        if (!this.ctx || !this.master) return;
        const now = this.ctx.currentTime + startDelay;
        const rate = this.ctx.sampleRate;
        const bufLen = Math.floor(rate * (duration + 0.02));
        const buf = this.ctx.createBuffer(1, bufLen, rate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = cutoff;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gainVal, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        src.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + duration + 0.02);
    }

    // ---- Sound definitions ----

    private _jump(): void {
        this._osc(160, 440, 0.13, 'square', 0.11);
    }

    private _land(): void {
        this._noise(0.07, 0.4, 350);
        this._osc(100, 55, 0.09, 'sine', 0.28);
    }

    private _hitEnemy(): void {
        this._osc(320, 80, 0.11, 'square', 0.2);
        this._noise(0.06, 0.16, 1300);
    }

    private _hitPlayer(): void {
        this._osc(160, 55, 0.22, 'sawtooth', 0.26);
        this._noise(0.1, 0.22, 700);
    }

    private _breakBlock(): void {
        this._noise(0.13, 0.3, 1000);
        this._osc(220, 70, 0.1, 'square', 0.1);
    }

    private _placeBlock(): void {
        this._noise(0.06, 0.2, 1500);
        this._osc(300, 260, 0.07, 'square', 0.08);
    }

    private _pickup(): void {
        this._osc(650, 950, 0.1, 'sine', 0.12);
        this._osc(950, 1250, 0.09, 'sine', 0.09, 0.08);
    }

    private _swordSwing(): void {
        this._noise(0.09, 0.17, 3800);
        this._osc(480, 200, 0.08, 'sawtooth', 0.07);
    }

    private _bowShoot(): void {
        this._noise(0.07, 0.2, 4500);
    }

    private _enemyDie(): void {
        this._osc(360, 80, 0.27, 'sawtooth', 0.24);
        this._noise(0.13, 0.16, 650);
    }

    private _playerDie(): void {
        this._osc(280, 70, 0.55, 'sawtooth', 0.32);
        this._osc(180, 50, 0.65, 'sawtooth', 0.22, 0.22);
        this._osc(100, 40, 0.75, 'sine',     0.18, 0.52);
    }

    private _chestOpen(): void {
        [380, 560, 760, 980, 1260].forEach((f, i) => {
            this._osc(f, f * 1.04, 0.18, 'sine', 0.13, i * 0.065);
        });
    }

    private _craftSuccess(): void {
        [523, 659, 784, 1047].forEach((f, i) => {
            this._osc(f, f, 0.18, 'sine', 0.12, i * 0.075);
        });
    }

    private _levelUp(): void {
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
            this._osc(f, f * 1.02, 0.22, 'sine', 0.17, i * 0.085);
        });
    }

    private _sleepSound(): void {
        this._osc(260, 120, 1.1, 'sine', 0.1);
        this._osc(200, 90,  1.4, 'sine', 0.07, 0.5);
    }

    private _daySound(): void {
        [523, 659, 784].forEach((f, i) => {
            this._osc(f, f, 0.22, 'sine', 0.1, i * 0.12);
        });
    }

    private _nightSound(): void {
        [400, 340, 270].forEach((f, i) => {
            this._osc(f, f * 0.87, 0.35, 'sine', 0.09, i * 0.15);
        });
    }

    private _bossRoar(): void {
        // 低周波の唸り（ボス登場）
        this._osc(80,  40,  1.2, 'sawtooth', 0.4);
        this._osc(120, 60,  0.9, 'square',   0.2, 0.1);
        this._noise(0.5, 0.5, 800, 0.0);
        this._osc(200, 100, 0.6, 'sawtooth', 0.25, 0.4);
    }

    private _bossStomp(): void {
        // 重い踏みつけ音
        this._noise(0.3, 0.7, 400);
        this._osc(60, 30, 0.4, 'sine', 0.5);
        this._osc(90, 40, 0.35, 'square', 0.2, 0.05);
    }

    private _bossDie(): void {
        // ボス撃破（壮大な崩壊音）
        this._noise(1.5, 0.6, 600);
        [200, 160, 120, 80, 50].forEach((f, i) => {
            this._osc(f, f * 0.3, 0.8, 'sawtooth', 0.3, i * 0.15);
        });
        // 勝利チャイム
        [523, 659, 784, 1047].forEach((f, i) => {
            this._osc(f, f, 0.4, 'sine', 0.15, 0.8 + i * 0.12);
        });
    }

    private _lavaDamage(): void {
        // 焼けるような音
        this._noise(0.25, 0.5, 3000);
        this._osc(150, 80, 0.25, 'sawtooth', 0.15);
    }
}

export const audioManager = new AudioManager();
