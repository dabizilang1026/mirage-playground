import Phaser from 'phaser';
import { director } from '../../game/director';
import { audio } from '../../game/sim/audio';
import { rndInt, shuffle } from '../../game/sim/rng';
import {
  clearSceneRoot,
  resultOverlay,
  updateHudCoins,
} from '../../ui/gameUi';
import { $, el, shake } from '../../ui/dom';
import { addEmbers } from '../fx';
import { domConfetti, domSparkle, winFlash } from '../../ui/domFx';

interface TrashType {
  id: string;
  label: string;
  emoji: string;
}

const TRASH_TYPES: TrashType[] = [
  { id: 'blue', label: '纸类', emoji: '🗞️' },
  { id: 'green', label: '玻璃', emoji: '🍾' },
  { id: 'yellow', label: '金属', emoji: '🥫' },
  { id: 'red', label: '有害', emoji: '🔋' },
];

export class CleaningScene extends Phaser.Scene {
  private total = 16;
  private placed = 0;
  private correct = 0;
  private wrong = 0;
  private earned = 0;
  private root: HTMLElement | null = null;
  private finished = false;

  constructor() {
    super('CleaningScene');
  }

  create(): void {
    document.body.dataset.scene = 'cleaning';
    addEmbers(this, 16);
    const container = document.getElementById('game-container');
    if (!container) return;
    clearSceneRoot(container);
    this.root = el('div', 'scene-root cleaning-root');
    container.appendChild(this.root);
    this.build();
  }

  private build(): void {
    if (!this.root) return;
    const room = el('div', 'room');
    room.innerHTML = `
      <div class="room-wall">
        <div class="room-window">🌙</div>
        <div class="room-shelf"><span>📚</span><span>🏺</span><span>🕯️</span></div>
        <div class="room-lamp">🪔</div>
      </div>
      <div class="room-floor"></div>
      <div class="room-play"></div>
      <div class="bins-row">
        ${TRASH_TYPES.map(
          (t) =>
            `<div class="bin bin-${t.id}" data-color="${t.id}"><div class="bin-lid"></div><div class="bin-body">♻</div><div class="bin-label">${t.label}</div></div>`,
        ).join('')}
      </div>
      <div class="cleaning-hud">
        <div class="cleaning-progress"><span id="clean-progress">0/${this.total}</span></div>
        <div class="cleaning-tip">把杂物拖进颜色对应的垃圾桶，放对一件 +2 金币</div>
      </div>
    `;
    this.root.appendChild(room);

    const play = $<HTMLElement>('.room-play', room)!;
    const pieces: string[] = [];
    TRASH_TYPES.forEach((t) => {
      for (let i = 0; i < this.total / TRASH_TYPES.length; i++) {
        pieces.push(t.id);
      }
    });
    const order = shuffle(pieces);
    for (const color of order) {
      const t = TRASH_TYPES.find((x) => x.id === color)!;
      const piece = el(
        'div',
        `trash-piece trash-${color}`,
        `<span class="trash-emoji">${t.emoji}</span>`,
      );
      piece.dataset.color = color;
      const x = 4 + Math.random() * 86;
      const y = 10 + Math.random() * 62;
      piece.style.left = `${x}%`;
      piece.style.top = `${y}%`;
      piece.addEventListener('pointerdown', (e) => this.startDrag(e, piece));
      play.appendChild(piece);
    }
  }

