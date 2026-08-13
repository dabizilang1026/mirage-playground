import Phaser from 'phaser';
import { director } from '../../game/director';
import { audio } from '../../game/sim/audio';
import { rndInt, shuffle } from '../../game/sim/rng';
import {
  clearSceneRoot,
  resultOverlay,
  stakePanel,
  type StakePanel,
} from '../../ui/gameUi';
import { $, el, fmtCoins, toast } from '../../ui/dom';
import { addEmbers } from '../fx';
import { domConfetti, domShockwave, domSparkle, winFlash } from '../../ui/domFx';
import { createAiAvatar, type AiAvatar } from '../../ui/aiAvatar';

const HEART_LABELS = ['A', '2', '3', '4', '5', '6'];

export class RouletteScene extends Phaser.Scene {
  private stake = 300;
  private state: 'stake' | 'arrange' | 'fire' | 'settled' = 'stake';
  private root: HTMLElement | null = null;
  private stakePanel: StakePanel | null = null;
  private playerBullets = 2;
  private aiBullets = 0;
  private publicOrder: number[] = [];
  private playerOrder: number[] = [];
  private aiOrder: number[] = [];
  private shooter: 'player' | 'ai' = 'player';
  private shots = 0;
  private drawnGun: 'player' | 'ai' = 'player';
  private selectedCard: number | null = null;
  private busy = false;
  private lastMatch: { p: number; a: number } | null = null;
  private ai: AiAvatar | null = null;

  constructor() {
    super('RouletteScene');
  }

  create(): void {
    document.body.dataset.scene = 'roulette';
    addEmbers(this, 16);
    const container = document.getElementById('game-container');
    if (!container) return;
    clearSceneRoot(container);
    this.root = el('div', 'scene-root rou-root');
    container.appendChild(this.root);
    this.state = 'stake';
    this.playerBullets = 2;
    this.busy = false;
    this.buildStake();
  }

  private buildStake(): void {
    if (!this.root) return;
    this.root.classList.add('stake-phase');
    const save = director.save;
    this.root.innerHTML = `
      <div class="rou-stage">
        <div class="rou-rules">
          <h3>生死俄罗斯转盘</h3>
          <p>双方各持一把六膛左轮，可装入任意颗子弹，随后两把枪一起放入暗箱。</p>
          <p>红桃 A–6 在桌上公开排列，你与对手各自排列；匹配数多者为枪手，按匹配差开枪。</p>
          <p>枪手随机从暗箱取枪射击：成功开火即获胜，未开火或平局则为平局。</p>
        </div>
        <div class="rou-bullets">
          <div class="rou-bullet-title">为你的左轮装入子弹</div>
          <div class="chambers" id="chambers">
            ${Array.from({ length: 6 }, (_, i) => `<button class="chamber" data-i="${i}">${i + 1}</button>`).join('')}
          </div>
          <div class="rou-bullet-count">已装 <strong id="bullet-count">2</strong> 颗</div>
        </div>
      </div>
    `;
    for (const c of this.root.querySelectorAll<HTMLButtonElement>('.chamber')) {
      const i = parseInt(c.dataset.i ?? '0', 10);
      if (i < this.playerBullets) c.classList.add('loaded');
      c.addEventListener('click', () => {
        audio.click();
        if (c.classList.contains('loaded')) {
          c.classList.remove('loaded');
          this.playerBullets -= 1;
        } else {
          c.classList.add('loaded');
          this.playerBullets += 1;
        }
        $('#bullet-count', this.root!)!.textContent = String(this.playerBullets);
      });
    }
    this.stakePanel = stakePanel({
      min: 300,
      coins: save.coins,
      chips: [300, 500, 1000],
      label: '本局投入金',
      step: 100,
    });
    const wrap = el('div', 'stake-wrap');
    wrap.appendChild(this.stakePanel.root);
    const start = el('button', 'btn btn-gold btn-lg', '装入暗箱');
    start.addEventListener('click', () => {
      audio.click();
      const v = this.stakePanel!.getValue();
      if (director.save.coins < v) {
        toast('金币不足', '⚠️');
        return;
      }
      this.stake = v;
      void this.intoTheBox();
    });
    wrap.appendChild(start);
    this.root.appendChild(wrap);
  }

