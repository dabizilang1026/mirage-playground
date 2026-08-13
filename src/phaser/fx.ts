import Phaser from 'phaser';

export function sparkle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffd166,
  count = 14,
): void {
  const p = scene.add.particles(x, y, 'spark', {
    speed: { min: 70, max: 240 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.1, end: 0 },
    lifespan: { min: 320, max: 700 },
    tint: color,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  p.explode(count);
  scene.time.delayedCall(900, () => p.destroy());
}

export function confetti(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count = 42,
  colors = [0xffd166, 0xff8fab, 0x7ee8fa, 0xb6ffa1, 0xc9a7ff],
): void {
  const p = scene.add.particles(x, y, 'spark', {
    speed: { min: 180, max: 460 },
    angle: { min: -160, max: -20 },
    gravityY: 420,
    scale: { start: 1.6, end: 0.3 },
    lifespan: { min: 900, max: 1800 },
    tint: colors,
    emitting: false,
  });
  p.explode(count);
  scene.time.delayedCall(2200, () => p.destroy());
}

export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffd166',
  size = 26,
): void {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: '"Microsoft YaHei","PingFang SC",sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(90);
  scene.tweens.add({
    targets: t,
    y: y - 64,
    alpha: 0,
    duration: 1100,
    ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

export function shockwave(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffd166,
  radius = 60,
): void {
  const g = scene.add.graphics().setDepth(80);
  g.fillStyle(0xffffff, 0);
  const steps = 14;
  let i = 0;
  scene.time.addEvent({
    delay: 24,
    repeat: steps,
    callback: () => {
      i += 1;
      const r = (radius * i) / steps;
      g.clear();
      g.lineStyle(3, color, 1 - i / steps);
      g.strokeCircle(x, y, r);
      if (i >= steps) g.destroy();
    },
  });
}

export function addEmbers(scene: Phaser.Scene, count = 26): void {
  const { width, height } = scene.scale;
  const p = scene.add.particles(0, height + 20, 'spark', {
    x: { min: 0, max: width },
    y: { min: height, max: height + 10 },
    lifespan: { min: 6000, max: 13000 },
    speedY: { min: -28, max: -10 },
    speedX: { min: -12, max: 12 },
    scale: { start: 0.9, end: 0 },
    alpha: { start: 0.55, end: 0 },
    tint: [0xffd166, 0xff9e5e, 0xff7bac, 0x9ecbff],
    blendMode: Phaser.BlendModes.ADD,
    frequency: count > 0 ? 13000 / count : 0,
    quantity: 1,
  });
  p.setDepth(-50);
}

export function addDriftOrbs(scene: Phaser.Scene, count = 7): void {
  const { width, height } = scene.scale;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 14 + Math.random() * 40;
    const c = scene.add.image(x, y, 'glow').setDepth(-40).setScale(size / 64).setAlpha(0.05 + Math.random() * 0.08);
    scene.tweens.add({
      targets: c,
      x: x + (Math.random() - 0.5) * 180,
      y: y - 40 - Math.random() * 80,
      alpha: { from: c.alpha, to: 0.02 },
      scale: c.scale * 1.4,
      duration: 6000 + Math.random() * 8000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 4000,
    });
  }
}

export function coinBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count = 10,
): void {
  const p = scene.add.particles(x, y, 'coin', {
    speed: { min: 90, max: 240 },
    angle: { min: -150, max: -30 },
    gravityY: 300,
    scale: { start: 0.9, end: 0.4 },
    lifespan: { min: 500, max: 1000 },
    emitting: false,
  });
  p.explode(count);
  scene.time.delayedCall(1200, () => p.destroy());
}
