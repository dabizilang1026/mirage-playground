import Phaser from 'phaser';
import { director } from '../../game/director';
import { audio } from '../../game/sim/audio';
import { chance, rndInt } from '../../game/sim/rng';
import {
  clearSceneRoot,
  resultOverlay,
  stakePanel,
  type StakePanel,
  updateHudCoins,
} from '../../ui/gameUi';
import { $, el, fmtCoins, toast } from '../../ui/dom';
import { addEmbers } from '../fx';
import {
  domCoinBurst,
  domShockwave,
  domSparkle,
  domSword,
  fxViewport,
  winFlash,
} from '../../ui/domFx';
import { createAiAvatar, type AiAvatar } from '../../ui/aiAvatar';

const DENOMS = [1, 5, 20, 50];
const MIN_TOTAL = 80;
const ROUND_TIME = 30;

interface SwordResult {
  hit: boolean;
  hole: number;
  type: 'blade' | 'hilt';
}

export class SwordScene extends Phaser.Scene {
  private stake = 80;
  private state: 'stake' | 'placing' | 'locked' | 'settled' = 'stake';
  private root: HTMLElement | null = null;
  private stakePanel: StakePanel | null = null;
  private playerBets: number[] = Array(6).fill(0);
  private aiBets: number[] = Array(6).fill(0);
  private deposits: number[][] = Array.from({ length: 6 }, () => []);
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private secondsLeft = ROUND_TIME;
  private extraTime = 0;
  private pendingDelta = 0;
  private ai: AiAvatar | null = null;

  constructor() {
    super('SwordScene');
  }

  create(): void {
    document.body.dataset.scene = 'sword';
    addEmbers(this, 16);
    const container = document.getElementById('game-container');
    if (!container) return;
    clearSceneRoot(container);
    this.root = el('div', 'scene-root sword-root');
    container.appendChild(this.root);
    this.playerBets = Array(6).fill(0);
    this.aiBets = Array(6).fill(0);
    this.deposits = Array.from({ length: 6 }, () => []);
    this.timerEvent = null;
    this.state = 'stake';
    this.pendingDelta = 0;
    this.buildStake();
  }

  private buildStake(): void {
    if (!this.root) return;
    this.root.classList.add('stake-phase');
    const save = director.save;
    this.root.innerHTML = `
      <div class="sword-stage">
        <div class="sword-rule">
          <h3>生死剑 · 六孔飞剑</h3>
          <p>先在六个洞口投入金币（总投入至少 ${MIN_TOTAL}），倒计时结束后三剑齐飞。</p>
          <p><span class="sword-blade-tag">剑刃入孔为「死」</span>：该孔金币 ×20 输给对方；
          <span class="sword-hilt-tag">剑柄入孔为「生」</span>：对方按 ×20 赔付给你。</p>
        </div>
      </div>
    `;
    this.stakePanel = stakePanel({
      min: MIN_TOTAL,
      coins: save.coins,
      chips: [80, 200, 500],
      label: '本局总投入金（最少）',
      step: 20,
    });
    const wrap = el('div', 'stake-wrap');
    wrap.appendChild(this.stakePanel.root);
    const start = el('button', 'btn btn-gold btn-lg', '进入孔盘');
    start.addEventListener('click', () => {
      audio.click();
      const v = this.stakePanel!.getValue();
      if (director.save.coins < v) {
        toast('金币不足', '⚠️');
        return;
      }
      this.stake = v;
      this.startPlacing();
    });
    wrap.appendChild(start);
    this.root.appendChild(wrap);
  }

