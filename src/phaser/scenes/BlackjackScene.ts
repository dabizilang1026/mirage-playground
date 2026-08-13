import Phaser from 'phaser';
import { director } from '../../game/director';
import { audio } from '../../game/sim/audio';
import { skinById } from '../../game/sim/skins';
import { shuffle } from '../../game/sim/rng';
import {
  clearSceneRoot,
  resultOverlay,
  stakePanel,
  type StakePanel,
  updateHudCoins,
} from '../../ui/gameUi';
import { $, el, fmtCoins, toast } from '../../ui/dom';
import { addEmbers } from '../fx';
import { domConfetti, domSparkle, winFlash } from '../../ui/domFx';
import { createAiAvatar, type AiAvatar } from '../../ui/aiAvatar';

type Suit = '♠' | '♥' | '♦' | '♣';

interface BJCard {
  rank: string;
  suit: Suit;
  value: number;
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const rankValue = (rank: string): number => {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank, 10);
};

const handValue = (hand: BJCard[]): { total: number; soft: boolean } => {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += c.value;
    if (c.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 && total <= 21 };
};

export class BlackjackScene extends Phaser.Scene {
  private deck: BJCard[] = [];
  private player: BJCard[] = [];
  private dealer: BJCard[] = [];
  private stake = 50;
  private doubled = false;
  private busy = false;
  private state: 'stake' | 'playing' | 'dealer' | 'done' = 'stake';
  private root: HTMLElement | null = null;
  private stakePanel: StakePanel | null = null;
  private ai: AiAvatar | null = null;

  constructor() {
    super('BlackjackScene');
  }

  create(): void {
    document.body.dataset.scene = 'blackjack';
    addEmbers(this, 14);
    this.deck = this.newDeck();
    this.player = [];
    this.dealer = [];
    this.doubled = false;
    this.busy = false;
    this.state = 'stake';
    const container = document.getElementById('game-container');
    if (!container) return;
    clearSceneRoot(container);
    this.root = el('div', 'scene-root bj-root');
    container.appendChild(this.root);
    this.build();
  }

