export interface Skin {
  id: string;
  name: string;
  desc: string;
  price: number;
  emblem: string;
  tier: string;
}

export const SKINS: Skin[] = [
  {
    id: 'basic',
    name: '馆内标准',
    desc: '简洁的游艺馆纹章，人手一张。',
    price: 0,
    emblem: '✦',
    tier: '基础',
  },
  {
    id: 'bronze',
    name: '青铜岁月',
    desc: '古铜浮雕边缘，带着旧时光的温润。',
    price: 300,
    emblem: '♜',
    tier: '青铜',
  },
  {
    id: 'silver',
    name: '银月辉光',
    desc: '月光银线交织成环，静谧而锋利。',
    price: 800,
    emblem: '☾',
    tier: '白银',
  },
  {
    id: 'gold',
    name: '鎏金圣殿',
    desc: '金丝盘绕、立柱纹章，贵气初显。',
    price: 1500,
    emblem: '♛',
    tier: '黄金',
  },
  {
    id: 'jade',
    name: '翡翠星仪',
    desc: '翠色罗盘与十二芒星，神秘而克制。',
    price: 2600,
    emblem: '✧',
    tier: '翡翠',
  },
  {
    id: 'dragon',
    name: '龙渊黑金',
    desc: '黑金鳞纹暗藏赤瞳，龙威隐现。',
    price: 4200,
    emblem: '❖',
    tier: '龙纹',
  },
  {
    id: 'mythic',
    name: '命运神祇',
    desc: '流动星轨与神之眼，传说级卡背。',
    price: 8888,
    emblem: '✦',
    tier: '神话',
  },
];

export const skinById = (id: string): Skin =>
  SKINS.find((s) => s.id === id) ?? SKINS[0];
