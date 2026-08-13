import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.makeSpark();
    this.makeGlow();
    this.makeCoin();
    this.scene.start('TitleScene');
  }

  private makeSpark(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
    g.destroy();
  }

  private makeGlow(): void {
    const tex = this.textures.createCanvas('glow', 64, 64);
    if (!tex) return;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,245,214,1)');
    grad.addColorStop(0.35, 'rgba(255,214,130,0.55)');
    grad.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    tex.refresh();
  }

  private makeCoin(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xc98a1e, 1);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xf7c948, 1);
    g.fillCircle(12, 12, 10);
    g.fillStyle(0xffe08a, 1);
    g.fillCircle(12, 12, 7);
    g.lineStyle(1.5, 0x8a5a17, 1);
    g.strokeCircle(12, 12, 9);
    g.generateTexture('coin', 24, 24);
    g.destroy();
  }
}
