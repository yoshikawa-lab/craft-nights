import { ITEM, ItemType, PLAYER } from './Constants';

// ============================================================
// GameState — グローバル状態の一元管理
// ============================================================

export interface InventorySlot {
  item: ItemType | null;
  count: number;
}

export interface SaveData {
  inventory: InventorySlot[];
  hotbarIndex: number;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  armor: string | null;
  weaponSlot: string | null;
  worldSeed: number;
  dayCount: number;
}

const INV_SIZE = 36;
const DEFAULT_SAVE: SaveData = {
  inventory:   Array.from({ length: INV_SIZE }, () => ({ item: null, count: 0 })),
  hotbarIndex: 0,
  hp:          PLAYER.BASE_HP,
  maxHp:       PLAYER.BASE_HP,
  xp:          0,
  level:       1,
  armor:       null,
  weaponSlot:  null,
  worldSeed:   Math.floor(Math.random() * 999999),
  dayCount:    1,
};

class _GameState {
  private data: SaveData = structuredClone(DEFAULT_SAVE);

  // ---- 初期化 ----
  reset() {
    this.data = structuredClone(DEFAULT_SAVE);
    this.data.worldSeed = Math.floor(Math.random() * 999999);
  }

  // ---- 保存 / 読込 ----
  save() {
    try { localStorage.setItem('craft_nights_save', JSON.stringify(this.data)); } catch {}
  }
  load(): boolean {
    try {
      const raw = localStorage.getItem('craft_nights_save');
      if (!raw) return false;
      const parsed = JSON.parse(raw) as SaveData;
      this.data = { ...structuredClone(DEFAULT_SAVE), ...parsed };
      return true;
    } catch { return false; }
  }

  // ---- HP ----
  get hp()    { return this.data.hp; }
  get maxHp() { return this.data.maxHp; }
  setHp(v: number)    { this.data.hp    = Math.max(0, Math.min(this.data.maxHp, v)); }
  setMaxHp(v: number) { this.data.maxHp = v; this.data.hp = Math.min(this.data.hp, v); }

  // ---- XP / Level ----
  get xp()    { return this.data.xp; }
  get level() { return this.data.level; }
  addXp(amount: number): boolean {
    this.data.xp += amount;
    const needed = this.xpForNextLevel();
    if (this.data.xp >= needed) {
      this.data.xp -= needed;
      this.data.level++;
      this.data.maxHp += PLAYER.HP_PER_LEVEL;
      this.data.hp = this.data.maxHp;
      return true; // leveled up
    }
    return false;
  }
  xpForNextLevel(): number {
    return Math.floor(PLAYER.XP_BASE * Math.pow(1.5, this.data.level - 1) * 10);
  }

  // ---- 装備 ----
  get armor()     { return this.data.armor; }
  get weapon()    { return this.data.weaponSlot; }
  setArmor(v: string | null)  { this.data.armor = v; }
  setWeapon(v: string | null) { this.data.weaponSlot = v; }

  // ---- インベントリ ----
  get inventory() { return this.data.inventory; }

  hotbarSlots(): InventorySlot[] {
    return this.data.inventory.slice(0, 9);
  }
  get hotbarIndex() { return this.data.hotbarIndex; }
  set hotbarIndex(v: number) { this.data.hotbarIndex = Math.max(0, Math.min(8, v)); }

  selectedItem(): ItemType | null {
    return this.data.inventory[this.data.hotbarIndex]?.item ?? null;
  }

  /** アイテムをインベントリに追加。成功時 true */
  addItem(item: ItemType, count = 1): boolean {
    // 既存スタックに追加
    for (const slot of this.data.inventory) {
      if (slot.item === item && slot.count < 64) {
        const add = Math.min(count, 64 - slot.count);
        slot.count += add;
        count -= add;
        if (count <= 0) return true;
      }
    }
    // 新しいスロット
    for (const slot of this.data.inventory) {
      if (!slot.item) {
        slot.item  = item;
        slot.count = Math.min(count, 64);
        count -= slot.count;
        if (count <= 0) return true;
      }
    }
    return count <= 0;
  }

  /** アイテムを消費。足りなければ false */
  consumeItem(item: ItemType, count = 1): boolean {
    if (this.countItem(item) < count) return false;
    let remaining = count;
    for (const slot of this.data.inventory) {
      if (slot.item === item && remaining > 0) {
        const take = Math.min(slot.count, remaining);
        slot.count -= take;
        remaining  -= take;
        if (slot.count === 0) slot.item = null;
      }
    }
    return true;
  }

  countItem(item: ItemType): number {
    return this.data.inventory.reduce((s, sl) => s + (sl.item === item ? sl.count : 0), 0);
  }

  hasItems(req: Record<string, number>): boolean {
    return Object.entries(req).every(([it, cnt]) =>
      this.countItem(it as ItemType) >= cnt
    );
  }

  // ---- Day ----
  get dayCount() { return this.data.dayCount; }
  incrementDay()  { this.data.dayCount++; }

  // ---- Seed ----
  get worldSeed() { return this.data.worldSeed; }
}

export const GameState = new _GameState();
