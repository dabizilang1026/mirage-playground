import type { SaveData } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
  icon: string;
  test: (s: SaveData) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_step',
    name: '初次踏入',
    desc: '创建档案，踏入幻境游乐场',
    reward: 100,
    icon: '🚪',
    test: () => true,
  },
  {
    id: 'first_win',
    name: '首战告捷',
    desc: '在任何挑战中赢得一场胜利',
    reward: 200,
    icon: '🏅',
    test: (s) => s.stats.wins >= 1,
  },
  {
    id: 'clean_100',
    name: '勤劳清洁工',
    desc: '累计正确分类 100 件杂物',
    reward: 300,
    icon: '🧹',
    test: (s) => s.stats.cleaningCorrect >= 100,
  },
  {
    id: 'clean_perfect',
    name: '一尘不染',
    desc: '单次清扫没有任何失误',
    reward: 200,
    icon: '✨',
    test: (s) => s.stats.cleaningPerfect >= 1,
  },
  {
    id: 'blackjack_natural',
    name: '天选二十一点',
    desc: '以自然二十一点击败庄家',
    reward: 500,
    icon: '♠',
    test: (s) => s.stats.blackjackNaturals >= 1,
  },
  {
    id: 'blackjack_10',
    name: '殿堂牌手',
    desc: '二十一点累计获胜 10 次',
    reward: 500,
    icon: '🃏',
    test: (s) => s.stats.wins >= 10 && s.stats.played > 0,
  },
  {
    id: 'rps_10',
    name: '猜拳宗师',
    desc: '投票猜拳累计获胜 10 次',
    reward: 500,
    icon: '✊',
    test: (s) => s.stats.wins >= 10 && s.stats.played > 0,
  },
  {
    id: 'rps_triple_tie',
    name: '以和为贵',
    desc: '投票猜拳三张牌全部打平',
    reward: 300,
    icon: '🤝',
    test: (s) => s.stats.rpsAllTies >= 1,
  },
  {
    id: 'sword_1000',
    name: '一剑千金',
    desc: '生死剑单局净收益达到 1000 金币',
    reward: 600,
    icon: '🗡️',
    test: (s) => s.stats.swordHitHoles >= 0 && s.stats.maxCoins >= 0,
  },
  {
    id: 'sword_triple',
    name: '三剑归巢',
    desc: '生死剑中三剑全部命中洞口',
    reward: 500,
    icon: '🎯',
    test: (s) => s.stats.swordAllHit >= 1,
  },
  {
    id: 'roulette_fire',
    name: '死神扣动',
    desc: '生死转盘成功开火并获胜',
    reward: 800,
    icon: '💥',
    test: (s) => s.stats.rouletteFireWins >= 1,
  },
  {
    id: 'tarot_10',
    name: '塔罗占卜师',
    desc: '命运塔罗累计获胜 10 次',
    reward: 500,
    icon: '🔮',
    test: (s) => s.stats.wins >= 10 && s.stats.played > 0,
  },
  {
    id: 'joker_win',
    name: '大王降临',
    desc: '翻到大王并直接获胜',
    reward: 400,
    icon: '🃏',
    test: (s) => s.stats.tarotJokerWins >= 1,
  },
  {
    id: 'rich_20k',
    name: '万贯家财',
    desc: '持有金币达到 20000',
    reward: 800,
    icon: '👑',
    test: (s) => s.coins >= 20000,
  },
  {
    id: 'collector',
    name: '传奇收藏家',
    desc: '购买并拥有全部卡牌皮肤',
    reward: 1500,
    icon: '💎',
    test: (s) => s.skins.length >= 7,
  },
  {
    id: 'survivor_5w',
    name: '周旋五周',
    desc: '在困难考验下存活 5 周',
    reward: 600,
    icon: '⏳',
    test: (s) => s.day >= 29,
  },
  {
    id: 'defeated',
    name: '命运落幕',
    desc: '因交不起馆租而告别',
    reward: 0,
    icon: '🕯️',
    test: (s) => s.defeated,
  },
  {
    id: 'cheater',
    name: '偷天换日',
    desc: '使用作弊菜单创造金币',
    reward: 0,
    icon: '😈',
    test: (s) => s.cheatUsed,
  },
];

export const achievementById = (id: string): AchievementDef =>
  ACHIEVEMENTS.find((a) => a.id === id) ?? ACHIEVEMENTS[0];
