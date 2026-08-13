import {
  ACHIEVEMENTS,
  achievementById,
} from '../game/sim/achievements';
import {
  APP_SUBTITLE,
  APP_TITLE,
  BASE_ENTRY,
  DIFFICULTIES,
  GAMES,
  GAME_MAP,
} from '../game/sim/config';
import { SKINS, skinById } from '../game/sim/skins';
import { daysUntilRent, weekOf } from '../game/sim/saves';
import type {
  Difficulty,
  GameKey,
  SaveData,
} from '../game/sim/types';
import { audio } from '../game/sim/audio';
import {
  confirmModal,
  el,
  escapeHtml,
  fmtCoins,
  modal,
  toast,
  $,
} from './dom';
import type { ShellBridge } from '../game/director';

export interface ShellCallbacks {
  onConfirmAdult: () => void;
  onOpenSave: (id: string) => void;
  onCreateSave: (name: string, diff: Difficulty) => string | null;
  onDeleteSave: (id: string) => void;
  onPlay: (key: GameKey) => void;
  onBackToSaves: () => void;
  onBuySkin: (id: string) => string | null;
  onEquipSkin: (id: string) => void;
  onCheatAdd: (amount: number) => void;
  onLeaveGame: () => void;
}

const diffBadge = (d: Difficulty): string =>
  `<span class="badge diff-${d}">${DIFFICULTIES[d].icon} ${DIFFICULTIES[d].label}</span>`;

export class Shell implements ShellBridge {
  private cb: ShellCallbacks;
  private currentKey: GameKey | null = null;
  private activeModal: { close: () => void } | null = null;

  constructor(cb: ShellCallbacks) {
    this.cb = cb;
  }

  showTitle(): void {
    document.body.dataset.scene = 'title';
    const root = $('#shell-root');
    root!.innerHTML = '';
    const screen = el(
      'div',
      'screen title-screen',
      `
        <div class="title-smoke s-left"></div>
        <div class="title-smoke s-right"></div>
        <div class="title-suits">
          <span class="suit s1">♠</span>
          <span class="suit s2">♥</span>
          <span class="suit s3">♦</span>
          <span class="suit s4">♣</span>
          <span class="suit s5">♠</span>
          <span class="suit s6">♥</span>
        </div>
        <div class="title-wheel">
          <span class="w-suit w1">♠</span>
          <span class="w-suit w2">♥</span>
          <span class="w-suit w3">♦</span>
          <span class="w-suit w4">♣</span>
          <i class="wheel-core"></i>
        </div>
        <div class="title-content">
          <div class="title-kicker"><i></i>HIGH-STAKES ENTERTAINMENT HALL<i></i></div>
          <h1 class="game-title">${APP_TITLE}</h1>
          <div class="title-rule"></div>
          <p class="game-subtitle">${APP_SUBTITLE} · 命运在此洗牌 · 只论勇气</p>
          <button class="btn btn-xl enter-btn">踏入会场</button>
          <p class="title-disclaimer">虚构娱乐场景 · 不涉及真实货币 · 仅供成年人</p>
        </div>
      `,
    );
    root!.appendChild(screen);
    const enter = screen.querySelector<HTMLButtonElement>('.enter-btn')!;
    enter.addEventListener('click', () => this.showAgeGate());
  }

  private showAgeGate(): void {
    audio.click();
    const body = el(
      'div',
      'age-gate',
      `
        <div class="age-icon">🕯️</div>
        <h3>游客须知</h3>
        <p>本作是虚构的休闲游艺合集，所有金币均为游戏内虚拟货币：</p>
        <ul class="age-list">
          <li>不涉及真实货币，不能兑换任何现实财物；</li>
          <li>不含真实赌博机制，胜负均为虚构娱乐；</li>
          <li>含紧张惊险的虚构情节，<strong>未满 18 周岁禁止进入</strong>；</li>
          <li>请理性游玩，娱乐适度。</li>
        </ul>
      `,
    );
    modal({
      title: '进入前请确认',
      body,
      width: 520,
      actions: [
        {
          label: '我已满 18 岁，确认进入',
          cls: 'btn-gold',
          onClick: (close) => {
            close();
            this.cb.onConfirmAdult();
          },
        },
      ],
    });
  }

