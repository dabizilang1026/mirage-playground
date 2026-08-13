import type { Difficulty, GameStats, SaveData } from './types';
import { DIFFICULTIES, WEEK_LENGTH } from './config';
import { emptyStats } from './types';

const STORAGE_KEY = 'mirage-playground-saves-v1';

const makeId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class SaveManager {
  list(): SaveData[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as SaveData[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  get(id: string): SaveData | null {
    return this.list().find((s) => s.id === id) ?? null;
  }

  create(name: string, difficulty: Difficulty): SaveData {
    const diff = DIFFICULTIES[difficulty];
    const save: SaveData = {
      id: makeId(),
      name: name.trim().slice(0, 16) || '无名旅人',
      difficulty,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      coins: diff.startCoins,
      day: 1,
      totalEarned: 0,
      totalSpent: 0,
      achievements: [],
      skins: ['basic'],
      equippedSkin: 'basic',
      defeated: false,
      defeatedDay: 0,
      cheatUsed: false,
      stats: emptyStats(),
    };
    save.stats.maxCoins = save.coins;
    const all = this.list();
    all.push(save);
    this._write(all);
    return save;
  }

  remove(id: string): void {
    this._write(this.list().filter((s) => s.id !== id));
  }

  persist(save: SaveData): void {
    save.updatedAt = Date.now();
    if (save.coins > save.stats.maxCoins) save.stats.maxCoins = save.coins;
    const all = this.list();
    const idx = all.findIndex((s) => s.id === save.id);
    if (idx >= 0) all[idx] = clone(save);
    else all.push(clone(save));
    this._write(all);
  }

  private _write(all: SaveData[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // storage unavailable (private mode); keep in memory
    }
  }
}

export const weekOf = (day: number): number => Math.ceil(day / WEEK_LENGTH);

export const daysUntilRent = (day: number): number =>
  WEEK_LENGTH - ((day - 1) % WEEK_LENGTH);

export const cloneSave = clone;
