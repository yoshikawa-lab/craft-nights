import { PLAYER, ItemType } from './Constants';

export interface InventorySlot {
    item: ItemType | null;
    count: number;
}

class GameState {
    // ---- プレイヤー ----
    hp: number = PLAYER.BASE_MAX_HP;
    maxHp: number = PLAYER.BASE_MAX_HP;
    level = 1;
    xp = 0;
    xpToNext: number = PLAYER.XP_PER_LEVEL_BASE;
    killCount = 0;
    score = 0;

    // ---- インベントリ ----
    hotbar: InventorySlot[] = [];
    inventory: InventorySlot[] = [];
    hotbarIndex = 0;

    // ---- アイテムボックス（共有ストレージ 18スロット） ----
    storageSlots: InventorySlot[] = [];

    // ---- 昼夜 ----
    isNight = false;
    isSleeping = false;
    dayCount = 1;
    timeOfDay = 0;

    // ---- ゲーム ----
    started = false;
    paused = false;
    gameOver = false;
    victory = false;

    // ---- ボス ----
    bossSpawned = false;
    bossDefeated = false;
    bossHp = 0;
    bossMaxHp = 2000;
    bossAlive = false;

    // ---- レベルアップボーナス ----
    bonusAttack = 0;   // 攻撃力ボーナス（レベルアップ選択で加算）
    bonusSpeed  = 0;   // 速度ボーナス（0.2 = 20%増加）

    reset() {
        this.hp = PLAYER.BASE_MAX_HP;
        this.maxHp = PLAYER.BASE_MAX_HP;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = PLAYER.XP_PER_LEVEL_BASE;
        this.killCount = 0;
        this.score = 0;
        this.hotbarIndex = 0;
        this.isNight = false;
        this.isSleeping = false;
        this.dayCount = 1;
        this.timeOfDay = 0;
        this.started = false;
        this.paused = false;
        this.gameOver = false;
        this.victory = false;
        this.bossSpawned = false;
        this.bossDefeated = false;
        this.bossHp = 0;
        this.bossMaxHp = 2000;
        this.bossAlive = false;
        this.bonusAttack = 0;
        this.bonusSpeed  = 0;
        this._initInventory();
    }

    private _initInventory() {
        const HOTBAR = 9;
        const INV = 27;
        this.hotbar = Array.from({ length: HOTBAR }, () => ({ item: null as ItemType | null, count: 0 }));
        this.inventory = Array.from({ length: INV }, () => ({ item: null as ItemType | null, count: 0 }));
        this.storageSlots = Array.from({ length: 18 }, () => ({ item: null as ItemType | null, count: 0 }));
    }

    addItem(item: ItemType, count = 1): boolean {
        const all = [...this.hotbar, ...this.inventory];
        for (const slot of all) {
            if (slot.item === item && slot.count > 0) {
                slot.count += count;
                return true;
            }
        }
        for (const slot of all) {
            if (!slot.item || slot.count === 0) {
                slot.item = item;
                slot.count = count;
                return true;
            }
        }
        return false;
    }

    countItem(item: ItemType): number {
        return [...this.hotbar, ...this.inventory]
            .filter(s => s.item === item)
            .reduce((sum, s) => sum + s.count, 0);
    }

    consumeItem(item: ItemType, count = 1): boolean {
        if (this.countItem(item) < count) return false;
        let remaining = count;
        for (const slot of [...this.hotbar, ...this.inventory]) {
            if (slot.item === item && remaining > 0) {
                const take = Math.min(slot.count, remaining);
                slot.count -= take;
                remaining -= take;
                if (slot.count === 0) slot.item = null;
            }
        }
        return true;
    }

    get selectedItem(): InventorySlot {
        return this.hotbar[this.hotbarIndex];
    }

    get defense(): number {
        const armorDef: Record<string, number> = {
            'iron_armor':    0.20,
            'gold_armor':    0.15,
            'diamond_armor': 0.40,
        };
        for (const slot of [...this.hotbar, ...this.inventory]) {
            if (slot.item && slot.count > 0 && slot.item in armorDef) {
                return armorDef[slot.item];
            }
        }
        return 0;
    }

    addXP(amount: number): boolean {
        this.xp += amount;
        this.killCount += amount;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(PLAYER.XP_PER_LEVEL_BASE * Math.pow(1.5, this.level - 1));
            this.maxHp = PLAYER.BASE_MAX_HP + (this.level - 1) * PLAYER.HP_PER_LEVEL;
            this.hp = Math.min(this.hp + 30, this.maxHp);
            return true;
        }
        return false;
    }

    constructor() {
        this._initInventory();
    }
}

export const gameState = new GameState();
