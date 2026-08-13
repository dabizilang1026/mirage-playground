import { el } from './dom';

export type AiMood = 'neutral' | 'thinking' | 'smug' | 'angry' | 'happy';

const FACES: Record<AiMood, string> = {
  neutral: '😐',
  thinking: '🤔',
  smug: '😏',
  angry: '😠',
  happy: '😄',
};

export interface AiAvatar {
  root: HTMLElement;
  setMood(mood: AiMood, words?: string): void;
}

export function createAiAvatar(name = 'AI 对手'): AiAvatar {
  const root = el(
    'div',
    'ai-avatar mood-neutral',
    `
      <div class="ai-face">😐</div>
      <div class="ai-name">${name}</div>
      <div class="ai-bubble"></div>
    `,
  );
  const face = root.querySelector<HTMLElement>('.ai-face')!;
  const bubble = root.querySelector<HTMLElement>('.ai-bubble')!;
  let timer = 0;
  return {
    root,
    setMood(mood, words) {
      root.classList.remove(
        'mood-neutral',
        'mood-thinking',
        'mood-smug',
        'mood-angry',
        'mood-happy',
      );
      root.classList.add(`mood-${mood}`);
      face.textContent = FACES[mood];
      if (words) {
        bubble.textContent = words;
        bubble.classList.add('show');
        window.clearTimeout(timer);
        timer = window.setTimeout(() => bubble.classList.remove('show'), 2400);
      }
    },
  };
}
