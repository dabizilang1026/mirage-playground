import Phaser from 'phaser';
import { director } from '../../game/director';
import { audio } from '../../game/sim/audio';
import { skinById } from '../../game/sim/skins';
import { rndInt, shuffle } from '../../game/sim/rng';
import {
  clearSceneRoot,
  resultOverlay,
  stakePanel,
  type StakePanel,
} from '../../ui/gameUi';
import { $, el, fmtCoins } from '../../ui/dom';
import { addEmbers } from '../fx';
import { domConfetti, domFloatText, domSparkle, winFlash } from '../../ui/domFx';
import { createAiAvatar, type AiAvatar } from '../../ui/aiAvatar';

type RpsValue = 'rock' | 'scissors' | 'paper';

const RPS_META: Record<RpsValue, { emoji: string; label: string; beats: RpsValue }> = {
  rock: { emoji: '✊', label: '石头', beats: 'scissors' },
  scissors: { emoji: '✌️', label: '剪刀', beats: 'paper' },
  paper: { emoji: '✋', label: '布', beats: 'rock' },
};

export class RpsScene extends Phaser.Scene {
  private stake = 30;
  private state: 'stake' | 'round' | 'settled' = 'stake';
  private busy = false;
  private round = 0;
  private root: HTMLElement | null = null;
  private stakePanel: StakePanel | null = null;
  private playerCards: RpsValue[] = [];
  private aiCards: RpsValue[] = [];
  private lastPv: RpsValue | null = null;
  private lastAv: RpsValue | null = null;
  private ai: AiAvatar | null = null;

  constructor() {
    super('RpsScene');
  }

  create(): void {
    document.body.dataset.scene = 'rps';
    addEmbers(this, 14);
    const container = document.getElementById('game-container');
    if (!container) return;
    clearSceneRoot(container);
    this.root = el('div', 'scene-root rps-root');
    container.appendChild(this.root);
    this.state = 'stake';
    this.round = 0;
    this.buildStake();
  }

  private buildStake(): void {
    if (!this.root) return;
    this.root.classList.add('stake-phase');
    const save = director.save;
    this.root.innerHTML = `
      <div class="rps-stage">
        <div class="rps-box">📦</div>
        <div class="rps-intro">
          <h3>神秘木箱</h3>
          <p>箱中随机装着三种手势卡牌。每局从箱中发给双方各三张，逐张出牌：</p>
          <ul>
            <li>你赢下任意一轮，直接带走本局投入；</li>
            <li>打平则用下一张继续，三张全部打平就是平局。</li>
          </ul>
        </div>
      </div>
    `;
    this.stakePanel = stakePanel({
      min: 30,
      coins: save.coins,
      chips: [30, 100, 200, 500],
      label: '本局投入金',
      step: 30,
    });
    const wrap = el('div', 'stake-wrap');
    wrap.appendChild(this.stakePanel.root);
    const start = el('button', 'btn btn-gold btn-lg', '开启木箱');
    start.addEventListener('click', () => {
      audio.click();
      const v = this.stakePanel!.getValue();
      if (director.save.coins < v) {
        const err = el('div', 'form-error', '金币不足');
        wrap.appendChild(err);
        return;
      }
      this.stake = v;
      void this.deal();
    });
    wrap.appendChild(start);
    this.root.appendChild(wrap);
  }

