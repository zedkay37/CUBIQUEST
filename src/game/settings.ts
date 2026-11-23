import { withSaveSlot } from './saveSlot';

/**
 * Options de confort stockées à part de la sauvegarde de progression
 * (elles ne font pas partie de SaveState et ne nécessitent donc aucune migration).
 */
export interface GameSettings {
  screenShake: boolean;
  /** G1.2 : qualité graphique ; « auto » descend d'un cran sous 45 images/s tenues 3 s. */
  quality: 'auto' | 'low' | 'medium' | 'high';
}

export const QUALITY_ORDER: GameSettings['quality'][] = ['auto', 'high', 'medium', 'low'];

export const SETTINGS_STORAGE_KEY = withSaveSlot('cubiquest_settings_v1');

export const DEFAULT_SETTINGS: GameSettings = { screenShake: true, quality: 'auto' };

/** Normalise n'importe quelle valeur lue en options valides (pure, testable). */
export function normalizeSettings(raw: unknown): GameSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const obj = raw as Partial<GameSettings>;
  return {
    screenShake: typeof obj.screenShake === 'boolean' ? obj.screenShake : DEFAULT_SETTINGS.screenShake,
    quality: QUALITY_ORDER.includes(obj.quality as GameSettings['quality']) ? (obj.quality as GameSettings['quality']) : DEFAULT_SETTINGS.quality,
  };
}

export function loadSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(settings: GameSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // stockage indisponible : on garde les options en mémoire
  }
}
