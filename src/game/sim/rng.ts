export const rnd = (min = 0, max = 1): number => min + Math.random() * (max - min);

export const rndInt = (min: number, max: number): number =>
  Math.floor(rnd(min, max + 1));

export const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const chance = (p: number): boolean => Math.random() < p;

export const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