  private async intoTheBox(): Promise<void> {
    this.root?.classList.remove('stake-phase');
    this.busy = true;
    this.aiBullets = [1, 2, 2, 3, 3, 4][rndInt(0, 5)];
    this.root!.innerHTML = `
      <div class="rou-stage rou-boxing">
        <div class="rou-boxing-text">两把左轮正在沉入暗箱…</div>
        <div class="rou-guns">
          <div class="rou-gun">🔫<span>你的左轮（${this.playerBullets} 弹）</span></div>
          <div class="rou-gun">🔫<span>对手的左轮（弹数保密）</span></div>
        </div>
        <div class="rou-darkbox">📦</div>
      </div>
    `;
    await this.wait(500);
    const guns = this.root!.querySelectorAll('.rou-gun');
    guns.forEach((g, i) => {
      (g as HTMLElement).style.transition = 'transform 700ms cubic-bezier(.5,0,.8,.4), opacity 500ms';
      (g as HTMLElement).style.transform = `translateY(${90 + i * 30}px) scale(.6)`;
      (g as HTMLElement).style.opacity = '0.4';
    });
    audio.lose();
    await this.wait(900);
    this.buildArrange();
  }

  private buildArrange(): void {
    this.state = 'arrange';
    this.busy = false;
    this.publicOrder = shuffle([1, 2, 3, 4, 5, 6]);
    this.aiOrder = shuffle([1, 2, 3, 4, 5, 6]);
    this.playerOrder = [];
    this.selectedCard = null;
    this.root!.innerHTML = `
      <div class="rou-stage rou-arrange">
        <div class="rou-phase-title">红桃排列 · 双方秘密排牌</div>
        <div class="rou-public-label hidden" id="rou-public-label">公开排列（现在揭晓）</div>
        <div class="rou-row hidden" id="rou-public">
          ${this.publicOrder.map((v) => this.heartCard(v)).join('')}
        </div>
        <div class="rou-my-label">把你的红桃按心中顺序放入孔位（对手看不到）</div>
        <div class="rou-row" id="rou-my-cards">
          ${[1, 2, 3, 4, 5, 6].map((v) => this.heartCard(v)).join('')}
        </div>
        <div class="rou-row slots" id="rou-my-slots">
          ${Array.from({ length: 6 }, () => '<div class="rou-slot"></div>').join('')}
        </div>
        <div class="rou-ai-row hidden" id="rou-ai-row">
          <div class="rou-my-label">对手的排列</div>
          <div class="rou-row" id="rou-ai-cards"></div>
        </div>
        <div class="rou-msg" id="rou-msg"></div>
        <button class="btn btn-gold btn-lg" id="rou-reveal" disabled>揭开公开排列</button>
      </div>
    `;
    this.ai = createAiAvatar('黑衣客');
    const stage = $('.rou-stage.rou-arrange', this.root!);
    stage?.prepend(this.ai.root);
    this.ai.setMood('thinking', '排牌中…');
    this.bindArrange();
  }

  private heartCard(v: number): string {
    const label = HEART_LABELS[v - 1];
    return `<div class="rou-heart-card" data-v="${v}"><span>${label}</span><i>♥</i></div>`;
  }