  private async deal(): Promise<void> {
    this.root?.classList.remove('stake-phase');
    this.state = 'round';
    this.busy = true;
    this.round = 0;
    const composition = this.makeComposition();
    const deck = shuffle([
      ...Array(composition.rock).fill('rock'),
      ...Array(composition.scissors).fill('scissors'),
      ...Array(composition.paper).fill('paper'),
    ] as RpsValue[]);
    this.playerCards = deck.slice(0, 3);
    this.aiCards = deck.slice(3, 6);

    const skin = skinById(director.save.equippedSkin);
    this.root!.innerHTML = `
      <div class="rps-stage rps-playing">
        <div class="rps-composition">
          <div class="rps-comp-title">木箱启封 · 里面的卡牌是</div>
          <div class="rps-comp-cards">
            <span>${RPS_META.rock.emoji} × ${composition.rock}</span>
            <span>${RPS_META.scissors.emoji} × ${composition.scissors}</span>
            <span>${RPS_META.paper.emoji} × ${composition.paper}</span>
          </div>
        </div>
        <div class="rps-tables">
          <div class="rps-side player">
            <div class="rps-side-label">你的三张牌</div>
            <div class="rps-hand" id="rps-player-hand"></div>
          </div>
          <div class="rps-versus">
            <div class="rps-round">第 ${this.round + 1} 轮</div>
            <div class="rps-vs">VS</div>
            <div class="rps-pot">投入金 ${fmtCoins(this.stake)}</div>
          </div>
          <div class="rps-side ai">
            <div class="rps-side-label">对手的三张牌</div>
            <div class="rps-hand" id="rps-ai-hand"></div>
          </div>
        </div>
        <div class="rps-msg" id="rps-msg">选择一张卡牌出战</div>
      </div>
    `;
    const ph = $('#rps-player-hand', this.root!)!;
    for (let i = 0; i < 3; i++) {
      const c = this.cardEl(this.playerCards[i], true, i, skin.id);
      ph.appendChild(c);
      c.classList.add('from-box');
      c.style.animationDelay = `${300 + i * 200}ms`;
    }
    const ah = $('#rps-ai-hand', this.root!)!;
    for (let i = 0; i < 3; i++) {
      const c = this.cardEl(this.aiCards[i], false, i, skin.id);
      ah.appendChild(c);
      c.classList.add('from-box');
      c.style.animationDelay = `${1100 + i * 200}ms`;
    }
    const aiSide = $('.rps-side.ai', this.root!);
    if (aiSide) {
      this.ai = createAiAvatar('黑衣客');
      aiSide.insertBefore(this.ai.root, aiSide.firstChild);
    }
    const comp = $('.rps-comp-cards', this.root!);
    if (comp) {
      comp.classList.remove('pop-in');
      void comp.offsetWidth;
      comp.classList.add('pop-in');
    }
    await this.wait(1900);
    const msg = $('#rps-msg', this.root!)!;
    msg.textContent = '你的手牌正在翻开…';
    for (let i = 0; i < ph.children.length; i++) {
      const c = ph.children[i] as HTMLElement;
      c.classList.remove('card-down');
      audio.cardFlip();
      await this.wait(300);
    }
    this.busy = false;
    msg.textContent = '选择一张卡牌出战';
  }

  private makeComposition(): { rock: number; scissors: number; paper: number } {
    for (;;) {
      const rock = rndInt(1, 5);
      const scissors = rndInt(1, 5);
      const paper = 9 - rock - scissors;
      if (paper >= 1 && paper <= 5) return { rock, scissors, paper };
    }
  }

  private cardEl(
    value: RpsValue,
    isPlayer: boolean,
    idx: number,
    skinId: string,
  ): HTMLElement {
    const meta = RPS_META[value];
    const div = el(
      'div',
      `rps-card card card-down skin-${skinId}${isPlayer ? ' player-card' : ''}`,
      `
        <div class="card-inner">
          <div class="card-face rps-face"><span>${meta.emoji}</span><i>${meta.label}</i></div>
          <div class="card-back"><span>${skinById(skinId).emblem}</span></div>
        </div>
      `,
    );
    div.dataset.value = value;
    div.dataset.idx = String(idx);
    if (isPlayer) {
      div.classList.add('playable');
      div.addEventListener('click', () => {
        if (this.busy || this.state !== 'round') return;
        const curIdx = parseInt(div.dataset.idx ?? '0', 10);
        void this.playRound(curIdx);
      });
    }
    return div;
  }

