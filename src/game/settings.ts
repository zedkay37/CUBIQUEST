/**
 * Options de confort stockées à part de la sauvegarde de progression
 * (elles ne font pas partie de SaveState et ne nécessitent donc aucune migration).
 */
export interface GameSettings {
  screenShake: boolean;
}

export const SETTINGS_STORAGE_KEY = 'cubiquest_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = { screenShake: true };

/** Normalise n'importe quelle valeur lue en options valides (pure, testable). */
export function normalizeSettings(raw: unknown): GameSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const obj = raw as Partial<GameSettings>;
  return {
    screenShake: typeof obj.screenShake === 'boolean' ? obj.screenShake : DEFAULT_SETTINGS.screenShake,
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