  private bindArrange(): void {
    const cards = this.root!.querySelectorAll('#rou-my-cards .rou-heart-card');
    cards.forEach((c) => {
      c.addEventListener('click', () => {
        audio.click();
        const v = parseInt((c as HTMLElement).dataset.v ?? '0', 10);
        if (this.playerOrder.includes(v)) return;
        this.playerOrder.push(v);
        (c as HTMLElement).classList.add('used');
        this.renderSlots();
      });
    });
    const slots = this.root!.querySelectorAll('#rou-my-slots .rou-slot');
    slots.forEach((s, idx) => {
      s.addEventListener('click', () => {
        if (idx >= this.playerOrder.length) return;
        audio.click();
        const removed = this.playerOrder[idx];
        this.playerOrder = this.playerOrder.filter((_, i) => i !== idx);
        const card = this.root!.querySelector(`#rou-my-cards [data-v="${removed}"]`);
        card?.classList.remove('used');
        this.renderSlots();
      });
    });
    const reveal = $('#rou-reveal', this.root!) as HTMLButtonElement | null;
    reveal?.addEventListener('click', () => {
      audio.click();
      void this.revealMatch();
    });
  }

  private renderSlots(): void {
    const slots = this.root!.querySelectorAll('#rou-my-slots .rou-slot');
    slots.forEach((s, i) => {
      s.innerHTML = i < this.playerOrder.length ? this.heartCard(this.playerOrder[i]) : '';
    });
    const reveal = $('#rou-reveal', this.root!) as HTMLButtonElement | null;
    if (reveal) reveal.disabled = this.playerOrder.length !== 6;
  }

  private async revealMatch(): Promise<void> {
    if (this.busy || this.state !== 'arrange') return;
    this.busy = true;
    const reveal = $('#rou-reveal', this.root!) as HTMLButtonElement | null;
    if (reveal) reveal.disabled = true;
    const aiRow = $('#rou-ai-row', this.root!);
    const publicRow = $('#rou-public', this.root!);
    const publicLabel = $('#rou-public-label', this.root!);
    if (publicRow) publicRow.classList.remove('hidden');
    if (publicLabel) publicLabel.classList.remove('hidden');
    if (aiRow) {
      aiRow.classList.remove('hidden');
      $('#rou-ai-cards', this.root!)!.innerHTML = this.aiOrder
        .map((v) => this.heartCard(v))
        .join('');
    }
    const pMatch = this.publicOrder.filter((v, i) => this.playerOrder[i] === v).length;
    const aMatch = this.publicOrder.filter((v, i) => this.aiOrder[i] === v).length;
    this.lastMatch = { p: pMatch, a: aMatch };
    const msg = $('#rou-msg', this.root!)!;
    msg.textContent = `你的匹配 ${pMatch} · 对手匹配 ${aMatch}`;
    await this.wait(1200);
    if (pMatch === aMatch) {
      msg.textContent = '匹配数相同，无人开枪，平局。';
      audio.draw();
      this.settle('draw', '转盘平局', '匹配数相同，无人扣动扳机');
      return;
    }
    this.shooter = pMatch > aMatch ? 'player' : 'ai';
    this.shots = Math.abs(pMatch - aMatch);
    msg.textContent = `${this.shooter === 'player' ? '你' : '对手'}成为枪手，将开 ${this.shots} 枪`;
    await this.wait(1500);
    this.buildFire();
  }

  private buildFire(): void {
    this.state = 'fire';
    this.drawnGun = Math.random() < 0.5 ? 'player' : 'ai';
    const shooterName = this.shooter === 'player' ? '你' : '对手';
    const gunName =
      this.drawnGun === 'player'
        ? `你的左轮（${this.playerBullets} 弹）`
        : '对手的左轮（弹数保密）';
    this.root!.innerHTML = `
      <div class="rou-stage rou-fire">
        <div class="rou-phase-title">生死一线</div>
        <div class="rou-fire-info">
          ${shooterName}从暗箱随机取出了 <strong>${gunName}</strong>，瞄准对方，连扣 ${this.shots} 次扳机。
        </div>
        <div class="rou-duel">
          <div class="rou-duel-side" id="rou-shooter">
            <div class="rou-duel-label">${this.shooter === 'player' ? '你（枪手）' : '对手（枪手）'}</div>
            <div class="rou-gun-wrap"><span class="rou-gun-emoji" id="rou-gun-emoji">🔫</span></div>
          </div>
          <div class="rou-duel-mid" id="rou-duel-msg">转动弹巢…</div>
          <div class="rou-duel-side" id="rou-target">
            <div class="rou-duel-label">${this.shooter === 'player' ? '对手' : '你'}</div>
            <div class="rou-target-emoji">🤖</div>
          </div>
        </div>
      </div>
    `;
    const aiSide = this.shooter === 'ai' ? '#rou-shooter' : '#rou-target';
    const sideEl = $(aiSide, this.root!);
    if (sideEl) {
      this.ai = createAiAvatar('黑衣客');
      sideEl.appendChild(this.ai.root);
      if (this.shooter === 'ai') this.ai.setMood('smug', '轮到我了');
      else this.ai.setMood('angry', '别…别开枪！');
    }
    void this.runFire();
  }

