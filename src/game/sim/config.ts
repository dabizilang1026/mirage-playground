import type { Difficulty, GameKey } from './types';

export interface DifficultyInfo {
  id: Difficulty;
  label: string;
  desc: string;
  startCoins: number;
  rent: number;
  icon: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyInfo> = {
  easy: {
    id: 'easy',
    label: '轻松',
    desc: '没有租金，纯粹放松，适合体验故事',
    startCoins: 1500,
    rent: 0,
    icon: '🌿',
  },
  normal: {
    id: 'normal',
    label: '正常',
    desc: '每周缴纳 800 金币租金，略有压力',
    startCoins: 1200,
    rent: 800,
    icon: '⚔️',
  },
  hard: {
    id: 'hard',
    label: '困难',
    desc: '每周缴纳 1800 金币租金，步步惊心',
    startCoins: 800,
    rent: 1800,
    icon: '🔥',
  },
  cheat: {
    id: 'cheat',
    label: '作弊',
    desc: '按轻松模式开局，但拥有作弊菜单',
    startCoins: 1500,
    rent: 0,
    icon: '🃏',
  },
};

export const BASE_ENTRY: Record<GameKey, number> = {
  cleaning: 0,
  blackjack: 50,
  rps: 30,
  sword: 80,
  roulette: 300,
  tarot: 100,
};

export interface GameInfo {
  key: GameKey;
  name: string;
  tagline: string;
  desc: string;
  icon: string;
  scene: string;
  rules: string;
}

export const GAMES: GameInfo[] = [
  {
    key: 'cleaning',
    name: '拾光清扫',
    tagline: '轻松赚金',
    desc: '把四种颜色的杂物放进对应垃圾桶，每一件正确都能拿到金币。',
    icon: '🧹',
    scene: 'CleaningScene',
    rules: `
      <ul>
        <li>房间里散落着四种颜色的杂物，每种杂物要放进对应颜色的垃圾桶。</li>
        <li>按住杂物拖到垃圾桶上松手即可分类；放对一件 +2 金币，放错没有奖励。</li>
        <li>把全部 16 件杂物处理完即结束，一件不错会触发“一尘不染”。</li>
      </ul>
    `,
  },
  {
    key: 'blackjack',
    name: '二十一点',
    tagline: '殿堂牌桌',
    desc: '接近 21 点，和庄家一决胜负。最经典也最优雅的牌桌游戏。',
    icon: '♠',
    scene: 'BlackjackScene',
    rules: `
      <ul>
        <li>目标是让手牌点数尽量接近 21 点，但不能超过 21 点（超过即爆牌输掉）。</li>
        <li>A 算 1 或 11 点，J/Q/K 算 10 点，其他按牌面算。</li>
        <li>可选“要牌”继续拿牌、“停牌”结束回合、“双倍投入”加倍后只补一张。</li>
        <li>庄家点数不足 17 时会持续补牌；自然二十一点（两张牌 21 点）按 2.5 倍结算，普通获胜 2 倍，平局退回投入。</li>
      </ul>
    `,
  },
  {
    key: 'rps',
    name: '投票猜拳',
    tagline: '神秘木箱',
    desc: '木箱里有随机数量的石头剪刀布卡牌，各持三张轮流出牌对决。',
    icon: '📦',
    scene: 'RpsScene',
    rules: `
      <ul>
        <li>木箱里随机装着 9 张手势卡（石头/剪刀/布数量随机，开局会公开）。</li>
        <li>双方各从箱中拿到 3 张手牌，逐轮各出一张：石头胜剪刀、剪刀胜布、布胜石头。</li>
        <li>赢下任意一轮就带走全部投入金；打平则用下一张继续，三张全平就是平局。</li>
      </ul>
    `,
  },
  {
    key: 'sword',
    name: '生死剑',
    tagline: '飞剑赌局',
    desc: '六孔投金，三剑齐飞。剑刃入孔为死，剑柄入孔为生，二十倍结算。',
    icon: '🗡️',
    scene: 'SwordScene',
    rules: `
      <ul>
        <li>先在 6 个洞口拖入金币（总额至少 80），倒计时结束后三把剑依次射向洞口。</li>
        <li>每把剑约 22% 概率命中洞口；剑刃入孔为“死”，剑柄入孔为“生”，两种概率相同。</li>
        <li>死：该孔投入金币 ×20 输给对方；生：对方按 ×20 赔付给你。未命中的洞口投入原样退回。</li>
      </ul>
    `,
  },
  {
    key: 'roulette',
    name: '生死转盘',
    tagline: '高额对决',
    desc: '左轮、暗箱、红心排序。命中匹配差越多，开枪次数越多。',
    icon: '🔫',
    scene: 'RouletteScene',
    rules: `
      <ul>
        <li>基础投入金 300 起。双方各选 0-6 颗子弹装入自己的左轮，随后两把枪一起放入暗箱。</li>
        <li>红桃 A-6：双方先秘密排列，随后揭晓公开排列；匹配多的一方成为枪手。</li>
        <li>枪手随机取一把枪，按“双方匹配差”连开相应枪数：成功开火即获胜；未开火或匹配相同则为平局。</li>
      </ul>
    `,
  },
  {
    key: 'tarot',
    name: '命运塔罗',
    tagline: '占卜对决',
    desc: '十三张塔罗加一张大王，正逆随机。轮流翻牌，比分数定输赢。',
    icon: '🔮',
    scene: 'TarotScene',
    rules: `
      <ul>
        <li>黑桃 A-K 与一张大王随机正逆铺开（正逆在翻牌前保密，卡背看不出端倪）。</li>
        <li>双方轮流翻牌、各翻两张：正位为你加分，逆位为对手加分，J=11、Q=12、K=13。</li>
        <li>翻到大王立即定胜负：正位你胜，逆位你负；没有大王则两张翻完后比总分。</li>
      </ul>
    `,
  },
];

export const GAME_MAP: Record<GameKey, GameInfo> = Object.fromEntries(
  GAMES.map((g) => [g.key, g]),
) as Record<GameKey, GameInfo>;

export const WEEK_LENGTH = 7;

export const RENT_NAMES = ['每周馆租', '场馆维护金', '占卜台租'];

export const APP_TITLE = '幻境游乐场';
export const APP_SUBTITLE = '命运试炼馆';
