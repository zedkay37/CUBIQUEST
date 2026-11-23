import type { ElementType } from './types';

class ToyboxAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;
  private lastImpactAt = 0;

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

  /** Bruit blanc filtré (souffle, crépitement, tonnerre) — un seul buffer partagé. */
  private playNoise(
    duration: number,
    filterType: BiquadFilterType,
    freqStart: number,
    freqEnd: number,
    gainPeak = 0.1,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  /** Texture sonore d'impact par élément (limitée à ~16/s pour les attaques de zone). */
  public playElementImpact(element: ElementType, heavy = false): void {
    const t = typeof performance !== 'undefined' ? performance.now() : 0;
    if (t - this.lastImpactAt < 60) return;
    this.lastImpactAt = t;
    const g = heavy ? 1 : 0.6;
    switch (element) {
      case 'fire':
        this.playNoise(0.18, 'lowpass', 1900, 320, 0.09 * g);
        break;
      case 'water':
        this.playTone(720, 260, 0.1, 'sine', 0.07 * g);
        this.playNoise(0.12, 'bandpass', 1300, 520, 0.06 * g);
        break;
      case 'grass':
        this.playNoise(0.1, 'highpass', 2400, 4600, 0.05 * g);
        this.playTone(520, 780, 0.07, 'triangle', 0.04 * g);
        break;
      case 'electric':
        this.playTone(1500, 320, 0.07, 'square', 0.045 * g);
        this.playNoise(0.06, 'highpass', 5000, 3000, 0.05 * g);
        break;
      case 'rock':
        this.playTone(115, 46, 0.17, 'triangle', 0.12 * g);
        this.playNoise(0.12, 'lowpass', 520, 130, 0.08 * g);
        break;
      case 'psychic':
        this.playTone(900, 1500, 0.14, 'sine', 0.06 * g);
        this.playTone(1350, 2250, 0.12, 'sine', 0.035 * g, 0.03);
        break;
    }
  }

  /** Entrée de boss : grondement grave + montée dramatique. */
  public playBossIntro(): void {
    this.playTone(70, 48, 1.1, 'sawtooth', 0.13);
    this.playNoise(0.9, 'lowpass', 300, 90, 0.08);
    [146.83, 174.61, 220].forEach((n, i) => {
      this.playTone(n, n * 1.02, 0.34, 'square', 0.06, 0.25 + i * 0.22);
    });
    this.playTone(110, 55, 0.5, 'sawtooth', 0.14, 0.95);
  }

  public playThunder(): void {
    this.playNoise(1.1, 'lowpass', 1100, 70, 0.14);
    this.playTone(90, 38, 0.9, 'sawtooth', 0.07, 0.04);
  }

  public playFrostCrack(): void {
    this.playNoise(0.14, 'highpass', 3200, 6500, 0.07);
    this.playTone(1800, 900, 0.1, 'triangle', 0.05, 0.02);
  }

  /** Montée continue pendant la charge d'évolution (~2 s). */
  public playEvolutionCharge(): void {
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.04, 0.2, 'triangle', 0.07 + i * 0.006, i * 0.24);
    });
    this.playNoise(2.0, 'bandpass', 400, 3200, 0.03);
  }

  public playEvolutionBurst(): void {
    this.playNoise(0.5, 'highpass', 1200, 6000, 0.08);
    [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((n, i) => {
      this.playTone(n, n * 1.01, 0.5, 'triangle', 0.1, i * 0.05);
    });
    this.playTone(130.81, 65.4, 0.5, 'sine', 0.14);
  }

  /** Fanfare de victoire festive (mélodie + basse + scintillement). */
  public playFanfare(): void {
    const melody: [number, number][] = [
      [523.25, 0],
      [523.25, 0.12],
      [523.25, 0.24],
      [659.25, 0.36],
      [587.33, 0.52],
      [659.25, 0.64],
      [783.99, 0.8],
      [1046.5, 1.0],
    ];
    for (const [n, t] of melody) this.playTone(n, n * 1.01, 0.2, 'triangle', 0.11, t);
    this.playTone(130.81, 130.81, 0.5, 'sine', 0.1, 0);
    this.playTone(196, 196, 0.5, 'sine', 0.1, 0.5);
    this.playTone(261.63, 261.63, 0.6, 'sine', 0.1, 1.0);
    this.playNoise(0.4, 'highpass', 5000, 9000, 0.03, 1.0);
  }

  public playConfettiPop(): void {
    const jitter = 0.9 + Math.random() * 0.3;
    this.playNoise(0.07, 'highpass', 2600 * jitter, 5200, 0.05);
    this.playTone(1100 * jitter, 1650 * jitter, 0.06, 'sine', 0.04);
  }

  public playBiomeUnlock(): void {
    [392, 493.88, 587.33, 783.99, 987.77].forEach((n, i) => {
      this.playTone(n, n * 1.02, 0.26, 'sine', 0.09, i * 0.1);
    });
    this.playNoise(0.7, 'bandpass', 800, 4200, 0.03, 0.2);
  }

  public playIdleChirp(): void {
    const base = 880 + Math.random() * 300;
    this.playTone(base, base * 1.3, 0.07, 'sine', 0.03);
    this.playTone(base * 1.2, base * 1.5, 0.06, 'sine', 0.025, 0.08);
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

  public playDodge(): void {
    this.playTone(380, 920, 0.14, 'triangle', 0.12);
    this.playTone(520, 1180, 0.12, 'sine', 0.08, 0.05);
  }

  public playTelegraph(): void {
    this.playTone(290, 480, 0.24, 'sawtooth', 0.07);
  }

  public playKo(): void {
    this.playTone(280, 75, 0.24, 'sawtooth', 0.11);
  }

  public playWorkbenchBubble(): void {
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

  /** Étoile de victoire : chaque étoile sonne une note plus haute que la précédente. */
  public playStar(index: number): void {
    const n = [659.25, 783.99, 987.77][Math.max(0, Math.min(2, index))];
    this.playTone(n, n * 1.02, 0.22, 'triangle', 0.12, 0);
    this.playTone(n * 2, n * 2.02, 0.16, 'sine', 0.05, 0.04);
  }

  /** Révélation d'un Cube Scellé (A2.4) : coup sur le cube (plus aigu à chaque coup). */
  public playCrack(tap: number): void {
    const f = [220, 277.18, 349.23][Math.max(0, Math.min(2, tap - 1))];
    this.playTone(f, f * 0.6, 0.12, 'square', 0.09, 0);
    this.playTone(f * 3, f * 2, 0.06, 'triangle', 0.05, 0.01);
  }

  /** Roulement de tambour (suspense, 1,2 s) : petits coups graves rapprochés. */
  public playDrumroll(): void {
    for (let i = 0; i < 16; i++) this.playTone(110 + (i % 2) * 8, 80, 0.06, 'triangle', 0.05 + i * 0.003, i * 0.075);
  }

  /** Tintement d'une rangée qui reprend sa couleur. */
  public playChime(row: number): void {
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1174.66];
    const n = scale[row % scale.length] * (row >= scale.length ? 2 : 1);
    this.playTone(n, n, 0.12, 'sine', 0.06, 0);
  }

  /** Fin de la révélation : plus riche selon la rareté. */
  public playRevealTier(tier: 'common' | 'uncommon' | 'rare' | 'awakened'): void {
    const chords: Record<string, number[]> = {
      common: [523.25, 659.25],
      uncommon: [523.25, 659.25, 783.99],
      rare: [523.25, 659.25, 783.99, 1046.5],
      awakened: [523.25, 659.25, 783.99, 1046.5, 1318.5],
    };
    chords[tier].forEach((n, i) => this.playTone(n, n * 1.01, 0.5, 'triangle', 0.07, i * 0.06));
  }

  /** Le même « tic » pour toutes les attaques annoncées, 0,35 s avant l'impact. */
  public playTelegraphTick(): void {
    this.playTone(1318.5, 1318.5, 0.05, 'square', 0.06, 0);
  }

  /** Un cube devient mûr : tintement bref et clair. */
  public playCubeRipe(): void {
    this.playTone(1567.98, 1661.22, 0.09, 'sine', 0.07, 0);
  }

  /** Éclat faible (cube pas mûr) : petit « pop » terne. */
  public playWeakBurst(): void {
    this.playTone(330, 220, 0.07, 'square', 0.05, 0);
  }

  /** Éclat : deux notes montantes, la seconde propre à l'élément qui fait éclater. */
  public playBurst(element: ElementType): void {
    const note: Record<ElementType, number> = { fire: 659.25, water: 587.33, grass: 523.25, electric: 783.99, rock: 440, psychic: 698.46 };
    const n = note[element];
    this.playTone(n, n * 1.5, 0.12, 'triangle', 0.13, 0);
    this.playTone(n * 1.5, n * 2, 0.14, 'sine', 0.1, 0.05);
  }

  /** Trio : accord de trois notes. */
  public playTrio(): void {
    [523.25, 659.25, 783.99].forEach((n, i) => this.playTone(n, n * 1.02, 0.36, 'triangle', 0.12, i * 0.04));
    this.playTone(1046.5, 1046.5, 0.42, 'sine', 0.08, 0.14);
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