  private startDrag(e: PointerEvent, piece: HTMLElement): void {
    if (this.finished || piece.classList.contains('placed')) return;
    e.preventDefault();
    audio.click();
    piece.setPointerCapture(e.pointerId);
    piece.classList.add('dragging');
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = piece.getBoundingClientRect();
    const dx = startX - rect.left;
    const dy = startY - rect.top;

    const onMove = (ev: PointerEvent): void => {
      piece.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px)`;
      this.highlightBin(ev.clientX, ev.clientY, piece.dataset.color ?? '');
    };
    const onUp = (ev: PointerEvent): void => {
      piece.removeEventListener('pointermove', onMove);
      piece.removeEventListener('pointerup', onUp);
      piece.removeEventListener('pointercancel', onCancel);
      piece.classList.remove('dragging');
      this.clearBinHighlights();
      const hitEl = document.elementFromPoint(ev.clientX, ev.clientY);
      const target = hitEl instanceof HTMLElement
        ? hitEl.closest<HTMLElement>('.bin')
        : null;
      if (target && target.dataset.color === piece.dataset.color) {
        this.placeCorrect(piece, target);
      } else {
        this.placeWrong(piece, target);
      }
    };
    const onCancel = (): void => {
      piece.removeEventListener('pointermove', onMove);
      piece.removeEventListener('pointerup', onUp);
      piece.removeEventListener('pointercancel', onCancel);
      piece.classList.remove('dragging');
      piece.style.transform = '';
    };
    piece.addEventListener('pointermove', onMove);
    piece.addEventListener('pointerup', onUp);
    piece.addEventListener('pointercancel', onCancel);
  }

  private highlightBin(x: number, y: number, color: string): void {
    this.clearBinHighlights();
    const bin = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>('.bin');
    if (!bin) return;
    bin.classList.add('hover');
    if (bin.dataset.color === color) bin.classList.add('match');
    else bin.classList.add('mismatch');
  }

  private clearBinHighlights(): void {
    document.querySelectorAll('.bin').forEach((b) => {
      b.classList.remove('hover', 'match', 'mismatch');
    });
  }

  private placeCorrect(piece: HTMLElement, bin: HTMLElement): void {
    this.correct += 1;
    this.earned += 2;
    this.placed += 1;
    piece.classList.add('placed');
    const rect = piece.getBoundingClientRect();
    const binRect = bin.getBoundingClientRect();
    const tx = binRect.left + binRect.width / 2 - (rect.left + rect.width / 2);
    const ty = binRect.top + binRect.height / 2 - (rect.top + rect.height / 2);
    piece.style.transform = `translate(${tx}px, ${ty}px) scale(0.2)`;
    piece.style.transition = 'transform 320ms cubic-bezier(.2,.9,.3,1.4)';
    audio.coin();
    domSparkle(
      binRect.left + binRect.width / 2,
      binRect.top + binRect.height / 2,
      '#ffd166',
      16,
    );
    this.updateProgress();
    window.setTimeout(() => {
      piece.style.opacity = '0';
      piece.style.transition = 'opacity 200ms';
    }, 300);
    window.setTimeout(() => {
      piece.remove();
      this.checkDone();
    }, 560);
  }

  private placeWrong(piece: HTMLElement, bin: HTMLElement | null): void {
    this.wrong += 1;
    this.placed += 1;
    shake(piece);
    audio.lose();
    if (bin) {
      const r = bin.getBoundingClientRect();
      domSparkle(r.left + r.width / 2, r.top + r.height / 2, '#ff6b6b', 10);
    }
    piece.style.transform = '';
    this.updateProgress();
    this.checkDone();
  }

  private updateProgress(): void {
    const p = $('#clean-progress');
    if (p) p.textContent = `${this.placed}/${this.total}`;
    updateHudCoins(this.earned);
  }

  private checkDone(): void {
    if (this.finished || this.placed < this.total) return;
    this.finished = true;
    const center = window.innerWidth / 2;
    if (this.wrong === 0) winFlash();
    domConfetti(center, window.innerHeight / 3, 46);
    const outcome = this.wrong === 0 ? 'win' : this.correct >= 12 ? 'win' : 'loss';
    director.settle({
      kind: 'cleaning',
      outcome,
      deltaCoins: this.earned,
      stats: {
        cleaningCorrect: this.correct,
        cleaningWrong: this.wrong,
        cleaningPerfect: this.wrong === 0 ? 1 : 0,
      },
      title:
        this.wrong === 0
          ? '一尘不染！'
          : this.correct >= 12
            ? '清扫完成'
            : '还需要练习',
      subtitle: `正确 ${this.correct} 件 · 失误 ${this.wrong} 件`,
      detail: `<div class="row"><span>正确分类</span><strong>${this.correct} 件（+${this.correct * 2}）</strong></div><div class="row ${this.wrong > 0 ? 'neg' : ''}"><span>放错</span><strong>${this.wrong} 件</strong></div>`,
    });
    if (director.save.defeated) return;
    resultOverlay({
      title:
        this.wrong === 0
          ? '一尘不染！'
          : this.correct >= 12
            ? '清扫完成'
            : '还需要练习',
      subtitle: `正确 ${this.correct} 件 · 失误 ${this.wrong} 件`,
      detail: `<div class="row"><span>正确分类</span><strong>${this.correct} 件（+${this.correct * 2}）</strong></div><div class="row ${this.wrong > 0 ? 'neg' : ''}"><span>放错</span><strong>${this.wrong} 件</strong></div>`,
      delta: this.earned,
      outcome,
      onAgain: () => director.replay(),
      onExit: () => director.exitToHub(),
      againLabel: '再扫一次',
    });
  }
}