  showSaveSelect(): void {
    document.body.dataset.scene = 'saves';
    const root = $('#shell-root');
    root!.innerHTML = '';
    const screen = el(
      'div',
      'screen saves-screen',
      `
        <div class="saves-head">
          <div class="saves-title">
            <div class="saves-kicker">${APP_TITLE}</div>
            <h2>选择档案</h2>
          </div>
          <div class="saves-note">每个档案是一条独立的命运线</div>
        </div>
      `,
    );
    const grid = el('div', 'saves-grid');
    screen.appendChild(grid);
    root!.appendChild(screen);
    this.renderSaveList(grid);
  }

  private renderSaveList(grid: HTMLElement): void {
    grid.innerHTML = '';
    const saves = director.saves.list().sort((a, b) => b.updatedAt - a.updatedAt);
    for (const s of saves) {
      const card = el(
        'div',
        `save-card${s.defeated ? ' defeated' : ''}`,
        `
          <div class="save-card-top">
            <span class="save-name">${escapeHtml(s.name)}</span>
            ${diffBadge(s.difficulty)}
          </div>
          <div class="save-meta">
            <span>🪙 ${fmtCoins(s.coins)}</span>
            <span>第 ${s.day} 天 · 第 ${weekOf(s.day)} 周</span>
          </div>
          <div class="save-stats">
            <span>${s.stats.played} 场</span>
            <span>${s.stats.wins} 胜</span>
            <span>🏆 ${s.achievements.length}</span>
          </div>
          ${
            s.defeated
              ? `<div class="save-defeated-stamp">命运落幕</div>`
              : ''
          }
        `,
      );
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.save-delete')) return;
        audio.click();
        this.cb.onOpenSave(s.id);
      });
      const del = el('button', 'save-delete', '🗑');
      del.title = '删除档案';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.click();
        confirmModal(
          '删除档案',
          `确定删除「${escapeHtml(s.name)}」吗？删除后无法恢复。`,
          () => {
            this.cb.onDeleteSave(s.id);
            this.renderSaveList(grid);
          },
          '永久删除',
          true,
        );
      });
      card.appendChild(del);
      grid.appendChild(card);
    }

    const create = el(
      'div',
      'save-card create-card',
      `
        <div class="create-plus">＋</div>
        <div class="create-label">新建档案</div>
        <div class="create-hint">开启一条新的命运线</div>
      `,
    );
    create.addEventListener('click', () => {
      audio.click();
      this.showCreateModal();
    });
    grid.appendChild(create);
  }

  private showCreateModal(): void {
    const body = el('div', 'create-body');
    const nameLabel = el('div', 'field-label', '档案名');
    const nameInput = el('input', 'text-input') as HTMLInputElement;
    nameInput.maxLength = 16;
    nameInput.placeholder = '例如：夜行者';
    body.append(nameLabel, nameInput);

    const diffLabel = el('div', 'field-label diff-label', '选择难度');
    body.appendChild(diffLabel);
    const diffGrid = el('div', 'diff-grid');
    let selected: Difficulty = 'easy';
    const cards: Array<{ root: HTMLElement; d: Difficulty }> = [];
    for (const d of ['easy', 'normal', 'hard', 'cheat'] as Difficulty[]) {
      const info = DIFFICULTIES[d];
      const card = el(
        'div',
        `diff-card${d === selected ? ' selected' : ''}`,
        `
          <div class="diff-icon">${info.icon}</div>
          <div class="diff-name">${info.label}</div>
          <div class="diff-desc">${info.desc}</div>
          <div class="diff-start">初始 ${fmtCoins(info.startCoins)} 金币</div>
        `,
      );
      card.addEventListener('click', () => {
        audio.click();
        selected = d;
        for (const c of cards) c.root.classList.toggle('selected', c.d === d);
      });
      diffGrid.appendChild(card);
      cards.push({ root: card, d });
    }
    body.appendChild(diffGrid);

    const err = el('div', 'form-error', '');
    body.appendChild(err);
    let created = false;
    const finish = (): void => {
      if (created) return;
      const msg = this.cb.onCreateSave(nameInput.value, selected);
      if (msg) {
        err.textContent = msg;
        return;
      }
      created = true;
      audio.win();
    };
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish();
    });
    modal({
      title: '新建档案',
      body,
      width: 640,
      actions: [
        {
          label: '创建并进入',
          cls: 'btn-gold',
          onClick: (close) => {
            finish();
            if (created) {
              close();
              const s = director.current;
              if (s) this.cb.onOpenSave(s.id);
            }
          },
        },
      ],
    });
  }

  showHub(): void {
    const save = director.current;
    if (!save) return;
    document.body.dataset.scene = 'hub';
    const root = $('#shell-root');
    root!.innerHTML = '';
    const screen = el('div', 'screen hub-screen');

    const header = el('div', 'hub-header');
    const brand = el(
      'div',
      'hub-brand',
      `<span class="hub-brand-mark">✦</span> ${APP_TITLE}`,
    );
    const status = el('div', 'hub-status');
    status.innerHTML = `
      <span class="chip coin-chip" id="hud-coins">🪙 ${fmtCoins(save.coins)}</span>
      <span class="chip day-chip">第 ${save.day} 天 · 第 ${weekOf(save.day)} 周</span>
      <span class="chip rent-chip">馆租 ${this.rentText()}</span>
    `;
    const saveBtn = el('button', 'btn btn-ghost', '📜 存档');
    saveBtn.addEventListener('click', () => {
      audio.click();
      this.cb.onBackToSaves();
    });
    header.append(brand, status, saveBtn);
    screen.appendChild(header);

    const hero = el(
      'div',
      'hub-hero',
      `
        <div class="hub-hero-title">欢迎回来，<strong>${escapeHtml(save.name)}</strong></div>
        <div class="hub-hero-sub">今天想去哪一张游艺台？</div>
      `,
    );
    screen.appendChild(hero);

    const games = el('div', 'hub-games');
    for (const g of GAMES) {
      const stats = save.stats;
      const wins =
        g.key === 'cleaning'
          ? `${stats.cleaningCorrect} 件`
          : `${stats.wins} 胜`;
      const entry =
        BASE_ENTRY[g.key] > 0
          ? `投入金 ${fmtCoins(BASE_ENTRY[g.key])} 起`
          : '无需投入 · 轻松赚金';
      const card = el(
        'div',
        `game-card game-${g.key}`,
        `
          <div class="game-card-icon">${g.icon}</div>
          <div class="game-card-name">${g.name}</div>
          <div class="game-card-tag">${g.tagline}</div>
          <div class="game-card-desc">${g.desc}</div>
          <div class="game-card-meta">
            <span>${entry}</span>
            <span>${wins}</span>
          </div>
          <button class="btn btn-gold game-enter">进入游艺</button>
        `,
      );
      card.querySelector<HTMLButtonElement>('.game-enter')!.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          audio.click();
          if (save.defeated) return;
          this.cb.onPlay(g.key);
        },
      );
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.game-enter')) return;
        audio.click();
        if (save.defeated) return;
        this.cb.onPlay(g.key);
      });
      games.appendChild(card);
    }
    screen.appendChild(games);

    const foot = el('div', 'hub-foot');
    const achBtn = el('button', 'btn btn-ghost btn-lg', '🏆 成就');
    achBtn.addEventListener('click', () => {
      audio.click();
      this.showAchievements();
    });
    const shopBtn = el('button', 'btn btn-ghost btn-lg', '🎴 卡牌商城');
    shopBtn.addEventListener('click', () => {
      audio.click();
      this.showShop();
    });
    foot.append(achBtn, shopBtn);
    if (save.difficulty === 'cheat') {
      const cheatBtn = el('button', 'btn btn-ghost btn-lg cheat-btn', '😈 作弊菜单');
      cheatBtn.addEventListener('click', () => {
        audio.click();
        this.showCheat();
      });
      foot.appendChild(cheatBtn);
    }
    const disc = el(
      'p',
      'hub-disclaimer',
      '虚拟货币仅供娱乐 · 不涉及真实金钱 · 未满 18 周岁请勿参与',
    );
    foot.appendChild(disc);
    screen.appendChild(foot);
    root!.appendChild(screen);
  }

  private rentText(): string {
    const save = director.current;
    if (!save) return '';
    const { daysLeft, rent } = director.rentInfo();
    if (rent <= 0) return '无需缴纳';
    if (daysLeft <= 0) return '今日结算';
    return `${daysLeft} 天后 · ${fmtCoins(rent)}`;
  }

  refreshHud(): void {
    const save = director.current;
    if (!save) return;
    const c = document.getElementById('hud-coins');
    if (c) c.innerHTML = `🪙 ${fmtCoins(save.coins)}`;
    const day = document.querySelector('.day-chip');
    if (day) day.textContent = `第 ${save.day} 天 · 第 ${weekOf(save.day)} 周`;
    const rent = document.querySelector('.rent-chip');
    if (rent) rent.textContent = `馆租 ${this.rentText()}`;
  }

  showDefeat(save: SaveData): void {
    document.body.dataset.scene = 'defeat';
    const root = $('#shell-root');
    root!.innerHTML = '';
    const screen = el(
      'div',
      'screen defeat-screen',
      `
        <div class="defeat-candle">🕯️</div>
        <h2 class="defeat-title">命运落幕</h2>
        <p class="defeat-lead">「${escapeHtml(save.name)}」的旅程在此终止，只能查看这份总结。</p>
      `,
    );
    const summary = el('div', 'defeat-summary');
    const rows: Array<[string, string]> = [
      ['难度', `${DIFFICULTIES[save.difficulty].icon} ${DIFFICULTIES[save.difficulty].label}`],
      ['存活天数', `${save.defeatedDay || save.day} 天（第 ${weekOf(save.defeatedDay || save.day)} 周）`],
      ['最终金币', `🪙 ${fmtCoins(Math.max(0, save.coins))}`],
      ['游艺场次', `${save.stats.played} 场`],
      ['胜负纪录', `${save.stats.wins} 胜 / ${save.stats.losses} 负 / ${save.stats.draws} 平`],
      ['成就', `🏆 ${save.achievements.length} 个`],
      ['累计获得', `🪙 ${fmtCoins(save.totalEarned)}`],
      ['最高持有', `🪙 ${fmtCoins(save.stats.maxCoins)}`],
    ];
    for (const [k, v] of rows) {
      summary.appendChild(
        el('div', 'defeat-row', `<span>${k}</span><strong>${v}</strong>`),
      );
    }
    screen.appendChild(summary);
    const foot = el('div', 'defeat-actions');
    const back = el('button', 'btn btn-gold btn-lg', '返回存档列表');
    back.addEventListener('click', () => {
      audio.click();
      this.cb.onBackToSaves();
    });
    const del = el('button', 'btn btn-danger btn-lg', '删除此档案');
    del.addEventListener('click', () => {
      audio.click();
      confirmModal(
        '删除档案',
        `确定删除「${escapeHtml(save.name)}」吗？这份总结也会消失。`,
        () => {
          this.cb.onDeleteSave(save.id);
          this.showSaveSelect();
        },
        '永久删除',
        true,
      );
    });
    foot.append(back, del);
    screen.appendChild(foot);
    root!.appendChild(screen);
  }

  openGame(key: GameKey): void {
    this.currentKey = key;
    const save = director.current;
    if (!save) return;
    const game = GAME_MAP[key];
    const root = $('#game-root');
    root!.classList.remove('hidden');
    root!.innerHTML = '';
    const container = el(
      'div',
      'game-container',
      `
      <div class="game-topbar">
          <button class="btn btn-ghost game-back">← 退出</button>
          <button class="btn btn-ghost game-rules">📖 规则</button>
          <div class="game-title-chip">${game.icon} ${game.name}</div>
          <div class="game-top-right">
            <span class="chip coin-chip" id="hud-coins">🪙 ${fmtCoins(save.coins)}</span>
            <span class="chip day-chip">第 ${save.day} 天</span>
          </div>
        </div>
      `,
    );
    container.id = 'game-container';
    const back = container.querySelector<HTMLButtonElement>('.game-back')!;
    back.addEventListener('click', () => {
      audio.click();
      confirmModal(
        '退出本局',
        '退出将放弃当前进度：不计胜负、不推进时间，金币不受影响。确定退出吗？',
        () => this.cb.onLeaveGame(),
        '退出本局',
        true,
      );
    });
    const rulesBtn = container.querySelector<HTMLButtonElement>('.game-rules')!;
    rulesBtn.addEventListener('click', () => {
      audio.click();
      const body = el('div', 'game-rules-body', game.rules);
      modal({
        title: `${game.name} · 玩法规则`,
        body,
        width: 560,
      });
    });
    root!.appendChild(container);
    const shellRoot = document.getElementById('shell-root');
    shellRoot?.classList.add('hidden');
  }

  closeGame(): void {
    this.currentKey = null;
    const root = $('#game-root');
    root!.classList.add('hidden');
    root!.innerHTML = '';
    const shellRoot = document.getElementById('shell-root');
    shellRoot?.classList.remove('hidden');
  }

  gameRootHasScene(): boolean {
    const root = document.getElementById('game-container');
    return !!root?.querySelector('.scene-root');
  }

  private showShop(): void {
    const save = director.current;
    if (!save) return;
    this.activeModal?.close();
    const body = el('div', 'shop-body');
    const head = el(
      'div',
      'shop-head',
      `当前金币：🪙 ${fmtCoins(save.coins)} · 皮肤会替换所有牌类游艺的卡背`,
    );
    body.appendChild(head);
    const grid = el('div', 'shop-grid');
    for (const skin of SKINS) {
      const owned = save.skins.includes(skin.id);
      const equipped = save.equippedSkin === skin.id;
      const card = el(
        'div',
        `skin-card${owned ? ' owned' : ''}${equipped ? ' equipped' : ''}`,
        `
          <div class="skin-preview">
            <div class="skin-preview-item">
              <div class="mini-card skin-${skin.id}"><div class="card-face"><span class="preview-rank">A</span><i class="preview-suit">♠</i></div></div>
              <span class="skin-preview-label">正面</span>
            </div>
            <div class="skin-preview-item">
              <div class="mini-card skin-${skin.id}"><div class="card-back"><span>${skin.emblem}</span></div></div>
              <span class="skin-preview-label">背面</span>
            </div>
          </div>
          <div class="skin-info">
            <div class="skin-name">${skin.name}</div>
            <div class="skin-tier">${skin.tier}</div>
            <div class="skin-desc">${skin.desc}</div>
          </div>
        `,
      );
      const btn = el<HTMLButtonElement>('button', 'btn skin-btn', '');
      if (equipped) {
        btn.className = 'btn btn-ghost skin-btn';
        btn.textContent = '使用中';
        btn.disabled = true;
      } else if (owned) {
        btn.className = 'btn btn-gold skin-btn';
        btn.textContent = '装备';
        btn.addEventListener('click', () => {
          audio.click();
          this.cb.onEquipSkin(skin.id);
          this.showShop();
        });
      } else {
        btn.className = `btn ${save.coins >= skin.price ? 'btn-gold' : 'btn-ghost'} skin-btn`;
        btn.innerHTML = `🪙 ${fmtCoins(skin.price)} 购买`;
        btn.addEventListener('click', () => {
          audio.click();
          const err = this.cb.onBuySkin(skin.id);
          if (err) {
            toast(err, '⚠️');
          } else {
            audio.cashout();
            toast(`已购买「${skin.name}」`, '🎴');
            this.showShop();
          }
        });
      }
      card.appendChild(btn);
      grid.appendChild(card);
    }
    body.appendChild(grid);
    this.activeModal = modal({ title: '卡牌商城', body, width: 720 });
  }

  private showAchievements(): void {
    const save = director.current;
    if (!save) return;
    const body = el('div', 'ach-body');
    const grid = el('div', 'ach-grid');
    for (const a of ACHIEVEMENTS) {
      const unlocked = save.achievements.includes(a.id);
      const card = el(
        'div',
        `ach-card${unlocked ? ' unlocked' : ' locked'}`,
        `
          <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
          <div class="ach-info">
            <div class="ach-name">${a.name}</div>
            <div class="ach-desc">${a.desc}</div>
            <div class="ach-reward">${a.reward > 0 ? `奖励 ${fmtCoins(a.reward)} 金币` : '纪念成就'}</div>
          </div>
        `,
      );
      grid.appendChild(card);
    }
    body.appendChild(grid);
    modal({
      title: `成就 · ${save.achievements.length}/${ACHIEVEMENTS.length}`,
      body,
      width: 720,
    });
  }

  private showCheat(): void {
    const body = el('div', 'cheat-body');
    body.innerHTML = `
      <p class="cheat-warn">这是作弊模式专属菜单。获得的金币会计入存档，也会留下「偷天换日」成就。</p>
      <div class="cheat-amount-row">
        <button class="btn btn-ghost cheat-q">1000</button>
        <button class="btn btn-ghost cheat-q">10000</button>
        <button class="btn btn-ghost cheat-q">100000</button>
      </div>
    `;
    const input = el('input', 'text-input cheat-input') as HTMLInputElement;
    input.type = 'number';
    input.min = '1';
    input.placeholder = '输入要添加的金币数量';
    body.appendChild(input);
    for (const q of body.querySelectorAll<HTMLButtonElement>('.cheat-q')) {
      q.addEventListener('click', () => {
        audio.click();
        input.value = q.textContent!;
      });
    }
    modal({
      title: '作弊菜单',
      body,
      width: 480,
      actions: [
        {
          label: '添加金币',
          cls: 'btn-gold',
          onClick: (close) => {
            const n = parseInt(input.value, 10);
            if (!Number.isFinite(n) || n <= 0) {
              toast('请输入有效数量', '⚠️');
              return;
            }
            audio.cashout();
            this.cb.onCheatAdd(n);
            close();
          },
        },
      ],
    });
  }
}

// director 是延迟导入，避免循环依赖
import { director } from '../game/director';