  private async playRound(playerIdx: number): Promise<void> {
    this.busy = true;
    audio.click();
    const skin = skinById(director.save.equippedSkin);
    const pCards = $('#rps-player-hand', this.root!)!.children;
    const aCards = $('#rps-ai-hand', this.root!)!.children;
    for (let i = 0; i < pCards.length; i++) {
      if (i !== playerIdx) (pCards[i] as HTMLElement).classList.add('dim');
    }
    const pCard = pCards[playerIdx] as HTMLElement;
    await this.wait(200);
    pCard.classList.add('played');
    await this.wait(260);
    pCard.classList.remove('card-down');
    audio.cardFlip();
    const pv = this.playerCards[playerIdx];
    const msg = $('#rps-msg', this.root!)!;
    msg.textContent = '对手出牌中…';
    this.ai?.setMood('thinking', '让我看看…');
    await this.wait(700);
    const aiIdx = this.chooseAiCard();
    const aCard = aCards[aiIdx] as HTMLElement;
    aCard.classList.add('played');
    await this.wait(240);
    aCard.classList.remove('card-down');
    audio.cardFlip();
    const av = this.aiCards[aiIdx];
    await this.wait(500);

    const center = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const pWin = RPS_META[pv].beats === av;
    const aWin = RPS_META[av].beats === pv;
    this.lastPv = pv;
    this.lastAv = av;
    const vs = $('.rps-versus', this.root!);
    if (vs) {
      vs.classList.remove('clash');
      void vs.offsetWidth;
      vs.classList.add('clash');
    }
    if (pWin) {
      domSparkle(center, cy, '#7ee8fa', 24);
      domConfetti(center, cy, 36);
      winFlash();
      audio.win();
      this.ai?.setMood('angry', '哼，运气不错');
      msg.textContent = `${RPS_META[pv].emoji} 胜 ${RPS_META[av].emoji}！你赢下本轮！`;
      await this.wait(900);
      this.settle('win', '猜拳得胜', `${RPS_META[pv].label} 压过 ${RPS_META[av].label}`);
    } else if (aWin) {
      domSparkle(center, cy, '#ff6b6b', 18);
      audio.lose();
      this.ai?.setMood('smug', '哈，我拿下了');
      msg.textContent = `${RPS_META[av].emoji} 胜 ${RPS_META[pv].emoji}…对手赢下本轮`;
      await this.wait(900);
      this.settle('loss', '惜败一轮', `${RPS_META[av].label} 压过了你的 ${RPS_META[pv].label}`);
    } else {
      domFloatText(center, cy, '平局！继续出牌', '#ffe08a', 30);
      audio.draw();
      this.ai?.setMood('neutral', '平局…继续');
      msg.textContent = '平局！换下一张卡牌';
      await this.wait(1000);
      this.playerCards.splice(playerIdx, 1);
      this.aiCards.splice(aiIdx, 1);
      pCard.remove();
      aCard.remove();
      this.round += 1;
      const roundEl = $('.rps-round', this.root!);
      if (roundEl) roundEl.textContent = `第 ${this.round + 1} 轮`;
      if (this.round >= 3) {
        this.settle('draw', '三张全平', '胜负未分，投入如数奉还');
        return;
      }
      const ph = $('#rps-player-hand', this.root!)!;
      const ah = $('#rps-ai-hand', this.root!)!;
      for (let i = 0; i < ph.children.length; i++) {
        (ph.children[i] as HTMLElement).classList.remove('dim');
        (ph.children[i] as HTMLElement).dataset.idx = String(i);
      }
      msg.textContent = '选择一张卡牌出战';
      this.busy = false;
    }
  }

  private chooseAiCard(): number {
    const a = this.aiCards;
    const best = a.findIndex((v) => this.playerCards.some((p) => RPS_META[v].beats === p));
    const candidates = a.map((v, i) => i);
    if (best >= 0 && Math.random() < 0.45) return best;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private settle(
    outcome: 'win' | 'loss' | 'draw',
    title: string,
    subtitle: string,
  ): void {
    if (this.state === 'settled') return;
    this.state = 'settled';
    const delta =
      outcome === 'win' ? this.stake : outcome === 'loss' ? -this.stake : 0;
    const stats = outcome === 'draw' && this.round >= 3 ? { rpsAllTies: 1 } : {};
    const detail =
      this.lastPv && this.lastAv
        ? `<div class="row"><span>你的出牌</span><strong>${RPS_META[this.lastPv].emoji} ${RPS_META[this.lastPv].label}</strong></div>
           <div class="row ${outcome === 'loss' ? 'neg' : ''}"><span>对手出牌</span><strong>${RPS_META[this.lastAv].emoji} ${RPS_META[this.lastAv].label}</strong></div>`
        : '';
    director.settle({
      kind: 'rps',
      outcome,
      deltaCoins: delta,
      stats,
      title,
      subtitle,
      detail,
    });
    if (director.save.defeated) return;
    resultOverlay({
      title,
      subtitle,
      detail,
      delta,
      outcome,
      onAgain: () => director.replay(),
      onExit: () => director.exitToHub(),
      againLabel: '再开一箱',
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
