type ToneType = OscillatorType;

class AudioManager {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  tone(
    freq: number,
    dur = 0.12,
    type: ToneType = 'sine',
    vol = 0.12,
    delay = 0,
    slideTo?: number,
  ): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  unlock(): void {
    this.ensure();
  }

  click(): void {
    this.tone(520, 0.05, 'triangle', 0.06);
  }

  hover(): void {
    this.tone(660, 0.03, 'sine', 0.02);
  }

  coin(): void {
    this.tone(880, 0.07, 'sine', 0.1);
    this.tone(1318, 0.12, 'sine', 0.1, 0.06);
  }

  cardFlip(): void {
    this.tone(240, 0.07, 'triangle', 0.06);
    this.tone(320, 0.06, 'triangle', 0.05, 0.05);
  }

  win(): void {
    this.tone(523, 0.1, 'triangle', 0.1);
    this.tone(659, 0.1, 'triangle', 0.1, 0.09);
    this.tone(784, 0.16, 'triangle', 0.12, 0.18);
    this.tone(1046, 0.24, 'sine', 0.12, 0.28);
  }

  lose(): void {
    this.tone(330, 0.14, 'sawtooth', 0.05);
    this.tone(247, 0.18, 'sawtooth', 0.05, 0.12);
    this.tone(165, 0.28, 'sawtooth', 0.05, 0.28);
  }

  draw(): void {
    this.tone(392, 0.12, 'triangle', 0.08);
    this.tone(392, 0.12, 'triangle', 0.08, 0.16);
  }

  shot(): void {
    this.tone(140, 0.22, 'sawtooth', 0.18, 0, 60);
    this.tone(90, 0.3, 'square', 0.1, 0.02, 40);
  }

  dryFire(): void {
    this.tone(900, 0.04, 'square', 0.04);
    this.tone(500, 0.05, 'square', 0.04, 0.05);
  }

  sword(): void {
    this.tone(700, 0.18, 'sawtooth', 0.08, 0, 180);
    this.tone(140, 0.14, 'sine', 0.1, 0.1);
  }

  cashout(): void {
    this.coin();
    this.coin();
    this.tone(1174, 0.2, 'sine', 0.1, 0.12);
  }
}

export const audio = new AudioManager();
