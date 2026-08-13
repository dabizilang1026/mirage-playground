export const $ = <T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T | null => root.querySelector<T>(selector);

export function el<T extends HTMLElement = HTMLDivElement>(
  tag: string,
  cls = '',
  html = '',
): T {
  const node = document.createElement(tag) as T;
  if (cls) node.className = cls;
  if (html) node.innerHTML = html;
  return node;
}

export const fmtCoins = (n: number): string =>
  Math.round(n).toLocaleString('zh-CN');

export function shake(elm: HTMLElement): void {
  elm.classList.remove('shake');
  void elm.offsetWidth;
  elm.classList.add('shake');
}

export function pop(elm: HTMLElement): void {
  elm.classList.remove('pop-in');
  void elm.offsetWidth;
  elm.classList.add('pop-in');
}

export function toast(msg: string, icon = '✦'): void {
  const root = $('#toast-root');
  if (!root) return;
  const t = el('div', 'toast', `<span class="toast-icon">${icon}</span><span>${msg}</span>`);
  root.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  window.setTimeout(() => {
    t.classList.remove('show');
    window.setTimeout(() => t.remove(), 350);
  }, 2600);
}

export interface ModalOptions {
  title: string;
  body: HTMLElement;
  actions?: Array<{
    label: string;
    cls?: string;
    onClick: (close: () => void) => void;
  }>;
  width?: number;
  onClose?: () => void;
  closable?: boolean;
}

export function modal(opts: ModalOptions): { root: HTMLElement; close: () => void } {
  const root = $('#modal-root');
  if (!root) throw new Error('modal root missing');
  const overlay = el('div', 'modal-overlay');
  const box = el(
    'div',
    'modal-box',
    `<div class="modal-head"><span class="modal-title">${opts.title}</span></div>`,
  );
  if (opts.width) box.style.width = `${opts.width}px`;
  const bodyWrap = el('div', 'modal-body');
  bodyWrap.appendChild(opts.body);
  box.appendChild(bodyWrap);
  if (opts.actions && opts.actions.length) {
    const foot = el('div', 'modal-foot');
    for (const a of opts.actions) {
      const btn = el(
        'button',
        `btn ${a.cls ?? 'btn-gold'}`,
        a.label,
      );
      btn.addEventListener('click', () => a.onClick(close));
      foot.appendChild(btn);
    }
    box.appendChild(foot);
  }
  overlay.appendChild(box);
  root.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = (): void => {
    overlay.classList.remove('show');
    window.setTimeout(() => {
      overlay.remove();
      opts.onClose?.();
    }, 220);
  };
  if (opts.closable !== false) {
    overlay.addEventListener('pointerdown', (e) => {
      if (e.target === overlay) close();
    });
  }
  return { root: overlay, close };
}

export function confirmModal(
  title: string,
  body: string,
  onYes: () => void,
  yesLabel = '确认',
  danger = false,
): void {
  const b = el('div', 'confirm-body', body);
  modal({
    title,
    body: b,
    actions: [
      {
        label: '取消',
        cls: 'btn-ghost',
        onClick: (close) => close(),
      },
      {
        label: yesLabel,
        cls: danger ? 'btn-danger' : 'btn-gold',
        onClick: (close) => {
          close();
          onYes();
        },
      },
    ],
  });
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