  private newDeck(): BJCard[] {
    const d: BJCard[] = [];
    for (let i = 0; i < 6; i++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          d.push({ rank, suit, value: rankValue(rank) });
        }
      }
    }
    return shuffle(d);
  }

  private draw(): BJCard {
    if (this.deck.length < 24) this.deck = this.newDeck();
    return this.deck.pop()!;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  private build(): void {
    if (!this.root) return;
    const save = director.save;
    this.root.innerHTML = `
      <div class="bj-table">
        <div class="bj-zone dealer">
          <div class="bj-label">庄家 · 命运人偶</div>
          <div class="bj-score" id="dealer-score">0</div>
          <div class="bj-hand" id="dealer-hand"></div>
        </div>
        <div class="bj-mid">
          <div class="bj-deck">🂠</div>
          <div class="bj-msg" id="bj-msg">选择本局投入金</div>
        </div>
        <div class="bj-zone player">
          <div class="bj-label">你 · ${save.name}</div>
          <div class="bj-score" id="player-score">0</div>
          <div class="bj-hand" id="player-hand"></div>
        </div>
        <div class="bj-actions" id="bj-actions"></div>
        <div class="bj-stake-wrap" id="bj-stake-wrap"></div>
      </div>
    `;
    const dealerZone = $('.bj-zone.dealer', this.root);
    if (dealerZone) {
      this.ai = createAiAvatar('命运人偶');
      dealerZone.insertBefore(this.ai.root, dealerZone.firstChild);
    }
    this.stakePanel = stakePanel({
      min: 50,
      coins: save.coins,
      chips: [50, 100, 200, 500],
      label: '本局投入金',
      step: 50,
    });
    const wrap = $('#bj-stake-wrap', this.root)!;
    wrap.appendChild(this.stakePanel.root);
    const start = el('button', 'btn btn-gold btn-lg', '开始发牌');
    start.addEventListener('click', () => {
      audio.click();
      this.startRound();
    });
    wrap.appendChild(start);
    this.refreshScores();
  }

  private startRound(): void {
    if (!this.stakePanel || this.state !== 'stake') return;
    const stake = this.stakePanel.getValue();
    if (director.save.coins < stake) {
      toast('金币不足', '⚠️');
      return;
    }
    this.stake = stake;
    this.state = 'playing';
    this.doubled = false;
    const wrap = $('#bj-stake-wrap', this.root!);
    if (wrap) wrap.style.display = 'none';
    this.setMsg('发牌中…');
    void this.deal();
  }

  private async deal(): Promise<void> {
    this.busy = true;
    this.addCard('player', this.draw(), true);
    await this.wait(420);
    this.addCard('dealer', this.draw(), true);
    await this.wait(420);
    this.addCard('player', this.draw(), true);
    await this.wait(420);
    this.addCard('dealer', this.draw(), false);
    await this.wait(520);

    const pv = handValue(this.player);
    const dv = handValue(this.dealer);
    this.refreshScores();
    if (pv.total === 21 && this.player.length === 2) {
      await this.flipHole();
      const dv2 = handValue(this.dealer);
      this.refreshScores();
      if (dv2.total === 21 && this.dealer.length === 2) {
        this.setMsg('双方都是二十一点，平局');
        this.settle('draw', '天意平局', '双方同为天选之数');
      } else {
        this.setMsg('天选二十一点！');
        this.settle('win', '天选二十一点！', '黑杰克，双倍以上的收获');
      }
      return;
    }
    if (dv.total === 21 && this.dealer.length === 2) {
      await this.flipHole();
      this.refreshScores();
      this.setMsg('庄家天选二十一点…');
      this.ai?.setMood('smug', '天选之牌');
      this.settle('loss', '庄家天选', '命运站在了人偶那边');
      return;
    }
    this.busy = false;
    this.showActions();
  }

  private showActions(): void {
    const wrap = $('#bj-actions', this.root!);
    if (!wrap) return;
    wrap.innerHTML = '';
    const hit = el('button', 'btn btn-gold', '要牌');
    hit.addEventListener('click', () => {
      audio.click();
      void this.hit();
    });
    const stand = el('button', 'btn btn-ghost', '停牌');
    stand.addEventListener('click', () => {
      audio.click();
      void this.stand();
    });
    wrap.append(hit, stand);
    if (this.player.length === 2 && !this.doubled && director.save.coins >= this.stake * 2) {
      const dbl = el('button', 'btn btn-gold', '双倍投入');
      dbl.addEventListener('click', () => {
        audio.click();
        void this.double();
      });
      wrap.appendChild(dbl);
    }
    this.setMsg('要牌还是停牌？');
  }

  private async hit(): Promise<void> {
    if (this.busy || this.state !== 'playing') return;
    this.busy = true;
    $('#bj-actions', this.root!)!.innerHTML = '';
    this.addCard('player', this.draw(), true);
    await this.wait(380);
    const pv = handValue(this.player);
    this.refreshScores();
    if (pv.total > 21) {
      this.setMsg('爆牌了…');
      this.settle('loss', '超过 21 点', '本局投入化为尘埃');
      return;
    }
    if (pv.total === 21) {
      await this.stand();
      return;
    }
    this.busy = false;
    this.showActions();
  }

  private async double(): Promise<void> {
    if (this.busy || this.state !== 'playing' || this.player.length !== 2) return;
    this.busy = true;
    this.doubled = true;
    this.stake *= 2;
    $('#bj-actions', this.root!)!.innerHTML = '';
    this.setMsg('双倍投入，只补一张牌…');
    this.addCard('player', this.draw(), true);
    await this.wait(420);
    const pv = handValue(this.player);
    this.refreshScores();
    if (pv.total > 21) {
      this.settle('loss', '双倍冒险失败', '超过 21 点');
      return;
    }
    await this.stand();
  }

  private async stand(): Promise<void> {
    if (this.state !== 'playing' && this.state !== 'dealer') return;
    this.busy = true;
    this.state = 'dealer';
    $('#bj-actions', this.root!)!.innerHTML = '';
    this.setMsg('庄家翻牌…');
    this.ai?.setMood('thinking', '让我想想…');
    await this.flipHole();
    await this.wait(500);
    let dv = handValue(this.dealer);
    while (dv.total < 17) {
      this.setMsg('庄家补牌…');
      await this.wait(700);
      this.addCard('dealer', this.draw(), true);
      dv = handValue(this.dealer);
      this.refreshScores();
      await this.wait(500);
    }
    this.refreshScores();
    const pv = handValue(this.player);
    let outcome: 'win' | 'loss' | 'draw';
    let title: string;
    let subtitle: string;
    if (dv.total > 21) {
      outcome = 'win';
      title = '庄家爆牌';
      subtitle = `你 ${pv.total} · 庄家 ${dv.total}`;
    } else if (pv.total > dv.total) {
      outcome = 'win';
      title = '你赢了';
      subtitle = `你 ${pv.total} · 庄家 ${dv.total}`;
    } else if (pv.total < dv.total) {
      outcome = 'loss';
      title = '庄家胜出';
      subtitle = `你 ${pv.total} · 庄家 ${dv.total}`;
    } else {
      outcome = 'draw';
      title = '平局';
      subtitle = `双方都是 ${pv.total} 点`;
    }
    this.settle(outcome, title, subtitle);
  }

  private settle(
    outcome: 'win' | 'loss' | 'draw',
    title: string,
    subtitle: string,
  ): void {
    if (this.state === 'done') return;
    this.state = 'done';
    this.busy = true;
    const pv = handValue(this.player);
    const dv = handValue(this.dealer);
    const natural = outcome === 'win' && pv.total === 21 && this.player.length === 2;
    let delta: number;
    if (outcome === 'win') delta = natural ? Math.round(this.stake * 1.5) : this.stake;
    else if (outcome === 'draw') delta = 0;
    else delta = -this.stake;
    if (natural) {
      audio.win();
      winFlash();
      domConfetti(window.innerWidth / 2, window.innerHeight / 2.4, 60);
    } else if (outcome === 'win') {
      audio.cashout();
      domSparkle(window.innerWidth / 2, window.innerHeight / 2, '#ffd166', 26);
    } else if (outcome === 'loss') {
      audio.lose();
    } else {
      audio.draw();
    }
    if (outcome === 'win') this.ai?.setMood('angry', '哼…被你赢了');
    else if (outcome === 'loss') this.ai?.setMood('smug', '人偶技高一筹');
    else this.ai?.setMood('neutral', '平局，再来');
    this.setMsg(`${title} · ${delta > 0 ? `+${fmtCoins(delta)}` : delta < 0 ? fmtCoins(delta) : '不赚不亏'} 金币`);
    const detail = `<div class="row"><span>你的点数</span><strong>${pv.total}</strong></div><div class="row ${outcome === 'loss' ? 'neg' : ''}"><span>庄家点数</span><strong>${dv.total}</strong></div>`;
    director.settle({
      kind: 'blackjack',
      outcome,
      deltaCoins: delta,
      stats: { blackjackNaturals: natural ? 1 : 0 },
      title,
      subtitle: `${subtitle} · ${natural ? '黑杰克 2.5 倍' : outcome === 'win' ? '2 倍收获' : ''}`,
      detail,
    });
    if (director.save.defeated) return;
    updateHudCoins(0);
    resultOverlay({
      title,
      subtitle,
      detail,
      delta,
      outcome,
      onAgain: () => director.replay(),
      onExit: () => director.exitToHub(),
      againLabel: '再来一局',
    });
  }

  private addCard(side: 'player' | 'dealer', card: BJCard, faceUp: boolean): void {
    if (side === 'player') this.player.push(card);
    else this.dealer.push(card);
    const handEl = side === 'player' ? $('#player-hand', this.root!) : $('#dealer-hand', this.root!);
    if (!handEl) return;
    const skin = skinById(director.save.equippedSkin);
    const red = card.suit === '♥' || card.suit === '♦';
    const div = el(
      'div',
      `card ${faceUp ? '' : 'card-down'} skin-${skin.id}`,
      `
        <div class="card-inner">
          <div class="card-face">
            <span class="card-corner tl">${card.rank}<i class="${red ? 'red' : ''}">${card.suit}</i></span>
            <span class="card-center ${red ? 'red' : ''}">${card.suit}</span>
            <span class="card-corner br">${card.rank}<i class="${red ? 'red' : ''}">${card.suit}</i></span>
          </div>
          <div class="card-back"><span>${skin.emblem}</span></div>
        </div>
      `,
    );
    handEl.appendChild(div);
    requestAnimationFrame(() => div.classList.add('deal-in'));
    audio.cardFlip();
    this.refreshScores();
  }

  private async flipHole(): Promise<void> {
    const hole = $('#dealer-hand .card-down', this.root!);
    if (!hole) return;
    audio.cardFlip();
    hole.classList.add('flipping');
    await this.wait(420);
    hole.classList.remove('card-down', 'flipping');
    this.refreshScores();
  }

  private refreshScores(): void {
    const p = $('#player-score', this.root!);
    const d = $('#dealer-score', this.root!);
    const pv = handValue(this.player);
    const dv = handValue(this.dealer);
    if (p) {
      p.textContent = this.player.length ? `${pv.total}` : '0';
      p.classList.toggle('soft', pv.soft);
    }
    if (d) {
      const holeDown = !!$('#dealer-hand .card-down', this.root!);
      d.textContent = this.dealer.length
        ? holeDown
          ? `${this.dealer[0].value} + ?`
          : `${dv.total}`
        : '0';
      d.classList.toggle('soft', dv.soft && !holeDown);
    }
  }

  private setMsg(text: string): void {
    const m = $('#bj-msg', this.root!);
    if (m) {
      m.textContent = text;
      m.classList.remove('msg-pop');
      void m.offsetWidth;
      m.classList.add('msg-pop');
    }
  }
}
