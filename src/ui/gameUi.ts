import { el, fmtCoins, modal, $ } from './dom';
import { audio } from '../game/sim/audio';
import { director } from '../game/director';

export interface StakePanel {
  root: HTMLElement;
  value: number;
  getValue: () => number;
  setEnabled: (v: boolean) => void;
  setMax: (v: number) => void;
  onChange: (cb: (v: number) => void) => void;
}

export function stakePanel(opts: {
  min: number;
  coins: number;
  chips?: number[];
  label?: string;
  step?: number;
}): StakePanel {
  const { min, coins } = opts;
  const step = opts.step ?? Math.max(10, Math.round(min / 2));
  const chips = (opts.chips ?? [50, 100, 200, 500, 1000]).filter(
    (c) => c >= min,
  );
  let value = min;
  let enabled = true;
  let max = Math.max(min, coins);
  let onChangeCb: ((v: number) => void) | null = null;

  const valueEl = el('span', 'stake-value', fmtCoins(value));
  const root = el(
    'div',
    'stake-panel',
    `<div class="stake-label">${opts.label ?? '本局投入金'}</div>`,
  );
  const row = el('div', 'stake-row');
  const minus = el('button', 'btn btn-ghost stake-btn', '−');
  const plus = el('button', 'btn btn-ghost stake-btn', '+');
  row.append(minus, valueEl, plus);
  root.appendChild(row);

  const chipRow = el('div', 'stake-chips');
  for (const c of chips) {
    const chip = el('button', 'chip-btn', `${fmtCoins(c)}`);
    chip.addEventListener('click', () => set(value + c));
    chipRow.appendChild(chip);
  }
  root.appendChild(chipRow);
  root.appendChild(
    el(
      'div',
      'stake-hint',
      `可用金币 ${fmtCoins(coins)} · 单次投入 ${fmtCoins(min)} 起`,
    ),
  );

  const refresh = (): void => {
    valueEl.textContent = fmtCoins(value);
    minus.classList.toggle('disabled', value <= min);
    plus.classList.toggle('disabled', value >= max);
    onChangeCb?.(value);
  };

  const set = (v: number): void => {
    if (!enabled) return;
    const next = Math.min(max, Math.max(min, Math.round(v / step) * step));
    if (next === value && v >= value) return;
    value = Math.min(max, Math.max(min, v));
    audio.click();
    refresh();
  };

  minus.addEventListener('click', () => set(value - step));
  plus.addEventListener('click', () => set(value + step));
  refresh();

  return {
    root,
    value,
    getValue: () => value,
    setEnabled: (v) => {
      enabled = v;
      root.classList.toggle('disabled', !v);
    },
    setMax: (v) => {
      max = Math.max(min, v);
      if (value > max) {
        value = max;
        refresh();
      } else refresh();
    },
    onChange: (cb) => {
      onChangeCb = cb;
    },
  };
}

export function resultOverlay(opts: {
  title: string;
  subtitle: string;
  delta: number;
  outcome: 'win' | 'loss' | 'draw';
  detail?: string;
  onAgain?: () => void;
  onExit: () => void;
  againLabel?: string;
}): void {
  const host = document.getElementById('game-container');
  if (!host) return;
  const overlay = el(
    'div',
    `result-overlay outcome-${opts.outcome}`,
    `
      <div class="result-banner">
        <div class="result-title">${opts.title}</div>
        <div class="result-sub">${opts.subtitle}</div>
        <div class="result-delta">${
          opts.delta > 0 ? `+${fmtCoins(opts.delta)}` : opts.delta < 0 ? `${fmtCoins(opts.delta)}` : '金币不变'
        } 金币</div>
        ${opts.detail ? `<div class="result-detail">${opts.detail}</div>` : ''}
      </div>
    `,
  );
  const foot = el('div', 'result-actions');
  if (opts.onAgain) {
    const again = el('button', 'btn btn-gold btn-lg', opts.againLabel ?? '再来一局');
    again.addEventListener('click', () => {
      overlay.remove();
      opts.onAgain?.();
    });
    foot.appendChild(again);
  }
  const exit = el('button', 'btn btn-ghost btn-lg', '返回主厅');
  exit.addEventListener('click', () => {
    overlay.remove();
    opts.onExit();
  });
  foot.appendChild(exit);
  overlay.appendChild(foot);
  host.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
}

export function prizeLine(
  title: string,
  body: string,
  amount: number,
): void {
  const b = el(
    'div',
    'prize-body',
    `<div class="prize-text"><strong>${title}</strong><div>${body}</div></div><div class="prize-coins">🪙 ${fmtCoins(amount)}</div>`,
  );
  modal({
    title: '获得金币',
    body: b,
    actions: [{ label: '收下', cls: 'btn-gold', onClick: (c) => c() }],
    width: 420,
  });
}

export function updateHudCoins(pending = 0): void {
  const save = director.save;
  const elm = $('#hud-coins');
  if (elm) elm.innerHTML = `🪙 ${fmtCoins(save.coins + pending)}`;
}

export function clearSceneRoot(container: HTMLElement): void {
  const olds = container.querySelectorAll('.scene-root');
  olds.forEach((o) => o.remove());
}
