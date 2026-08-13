import Phaser from 'phaser';
import { director } from '../../game/director';
import { audio } from '../../game/sim/audio';
import { skinById } from '../../game/sim/skins';
import { chance, shuffle } from '../../game/sim/rng';
import {
  clearSceneRoot,
  resultOverlay,
  stakePanel,
  type StakePanel,
  updateHudCoins,
} from '../../ui/gameUi';
import { $, el, fmtCoins } from '../../ui/dom';
import { addEmbers } from '../fx';
import { domConfetti, domFloatText, domSparkle, winFlash } from '../../ui/domFx';
import { createAiAvatar, type AiAvatar } from '../../ui/aiAvatar';

interface TarotCard {
  id: number;
  rank: string;
  value: number;
  upright: boolean;
  isJoker: boolean;
}

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUE: Record<string, number> = {
  A: 1,
  J: 11,
  Q: 12,
  K: 13,
};

export class TarotScene extends Phaser.Scene {
  private stake = 100;
  private state: 'stake' | 'flipping' | 'settled' = 'stake';
  private root: HTMLElement | null = null;
  private stakePanel: StakePanel | null = null;
  private cards: TarotCard[] = [];
  private revealed = new Set<number>();
  private playerScore = 0;
  private aiScore = 0;
  private flips = 0;
  private busy = false;
  private ai: AiAvatar | null = null;

  constructor() {
    super('TarotScene');
  }

  create(): void {
    document.body.dataset.scene = 'tarot';
    addEmbers(this, 18);
    const container = document.getElementById('game-container');
    if (!container) return;
    clearSceneRoot(container);
    this.root = el('div', 'scene-root tarot-root');
    container.appendChild(this.root);
    this.state = 'stake';
    this.playerScore = 0;
    this.aiScore = 0;
    this.flips = 0;
    this.busy = false;
    this.buildStake();
  }

  private buildStake(): void {
    if (!this.root) return;
    this.root.classList.add('stake-phase');
    const save = director.save;
    this.root.innerHTML = `
      <div class="tarot-stage">
        <div class="tarot-rules">
          <h3>命运塔罗</h3>
          <p>黑桃 A–K 与一张大王随机正逆铺开：<strong>正位为你加分，逆位为对手加分</strong>，牌面几点加几分（J=11 Q=12 K=13）。</p>
          <p>双方轮流翻牌，各翻两张后比总分；翻到大王立即定胜负（正位你胜，逆位你负）。</p>
          <p>正逆在翻牌前完全保密，卡背上下对称；翻开后牌面正立为「正」，倒置为「逆」。</p>
        </div>
      </div>
    `;
    this.stakePanel = stakePanel({
      min: 100,
      coins: save.coins,
      chips: [100, 200, 500],
      label: '本局投入金',
      step: 50,
    });
    const wrap = el('div', 'stake-wrap');
    wrap.appendChild(this.stakePanel.root);
    const start = el('button', 'btn btn-gold btn-lg', '铺开塔罗');
    start.addEventListener('click', () => {
      audio.click();
      const v = this.stakePanel!.getValue();
      if (director.save.coins < v) {
        const err = el('div', 'form-error', '金币不足');
        wrap.appendChild(err);
        return;
      }
      this.stake = v;
      this.buildBoard();
    });
    wrap.appendChild(start);
    this.root.appendChild(wrap);
  }