  private async runFire(): Promise<void> {
    const bullets = this.drawnGun === 'player' ? this.playerBullets : this.aiBullets;
    const chambers = Array(6).fill(false);
    for (let i = 0; i < bullets; i++) chambers[i] = true;
    const order = shuffle(chambers);
    const start = rndInt(0, 5);
    const gun = $('#rou-gun-emoji', this.root!)!;
    const msg = $('#rou-duel-msg', this.root!)!;
    const target = $('#rou-target', this.root!)!;
    let fired = false;
    for (let s = 0; s < this.shots; s++) {
      await this.wait(700);
      if (this.state !== 'fire') return;
      msg.textContent = `第 ${s + 1} 枪：弹巢转动…`;
      gun.classList.add('spin');
      audio.cardFlip();
      await this.wait(800);
      gun.classList.remove('spin');
      const idx = (start + s) % 6;
      if (order[idx]) {
        fired = true;
        msg.textContent = '砰——！命中！';
        audio.shot();
        gun.classList.add('fire');
        target.classList.add('shot');
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2.3;
        domShockwave(cx, cy, '#ff8f5e');
        domSparkle(cx, cy, '#ff6b6b', 30);
        await this.wait(1200);
        if (this.shooter === 'player') {
          winFlash();
          domConfetti(window.innerWidth / 2, window.innerHeight / 2.6, 44);
          audio.win();
          this.ai?.setMood('angry', '呃啊…');
          this.settle('win', '死神扣动', '开火成功，你带走了本局投入');
        } else {
          audio.lose();
          this.ai?.setMood('smug', '砰——！');
          this.settle('loss', '枪响人伤', '对手开火成功，投入归对方所有');
        }
        return;
      }
      msg.textContent = '咔…空膛，继续下一枪';
      audio.dryFire();
      target.classList.add('flinch');
      await this.wait(500);
      target.classList.remove('flinch');
    }
    msg.textContent = '所有子弹都是空膛，平局。';
    audio.draw();
    await this.wait(900);
    this.settle('draw', '空膛平局', `${this.shots} 枪全部未开火`);
  }

  private settle(
    outcome: 'win' | 'loss' | 'draw',
    title: string,
    subtitle: string,
  ): void {
    if (this.state === 'settled') return;
    this.state = 'settled';
    if (outcome === 'win') this.ai?.setMood('angry', '哼…');
    else if (outcome === 'loss') this.ai?.setMood('smug', '我赢了');
    else this.ai?.setMood('neutral', '平局');
    const delta =
      outcome === 'win' ? this.stake : outcome === 'loss' ? -this.stake : 0;
    const detail = `<div class="row"><span>你的匹配</span><strong>${this.lastMatch?.p ?? 0} 张</strong></div><div class="row"><span>对手匹配</span><strong>${this.lastMatch?.a ?? 0} 张</strong></div><div class="row"><span>开枪次数</span><strong>${this.shots} 次</strong></div>`;
    director.settle({
      kind: 'roulette',
      outcome,
      deltaCoins: delta,
      stats: { rouletteFireWins: outcome === 'win' ? 1 : 0 },
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
      againLabel: '再开一局',
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
