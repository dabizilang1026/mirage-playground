import Phaser from 'phaser';
import type { Difficulty, GameKey, GameResult, SaveData } from './sim/types';
import { SaveManager, daysUntilRent, weekOf } from './sim/saves';
import { ACHIEVEMENTS } from './sim/achievements';
import { DIFFICULTIES, GAME_MAP } from './sim/config';
import { SKINS } from './sim/skins';
import { toast } from '../ui/dom';

export interface ShellBridge {
  showTitle(): void;
  showSaveSelect(): void;
  showHub(): void;
  showDefeat(save: SaveData): void;
  openGame(key: GameKey): void;
  closeGame(): void;
  refreshHud(): void;
  gameRootHasScene(): boolean;
}

const SCENE_BY_GAME: Record<GameKey, string> = {
  cleaning: 'CleaningScene',
  blackjack: 'BlackjackScene',
  rps: 'RpsScene',
  sword: 'SwordScene',
  roulette: 'RouletteScene',
  tarot: 'TarotScene',
};

class Director {
  saves = new SaveManager();
  current: SaveData | null = null;

  private game: Phaser.Game | null = null;
  private shell: ShellBridge | null = null;
  private activeScene: string | null = null;
  private lastResult: GameResult | null = null;

  bindGame(g: Phaser.Game): void {
    this.game = g;
  }

  bindShell(s: ShellBridge): void {
    this.shell = s;
  }

  get save(): SaveData {
    if (!this.current) throw new Error('未选择档案');
    return this.current;
  }

  startTitle(): void {
    this.shell?.showTitle();
  }

  goToSaves(): void {
    this.shell?.showSaveSelect();
  }

  createSave(name: string, diff: Difficulty): string | null {
    if (this.saves.list().length >= 8) return '最多只能创建 8 个档案';
    if (!name.trim()) return '请给档案取个名字';
    this.current = this.saves.create(name, diff);
    return null;
  }

  deleteSave(id: string): void {
    this.saves.remove(id);
    if (this.current?.id === id) this.current = null;
  }

  openSave(id: string): void {
    const s = this.saves.get(id);
    if (!s) return;
    this.current = s;
    if (s.defeated) {
      this.shell?.showDefeat(s);
      return;
    }
    this.grantAchievements(false);
    this.saves.persist(s);
    this.shell?.showHub();
  }

  play(key: GameKey): void {
    if (!this.game) return;
    const scene = SCENE_BY_GAME[key];
    this.lastResult = null;
    this.shell?.openGame(key);
    try {
      this.game.scene.start(scene);
      this.activeScene = scene;
    } catch (err) {
      console.error('游戏场景启动失败', err);
      toast(`游戏画面加载失败：${err instanceof Error ? err.message : String(err)}`, '⚠️');
      this.shell?.closeGame();
      this.shell?.showHub();
      return;
    }
    window.setTimeout(() => {
      if (!this.shell?.gameRootHasScene()) {
        toast('游戏画面似乎没有出现，请刷新页面后重试，或把屏幕上的红色提示发给我', '⚠️');
      }
    }, 2500);
  }

  exitToHub(): void {
    if (!this.game) return;
    this.activeScene = null;
    this.shell?.closeGame();
    this.game.scene.start('HubScene');
    this.shell?.showHub();
  }

  replay(): void {
    if (!this.game || !this.activeScene) return;
    this.game.scene.start(this.activeScene);
  }

  /** 结算一局：立即写入存档、推进时间、结算租金。若档案落幕则直接展示总结。 */
  settle(result: GameResult): void {
    const save = this.save;
    this.lastResult = result;
    save.coins += result.deltaCoins;
    if (result.deltaCoins > 0) save.totalEarned += result.deltaCoins;
    else save.totalSpent += -result.deltaCoins;
    save.stats.played += 1;
    if (result.outcome === 'win') save.stats.wins += 1;
    else if (result.outcome === 'loss') save.stats.losses += 1;
    else save.stats.draws += 1;
    if (result.stats) {
      for (const [k, v] of Object.entries(result.stats)) {
        const key = k as keyof typeof save.stats;
        if (typeof v === 'number' && key in save.stats) {
          (save.stats as unknown as Record<string, number>)[key] += v;
        }
      }
    }
    save.day += 1;
    if (save.coins > save.stats.maxCoins) save.stats.maxCoins = save.coins;
    this.grantAchievements(true);
    this.saves.persist(save);

    const diff = DIFFICULTIES[save.difficulty];
    if (diff.rent > 0 && (save.day - 1) % 7 === 0) {
      if (save.coins < diff.rent) {
        save.defeated = true;
        save.defeatedDay = save.day;
        this.grantAchievements(true);
        this.saves.persist(save);
        this.activeScene = null;
        this.shell?.closeGame();
        this.game?.scene.start('HubScene');
        this.shell?.showDefeat(save);
        return;
      }
      save.coins -= diff.rent;
      save.totalSpent += diff.rent;
      this.saves.persist(save);
      toast(`已缴纳第 ${weekOf(save.day)} 周馆租 ${diff.rent} 金币`, '🏛️');
    }
    this.shell?.refreshHud();
  }

  get lastGameResult(): GameResult | null {
    return this.lastResult;
  }

  grantAchievements(withToast: boolean): void {
    const save = this.current;
    if (!save) return;
    for (const a of ACHIEVEMENTS) {
      if (!save.achievements.includes(a.id) && a.test(save)) {
        save.achievements.push(a.id);
        if (a.reward > 0) {
          save.coins += a.reward;
          save.totalEarned += a.reward;
        }
        if (withToast) {
          toast(
            `成就解锁：${a.name}${a.reward > 0 ? `  +${a.reward} 金币` : ''}`,
            a.icon,
          );
        }
      }
    }
  }

  buySkin(id: string): string | null {
    const save = this.save;
    if (save.skins.includes(id)) return '已拥有该皮肤';
    const skin = SKINS.find((s) => s.id === id);
    if (!skin) return '皮肤不存在';
    if (save.coins < skin.price) return '金币不足';
    save.coins -= skin.price;
    save.totalSpent += skin.price;
    save.skins.push(id);
    this.grantAchievements(true);
    this.saves.persist(save);
    this.shell?.refreshHud();
    return null;
  }

  equipSkin(id: string): void {
    const save = this.save;
    if (!save.skins.includes(id)) return;
    save.equippedSkin = id;
    this.saves.persist(save);
  }

  cheatAdd(amount: number): void {
    const save = this.save;
    if (save.difficulty !== 'cheat') return;
    const n = Math.max(0, Math.floor(amount));
    if (n <= 0) return;
    save.coins += n;
    save.cheatUsed = true;
    this.grantAchievements(true);
    this.saves.persist(save);
    this.shell?.refreshHud();
  }

  rentInfo(): { daysLeft: number; rent: number } {
    const save = this.save;
    return {
      daysLeft: daysUntilRent(save.day),
      rent: DIFFICULTIES[save.difficulty].rent,
    };
  }

  gameName(key: GameKey): string {
    return GAME_MAP[key].name;
  }
}

export const director = new Director();
