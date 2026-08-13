import { el } from './dom';

let fxRootEl: HTMLElement | null = null;

const root = (): HTMLElement => {
  if (!fxRootEl || !fxRootEl.isConnected) {
    fxRootEl = document.createElement('div');
    fxRootEl.id = 'fx-layer';
    document.body.appendChild(fxRootEl);
  }
  return fxRootEl;
};

const cleanup = (node: HTMLElement, ms: number): void => {
  window.setTimeout(() => node.remove(), ms);
};

const vw = (): number => window.innerWidth;
const vh = (): number => window.innerHeight;

export function domSparkle(
  x: number,
  y: number,
  color = '#ffd166',
  count = 14,
): void {
  const r = root();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    s.className = 'fx-spark';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--c', color);
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 110;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    r.appendChild(s);
    cleanup(s, 850);
  }
}

export function domConfetti(
  x: number,
  y: number,
  count = 46,
  colors = ['#ffd166', '#ff8fab', '#7ee8fa', '#b6ffa1', '#c9a7ff', '#ffffff'],
): void {
  const r = root();
  for (let i = 0; i < count; i++) {
    const c = document.createElement('i');
    c.className = 'fx-confetti';
    c.style.left = `${x + (Math.random() - 0.5) * 60}px`;
    c.style.top = `${y}px`;
    c.style.setProperty('--c', colors[i % colors.length]);
    const dx = (Math.random() - 0.5) * 460;
    const dy = -(60 + Math.random() * 320);
    c.style.setProperty('--dx', `${dx}px`);
    c.style.setProperty('--dy', `${dy}px`);
    c.style.setProperty('--rot', `${(Math.random() - 0.5) * 900}deg`);
    r.appendChild(c);
    cleanup(c, 1700);
  }
}

export function domFloatText(
  x: number,
  y: number,
  text: string,
  color = '#ffd166',
  size = 26,
): void {
  const t = el(
    'div',
    'fx-float',
    text,
  ) as HTMLElement;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
  t.style.color = color;
  t.style.fontSize = `${size}px`;
  root().appendChild(t);
  cleanup(t, 1250);
}

export function domShockwave(x: number, y: number, color = '#ffd166'): void {
  const ring = document.createElement('i');
  ring.className = 'fx-ring';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.setProperty('--c', color);
  root().appendChild(ring);
  cleanup(ring, 750);
}

export function domCoinBurst(x: number, y: number, count = 12): void {
  const r = root();
  for (let i = 0; i < count; i++) {
    const c = document.createElement('span');
    c.className = 'fx-coin';
    c.textContent = '🪙';
    c.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    c.style.top = `${y}px`;
    const dx = (Math.random() - 0.5) * 220;
    const dy = -(80 + Math.random() * 180);
    c.style.setProperty('--dx', `${dx}px`);
    c.style.setProperty('--dy', `${dy}px`);
    r.appendChild(c);
    cleanup(c, 1100);
  }
}

export interface SwordFlight {
  from: { x: number; y: number };
  to: { x: number; y: number };
  duration?: number;
}

export function domSword(flight: SwordFlight): Promise<void> {
  const { from, to } = flight;
  const duration = flight.duration ?? 780;
  const s = document.createElement('div');
  s.className = 'fx-sword';
  s.textContent = '🗡️';
  s.style.left = `${from.x}px`;
  s.style.top = `${from.y}px`;
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 135;
  s.style.transform = `translate(0, 0) rotate(${angle}deg)`;
  root().appendChild(s);
  const trail = window.setInterval(() => {
    domSparkle(from.x, from.y, '#ffe08a', 1);
  }, 90);
  return new Promise((resolve) => {
    const anim = s.animate(
      [
        { transform: `translate(0, 0) rotate(${angle}deg)`, opacity: 1 },
        {
          transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) rotate(${angle}deg)`,
          opacity: 1,
        },
      ],
      { duration, easing: 'cubic-bezier(.25,.1,.3,1)' },
    );
    anim.onfinish = () => {
      window.clearInterval(trail);
      s.remove();
      resolve();
    };
    window.setTimeout(() => {
      window.clearInterval(trail);
      if (s.isConnected) {
        s.remove();
        resolve();
      }
    }, duration + 400);
  });
}

export function winFlash(): void {
  const f = document.createElement('div');
  f.className = 'fx-win-flash';
  root().appendChild(f);
  cleanup(f, 900);
}

export const fxViewport = (): { width: number; height: number } => ({
  width: vw(),
  height: vh(),
});