  private buildBoard(): void {
    this.root?.classList.remove('stake-phase');
    this.state = 'flipping';
    this.cards = this.makeCards();
    this.revealed = new Set();
    this.playerScore = 0;
    this.aiScore = 0;
    this.flips = 0;
    const skin = skinById(director.save.equippedSkin);
    const order = shuffle(this.cards.map((c) => c.id));
    this.root!.innerHTML = `
      <div class="tarot-stage tarot-playing">
        <div class="tarot-scoreline" id="tarot-scoreline">
          <div class="tarot-score side-player">你 <strong id="tarot-p">0</strong></div>
          <div class="tarot-score-versus">VS</div>
          <div class="tarot-score side-ai">对手 <strong id="tarot-a">0</strong></div>
        </div>
        <div class="tarot-board" id="tarot-board">
          ${order
            .map(
              (id, i) => `
                <div class="tarot-slot" data-id="${id}" style="--d:${i * 40}ms">
                  <div class="tarot-card card card-down skin-${skin.id}" data-id="${id}">
                    <div class="card-inner">
                      <div class="card-face tarot-face"></div>
                      <div class="card-back"><span>${skin.emblem}</span></div>
                    </div>
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
        <div class="tarot-msg" id="tarot-msg">轮到你翻牌（各翻两张）</div>
        <div class="tarot-legend">翻开后：牌面正立＝正位为你加分 · 倒置＝逆位为对手加分</div>
      </div>
    `;
    this.ai = createAiAvatar('占卜师');
    const scoreline = $('#tarot-scoreline', this.root!);
    scoreline?.appendChild(this.ai.root);
    for (const cardEl of this.root!.querySelectorAll<HTMLElement>('.tarot-card')) {
      cardEl.addEventListener('click', () => {
        if (this.busy || this.state !== 'flipping') return;
        const id = parseInt(cardEl.dataset.id ?? '0', 10);
        if (this.revealed.has(id)) return;
        void this.playerFlip(id);
      });
    }
    updateHudCoins(0);
  }

  private makeCards(): TarotCard[] {
    const cards: TarotCard[] = RANKS.map((rank, i) => ({
      id: i,
      rank,
      value: RANK_VALUE[rank] ?? parseInt(rank, 10),
      upright: chance(0.5),
      isJoker: false,
    }));
    cards.push({
      id: 13,
      rank: '大王',
      value: 0,
      upright: chance(0.5),
      isJoker: true,
    });
    return cards;
  }

  private async playerFlip(id: number): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const card = this.cards.find((c) => c.id === id)!;
    this.revealed.add(id);
    audio.cardFlip();
    const cardEl = this.root!.querySelector<HTMLElement>(`.tarot-card[data-id="${id}"]`);
    if (cardEl) {
      cardEl.classList.add('flipping');
      await this.wait(360);
      cardEl.classList.remove('card-down', 'flipping');
      cardEl.querySelector('.tarot-face')!.innerHTML = card.isJoker
        ? '<span class="joker-face">🃏</span><i>大王</i>'
        : `<span>${card.rank}</span><i>♠</i>`;
      cardEl.classList.add('revealed', card.upright ? 'upright' : 'reversed');
    }
    await this.wait(500);
    const rect = cardEl?.getBoundingClientRect();
    if (card.isJoker) {
      if (card.upright) {
        domFloatText(rect ? rect.left + rect.width / 2 : window.innerWidth / 2, rect ? rect.top : 200, '大王正位 · 你胜', '#ffd166', 30);
        winFlash();
        domConfetti(window.innerWidth / 2, window.innerHeight / 2.6, 46);
        audio.win();
        this.ai?.setMood('angry', '大王竟向着你…');
      } else {
        domFloatText(rect ? rect.left + rect.width / 2 : window.innerWidth / 2, rect ? rect.top : 200, '大王逆位 · 你负', '#ff6b6b', 30);
        audio.lose();
        this.ai?.setMood('smug', '命运站在我这边');
      }
      this.setMsg(card.upright ? '大王正位！你直接获胜' : '大王逆位…你直接落败');
      await this.wait(1300);
      this.settle(card.upright ? 'win' : 'loss', card.upright ? '大王降临' : '大王逆转', card.upright ? '正位大王，命运站在你这边' : '逆位大王，命运倒向对手');
      return;
    }
    this.playerScore += card.upright ? card.value : 0;
    this.aiScore += card.upright ? 0 : card.value;
    this.updateScores();
    this.setMsg(`你翻开 ${card.rank} · ${card.upright ? `为你 +${card.value}` : `为对手 +${card.value}`}`);
    this.flips += 1;
    await this.wait(1000);
    if (this.flips >= 4) {
      this.finishCompare();
      return;
    }
    this.busy = false;
    if (this.flips % 2 === 0) {
      this.setMsg('轮到你翻牌');
    } else {
      this.setMsg('对手正在翻牌…');
      await this.wait(600);
      await this.aiFlip();
    }
  }

  private async aiFlip(): Promise<void> {
    if (this.busy || this.state !== 'flipping') return;
    this.busy = true;
    this.ai?.setMood('thinking', '占卜中…');
    const remaining = this.cards.filter((c) => !this.revealed.has(c.id) && !c.isJoker);
    if (remaining.length === 0) {
      this.finishCompare();
      return;
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    this.revealed.add(pick.id);
    audio.cardFlip();
    const cardEl = this.root!.querySelector<HTMLElement>(`.tarot-card[data-id="${pick.id}"]`);
    if (cardEl) {
      cardEl.classList.add('flipping');
      await this.wait(360);
      cardEl.classList.remove('card-down', 'flipping');
      cardEl.querySelector('.tarot-face')!.innerHTML = `<span>${pick.rank}</span><i>♠</i>`;
      cardEl.classList.add('revealed', pick.upright ? 'upright' : 'reversed');
    }
    await this.wait(500);
    this.playerScore += pick.upright ? pick.value : 0;
    this.aiScore += pick.upright ? 0 : pick.value;
    this.updateScores();
    this.setMsg(`对手翻开 ${pick.rank} · ${pick.upright ? `为你 +${pick.value}` : `为对手 +${pick.value}`}`);
    this.flips += 1;
    await this.wait(1000);
    if (this.flips >= 4) {
      this.finishCompare();
      return;
    }
    this.busy = false;
    this.setMsg('轮到你翻牌');
  }

  private finishCompare(): void {
    this.setMsg(
      `终局比分：你 ${this.playerScore} : ${this.aiScore} 对手${
        this.playerScore > this.aiScore
          ? '，你赢了'
          : this.playerScore < this.aiScore
            ? '，你输了'
            : '，平局'
      }`,
    );
    if (this.playerScore > this.aiScore) {
      domSparkle(window.innerWidth / 2, window.innerHeight / 2.6, '#ffd166', 26);
      audio.win();
      this.ai?.setMood('angry', '星象竟偏向你');
    } else if (this.playerScore < this.aiScore) {
      audio.lose();
      this.ai?.setMood('smug', '我早已看穿');
    } else {
      audio.draw();
      this.ai?.setMood('neutral', '命运平手');
    }
    const outcome =
      this.playerScore > this.aiScore
        ? 'win'
        : this.playerScore < this.aiScore
          ? 'loss'
          : 'draw';
    this.settle(
      outcome,
      outcome === 'win' ? '塔罗显灵' : outcome === 'loss' ? '星象逆转' : '命运持平',
      `你 ${this.playerScore} : ${this.aiScore} 对手`,
    );
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
    const detail = `<div class="row"><span>你的总分</span><strong>${this.playerScore}</strong></div><div class="row ${outcome === 'loss' ? 'neg' : ''}"><span>对手总分</span><strong>${this.aiScore}</strong></div>`;
    director.settle({
      kind: 'tarot',
      outcome,
      deltaCoins: delta,
      stats: { tarotJokerWins: title === '大王降临' && outcome === 'win' ? 1 : 0 },
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
      againLabel: '再占一卦',
    });
  }

  private updateScores(): void {
    const p = $('#tarot-p', this.root!);
    const a = $('#tarot-a', this.root!);
    if (p) p.textContent = String(this.playerScore);
    if (a) a.textContent = String(this.aiScore);
  }

  private setMsg(text: string): void {
    const m = $('#tarot-msg', this.root!);
    if (m) m.textContent = text;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