  private startPlacing(): void {
    this.root?.classList.remove('stake-phase');
    this.state = 'placing';
    this.secondsLeft = ROUND_TIME;
    this.aiBets = this.makeAiBets();
    const save = director.save;
    const aiTotal = this.aiBets.reduce((a, b) => a + b, 0);
    this.root!.innerHTML = `
      <div class="sword-stage sword-playing">
        <div class="sword-head">
          <div class="sword-timer">
            <div class="sword-timer-ring" id="sword-timer-ring">
              <span id="sword-timer-num">${ROUND_TIME}</span>
            </div>
            <div class="sword-timer-label">投入倒计时</div>
          </div>
          <div class="sword-info">
            <div class="sword-min">总投入至少 ${MIN_TOTAL} 金币</div>
            <div class="sword-mine">我的总投入：<strong id="sword-mine">0</strong></div>
            <div class="sword-ai">对手总投入：<strong>${fmtCoins(aiTotal)}</strong>（位置保密）</div>
          </div>
          <button class="btn btn-gold btn-lg" id="sword-lock" disabled>停止投入</button>
        </div>
        <div class="sword-holes" id="sword-holes">
          ${Array.from({ length: 6 }, (_, i) => `
            <div class="hole" data-hole="${i}">
              <div class="hole-num">${i + 1}</div>
              <div class="hole-stack" id="hole-stack-${i}"></div>
              <div class="hole-bet" id="hole-bet-${i}">0</div>
              <button class="hole-undo" id="hole-undo-${i}" title="取回最后一枚">✕</button>
              <div class="hole-fate" id="hole-fate-${i}"></div>
            </div>
          `).join('')}
        </div>
        <div class="sword-msg" id="sword-msg">从托盘拖拽金币到洞口 · 每个洞口可重复放入</div>
        <div class="sword-tray" id="sword-tray">
          <div class="sword-tray-label">我的金币托盘 · 余额 ${fmtCoins(save.coins)}</div>
          <div class="sword-chips">
            ${DENOMS.map(
              (d) => `<button class="denom-chip" data-denom="${d}"><span class="denom-coin">🪙</span>×${d}</button>`,
            ).join('')}
          </div>
        </div>
      </div>
    `;
    const lock = $('#sword-lock', this.root!)!;
    lock.addEventListener('click', () => {
      audio.click();
      this.lockBets();
    });
    for (const chip of this.root!.querySelectorAll<HTMLButtonElement>('.denom-chip')) {
      const amount = parseInt(chip.dataset.denom ?? '1', 10);
      chip.addEventListener('pointerdown', (e) => this.startDrag(e, amount));
    }
    for (let i = 0; i < 6; i++) {
      $('#hole-undo-' + i, this.root!)!.addEventListener('click', () => this.undo(i));
    }
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: ROUND_TIME - 1,
      callback: () => this.tick(),
    });
    this.updateTimer();
    this.updateBets();
    this.updateHud();
    this.ai = createAiAvatar('剑侍');
    const head = $('.sword-head', this.root!);
    head?.appendChild(this.ai.root);
    this.ai.setMood('thinking', '选洞中…');
  }

  private makeAiBets(): number[] {
    const budget = Math.min(1600, Math.max(400, Math.round((this.stake * 4) / 100) * 100));
    const bets = Array(6).fill(0);
    const chosen = new Set<number>();
    while (chosen.size < 4) chosen.add(rndInt(0, 5));
    let used = 0;
    for (const i of chosen) {
      const max = Math.min(Math.floor((budget - used) / 20), 40);
      if (max <= 0) break;
      const amount = rndInt(2, max) * 20;
      bets[i] = amount;
      used += amount;
    }
    return bets;
  }

  private startDrag(e: PointerEvent, amount: number): void {
    if (this.state !== 'placing') return;
    e.preventDefault();
    audio.click();
    const save = director.save;
    const totalPlaced = this.playerBets.reduce((a, b) => a + b, 0);
    if (totalPlaced + amount > save.coins) {
      toast('托盘金币不足', '⚠️');
      return;
    }
    const ghost = el('div', 'drag-ghost', `<span>🪙</span>×${amount}`);
    document.body.appendChild(ghost);
    const move = (ev: PointerEvent): void => {
      ghost.style.left = `${ev.clientX}px`;
      ghost.style.top = `${ev.clientY}px`;
      this.highlightHole(ev.clientX, ev.clientY);
    };
    const up = (ev: PointerEvent): void => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      ghost.remove();
      this.clearHoleHighlights();
      const hole = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest<HTMLElement>('.hole');
      if (!hole) return;
      const idx = parseInt(hole.dataset.hole ?? '0', 10);
      this.deposit(idx, amount);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
  }

  private highlightHole(x: number, y: number): void {
    this.clearHoleHighlights();
    const hole = document.elementFromPoint(x, y)?.closest<HTMLElement>('.hole');
    if (hole) hole.classList.add('drag-hover');
  }

  private clearHoleHighlights(): void {
    this.root?.querySelectorAll('.hole').forEach((h) => h.classList.remove('drag-hover'));
  }

  private deposit(idx: number, amount: number): void {
    if (this.state !== 'placing') return;
    const totalPlaced = this.playerBets.reduce((a, b) => a + b, 0);
    if (totalPlaced + amount > director.save.coins) return;
    this.playerBets[idx] += amount;
    this.deposits[idx].push(amount);
    audio.coin();
    const holeEl = $(`#hole-stack-${idx}`, this.root!);
    if (holeEl) {
      const coin = el('span', 'hole-coin', '🪙');
      holeEl.appendChild(coin);
      requestAnimationFrame(() => coin.classList.add('drop'));
    }
    const hole = $(`[data-hole="${idx}"]`, this.root!);
    if (hole) {
      hole.classList.remove('pulse');
      void hole.offsetWidth;
      hole.classList.add('pulse');
    }
    this.updateBets();
    this.updateHud();
  }

  private undo(idx: number): void {
    if (this.state !== 'placing') return;
    const last = this.deposits[idx].pop();
    if (!last) return;
    this.playerBets[idx] -= last;
    audio.click();
    const stack = $(`#hole-stack-${idx}`, this.root!);
    stack?.lastElementChild?.remove();
    this.updateBets();
    this.updateHud();
  }

  private updateBets(): void {
    for (let i = 0; i < 6; i++) {
      const b = $(`#hole-bet-${i}`, this.root!);
      if (b) b.textContent = fmtCoins(this.playerBets[i]);
    }
  }

  private updateHud(): void {
    const mine = this.playerBets.reduce((a, b) => a + b, 0);
    const m = $('#sword-mine', this.root!);
    if (m) m.textContent = fmtCoins(mine);
    const lock = $('#sword-lock', this.root!) as HTMLButtonElement | null;
    if (lock) lock.disabled = mine < MIN_TOTAL;
    updateHudCoins(this.pendingDelta - mine);
  }

  private tick(): void {
    if (this.state !== 'placing') return;
    this.secondsLeft -= 1;
    if (this.secondsLeft <= 0) {
      const total = this.playerBets.reduce((a, b) => a + b, 0);
      if (total < MIN_TOTAL && this.extraTime < 2) {
        this.extraTime += 1;
        this.secondsLeft = 15;
        if (this.timerEvent) this.timerEvent.remove(false);
        this.timerEvent = this.time.addEvent({
          delay: 1000,
          repeat: this.secondsLeft - 1,
          callback: () => this.tick(),
        });
        toast(`投入不足，追加 ${15} 秒`, '⏳');
        this.updateTimer();
        return;
      }
      this.lockBets();
      return;
    }
    this.updateTimer();
  }

  private updateTimer(): void {
    const ring = $('#sword-timer-ring', this.root!);
    const num = $('#sword-timer-num', this.root!);
    if (!ring || !num) return;
    num.textContent = String(Math.max(0, this.secondsLeft));
    const pct = Math.max(0, this.secondsLeft / ROUND_TIME);
    ring.style.background = `conic-gradient(#ffd166 ${pct * 360}deg, rgba(255,255,255,0.09) 0deg)`;
  }

  private lockBets(): void {
    if (this.state !== 'placing') return;
    const total = this.playerBets.reduce((a, b) => a + b, 0);
    if (total < MIN_TOTAL) {
      toast(`总投入至少 ${MIN_TOTAL} 金币`, '⚠️');
      return;
    }
    this.state = 'locked';
    if (this.timerEvent) this.timerEvent.remove(false);
    this.root!.querySelectorAll('.denom-chip, .hole-undo').forEach((x) => {
      (x as HTMLElement).style.pointerEvents = 'none';
    });
    const lock = $('#sword-lock', this.root!) as HTMLButtonElement | null;
    if (lock) lock.disabled = true;
    const msg = $('#sword-msg', this.root!);
    if (msg) msg.textContent = '三剑离鞘，屏住呼吸…';
    const holes = this.root!.querySelector<HTMLElement>('.sword-holes');
    holes?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    void this.wait(500).then(() => this.runSwords());
  }

  private makeSwordFates(): SwordResult[] {
    return Array.from({ length: 3 }, () => {
      if (!chance(0.22)) return { hit: false, hole: -1, type: 'blade' };
      return {
        hit: true,
        hole: rndInt(0, 5),
        type: chance(0.5) ? 'blade' : 'hilt',
      };
    });
  }

  private async runSwords(): Promise<void> {
    const fates = this.makeSwordFates();
    const vp = fxViewport();
    const w = vp.width;
    const h = vp.height;
    let hitCount = 0;
    for (let i = 0; i < fates.length; i++) {
      const fate = fates[i];
      let target: { x: number; y: number } | null = null;
      if (fate.hit) {
        const hole = this.root!.querySelector<HTMLElement>(`[data-hole="${fate.hole}"]`);
        if (hole) {
          const r = hole.getBoundingClientRect();
          target = {
            x: Math.min(w - 50, Math.max(50, r.left + r.width / 2)),
            y: Math.min(h - 50, Math.max(50, r.top + r.height / 2)),
          };
        }
      }
      await this.flySword(target, w, h, i);
      if (fate.hit && target) {
        hitCount += 1;
        this.showHit(fate, target);
        await this.wait(650);
      }
    }
    await this.wait(700);
    this.settle(fates, hitCount);
  }

  private async flySword(
    target: { x: number; y: number } | null,
    w: number,
    h: number,
    idx: number,
  ): Promise<void> {
    const fromLeft = target ? target.x >= w / 2 : idx % 2 === 0;
    const from = {
      x: fromLeft ? w + 60 : -60,
      y: h * 0.12 + Math.random() * h * 0.5,
    };
    const to = {
      x: target?.x ?? (fromLeft ? -70 : w + 70),
      y: target?.y ?? from.y + (Math.random() - 0.5) * h * 0.5,
    };
    audio.sword();
    await domSword({ from, to });
  }

  private showHit(fate: SwordResult, target: { x: number; y: number }): void {
    const color = fate.type === 'blade' ? '#ff6b6b' : '#7ee8fa';
    domSparkle(target.x, target.y, color, 30);
    domShockwave(target.x, target.y, color);
    if (fate.type === 'blade') audio.lose();
    else audio.win();
    const fateEl = $(`#hole-fate-${fate.hole}`, this.root!);
    if (fateEl) {
      fateEl.innerHTML = fate.type === 'blade' ? '💀' : '✨';
      fateEl.classList.add('show', fate.type);
    }
  }

  private settle(fates: SwordResult[], hitCount: number): void {
    if (this.state === 'settled') return;
    this.state = 'settled';
    let net = 0;
    const rows: string[] = [];
    for (let i = 0; i < 6; i++) {
      const fate = fates.find((f) => f.hit && f.hole === i);
      if (!fate) continue;
      const pb = this.playerBets[i];
      const ab = this.aiBets[i];
      const per =
        fate.type === 'blade'
          ? 20 * (ab - pb)
          : 20 * (pb - ab);
      net += per;
      rows.push(
        `<div class="settle-row ${per >= 0 ? 'pos' : 'neg'}">
          <span>洞口 ${i + 1} · ${fate.type === 'blade' ? '💀 死' : '✨ 生'}</span>
          <span>我 ${fmtCoins(pb)} / 对方 ${fmtCoins(ab)}</span>
          <strong>${per >= 0 ? '+' : ''}${fmtCoins(per)}</strong>
        </div>`,
      );
    }
    const outcome: 'win' | 'loss' | 'draw' =
      net > 0 ? 'win' : net < 0 ? 'loss' : 'draw';
    const subtitle =
      rows.length > 0
        ? `命中 ${hitCount} 剑${rows.length > 1 ? ` · ${rows.length} 孔结算` : ''}`
        : '三剑尽数落空，投入原样奉还';
    const title =
      outcome === 'win' ? '剑下生花' : outcome === 'loss' ? '剑刃归敌' : '命运握手';
    const root = this.root!;
    const panel = el(
      'div',
      'sword-settle',
      `<div class="sword-settle-title">${title}</div><div class="settle-rows">${rows.join('') || '<div class="settle-row">无命中</div>'}</div><div class="sword-settle-net ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmtCoins(net)} 金币</div>`,
    );
    root.appendChild(panel);
    if (outcome === 'win') {
      winFlash();
      domCoinBurst(window.innerWidth / 2, window.innerHeight / 2.6, 26);
      audio.cashout();
      this.ai?.setMood('angry', '可恶，剑不帮我');
    } else if (outcome === 'loss') {
      audio.lose();
      this.ai?.setMood('smug', '剑气在我这边');
    } else {
      audio.draw();
      this.ai?.setMood('neutral', '平局而已');
    }
    director.settle({
      kind: 'sword',
      outcome,
      deltaCoins: net,
      stats: { swordHitHoles: hitCount, swordAllHit: hitCount === 3 ? 1 : 0 },
      title,
      subtitle,
      detail: rows.join('') || '<div class="row"><span>命中</span><strong>0 剑</strong></div>',
    });
    if (director.save.defeated) return;
    resultOverlay({
      title,
      subtitle,
      detail: rows.join('') || '<div class="row"><span>命中</span><strong>0 剑</strong></div>',
      delta: net,
      outcome,
      onAgain: () => director.replay(),
      onExit: () => director.exitToHub(),
      againLabel: '再掷三剑',
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
