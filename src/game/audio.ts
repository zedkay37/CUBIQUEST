import type { ElementType } from './types';

class ToyboxAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(val: boolean): void {
    this.muted = val;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.12,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playUiClick(): void {
    const jitter = 0.96 + Math.random() * 0.08;
    this.playTone(540 * jitter, 720 * jitter, 0.06, 'triangle', 0.08);
  }

  public playHit(heavy = false, crit = false): void {
    const jitter = 0.92 + Math.random() * 0.16;
    if (crit) {
      this.playTone(220 * jitter, 90, 0.14, 'sawtooth', 0.14);
      this.playTone(880 * jitter, 1320 * jitter, 0.11, 'square', 0.07, 0.02);
    } else if (heavy) {
      this.playTone(170 * jitter, 58, 0.14, 'triangle', 0.15);
    } else {
      this.playTone(300 * jitter, 140 * jitter, 0.07, 'triangle', 0.07);
    }
  }

  public playSkill(element: ElementType): void {
    const map: Record<ElementType, [number, number, OscillatorType]> = {
      fire: [240, 560, 'sawtooth'],
      water: [360, 680, 'sine'],
      grass: [440, 740, 'triangle'],
      electric: [680, 1240, 'square'],
      rock: [130, 70, 'triangle'],
      psychic: [520, 960, 'sine'],
    };
    const [f1, f2, wave] = map[element];
    this.playTone(f1, f2, 0.18, wave, 0.11);
    this.playTone(f2 * 0.75, f2 * 1.15, 0.14, 'triangle', 0.07, 0.06);
  }

  public playScatter(): void {
    this.playTone(380, 920, 0.14, 'triangle', 0.12);
    this.playTone(520, 1180, 0.12, 'sine', 0.08, 0.05);
  }

  public playTelegraph(): void {
    this.playTone(290, 480, 0.24, 'sawtooth', 0.07);
  }

  public playKo(): void {
    this.playTone(280, 75, 0.24, 'sawtooth', 0.11);
  }

  public playCookBubble(): void {
    this.playTone(260, 520, 0.09, 'sine', 0.09);
    this.playTone(340, 640, 0.09, 'sine', 0.08, 0.09);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.01, 0.18, 'triangle', 0.11, i * 0.11);
    });
  }

  public playDefeat(): void {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, i) => {
      this.playTone(n, n * 0.98, 0.22, 'sawtooth', 0.08, i * 0.14);
    });
  }

  public playEvolution(): void {
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.03, 0.17, 'triangle', 0.12, i * 0.09);
    });
  }

  public playReaction(): void {
    this.playTone(587.33, 880, 0.12, 'triangle', 0.13, 0);
    this.playTone(880, 1318.5, 0.14, 'sine', 0.1, 0.05);
  }

  public playUltimate(): void {
    this.playTone(196, 98, 0.34, 'sawtooth', 0.14, 0);
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((n, i) => {
      this.playTone(n, n * 1.08, 0.32, 'triangle', 0.12, 0.05 + i * 0.045);
    });
  }

  public playBossPhase(): void {
    this.playTone(220, 110, 0.3, 'sawtooth', 0.14, 0);
    this.playTone(164.81, 82.41, 0.36, 'square', 0.09, 0.12);
  }

  public playPerfectDodge(): void {
    this.playTone(783.99, 1174.66, 0.11, 'sine', 0.12, 0);
    this.playTone(1174.66, 1567.98, 0.12, 'triangle', 0.09, 0.05);
  }

  public playRewardClaim(): void {
    const notes = [659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.02, 0.14, 'triangle', 0.11, i * 0.07);
    });
  }
}

export const soundFx = new ToyboxAudio();
