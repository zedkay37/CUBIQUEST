/**
 * Plages chiffrées de STYLE.md, sous forme vérifiable par les tests.
 * Elles ont été RELEVÉES sur les 29 espèces existantes en session 2 (elles ne sont pas inventées) :
 * toute nouvelle créature doit y entrer. Si une plage doit bouger, c'est une décision de direction :
 * modifier STYLE.md et ce fichier ensemble.
 */
import { MOVES, SPECIES } from './catalog';
import type { CreatureRole, MoveStyle, SpeciesDef } from './types';

/**
 * JETONS DE L'INTERFACE (sprint UI, direction « jouet voxel »). Les mêmes valeurs existent en variables CSS
 * dans `src/index.css` (`--ui-…`) ; un test vérifie qu'elles restent identiques, et que chaque couleur de
 * texte garde un contraste d'au moins 4,5 pour 1 sur les fonds où elle est posée.
 */
export const UI_TOKENS = {
  color: {
    bg: '#141925',
    panel: '#1E2636',
    panelEdge: '#0B0F18',
    panelLine: '#3A4660',
    text: '#FAF7F0',
    textMuted: '#B8C2D1',
    accent: '#F4B942',
    primary: '#E85D3F',
    primaryEdge: '#9E3520',
    primaryText: '#1A0E08',
    secondary: '#2B3548',
    secondaryEdge: '#141A26',
    danger: '#E5383B',
    success: '#2FB97A',
  },
  /** Rayon des blocs (coins à peine adoucis), épaisseur de la tranche, ombre portée nette. */
  radius: 6,
  edge: 5,
  shadowDrop: 6,
  /** Échelle d'espacement : multiples de 4 px. */
  space: [4, 8, 12, 16, 24, 32],
  fontSize: { small: 12, body: 14, title: 20, hero: 32 },
  /** Durées d'animation en millisecondes, et courbes. */
  duration: { fast: 120, normal: 220, slow: 400 },
  ease: { out: 'cubic-bezier(0.16, 1, 0.3, 1)', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
} as const;

/** Couples texte / fond utilisés par l'interface : contraste d'au moins 4,5 pour 1 (test). */
export const UI_TEXT_PAIRS: [string, string][] = [
  [UI_TOKENS.color.text, UI_TOKENS.color.panel],
  [UI_TOKENS.color.text, UI_TOKENS.color.bg],
  [UI_TOKENS.color.textMuted, UI_TOKENS.color.panel],
  [UI_TOKENS.color.textMuted, UI_TOKENS.color.bg],
  [UI_TOKENS.color.accent, UI_TOKENS.color.panel],
  [UI_TOKENS.color.text, UI_TOKENS.color.secondary],
  [UI_TOKENS.color.primaryText, UI_TOKENS.color.primary],
  [UI_TOKENS.color.primaryText, UI_TOKENS.color.accent],
  [UI_TOKENS.color.success, UI_TOKENS.color.panel],
];

/** Rapport de contraste WCAG entre deux couleurs « #RRGGBB ». */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string): number => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** La seule couleur des zones de danger (S05.2, plan 5.3). Les kits de boss ne colorent que les particules. */
export const DANGER = '#E5383B';

export type EvolutionTier = 'base' | 'mid' | 'final';

type Range = [number, number];
interface StatRanges {
  hp: Range;
  atk: Range;
  speed: Range;
  range: Range;
}

/** Plages par stade et par rôle (STYLE.md §1.7). */
const ROLE_RANGES: Record<EvolutionTier, Partial<Record<CreatureRole, StatRanges>>> = {
  base: {
    melee: { hp: [110, 150], atk: [115, 140], speed: [4.6, 5.3], range: [2.6, 3.2] },
    ranged: { hp: [115, 135], atk: [135, 150], speed: [4.7, 5.4], range: [5.8, 6.4] },
    tank: { hp: [155, 180], atk: [105, 110], speed: [4.0, 4.4], range: [2.5, 2.7] },
  },
  mid: {
    melee: { hp: [215, 230], atk: [185, 205], speed: [4.8, 5.1], range: [2.9, 3.0] },
    ranged: { hp: [170, 195], atk: [215, 245], speed: [4.9, 5.5], range: [5.8, 6.8] },
    tank: { hp: [235, 290], atk: [170, 195], speed: [4.1, 4.5], range: [2.8, 3.0] },
  },
  final: {
    // « mêlée final » n'a qu'un exemple existant (Auroramure) : pas de plage propre, on applique
    // l'enveloppe du stade ci-dessous plutôt que d'en inventer une.
    ranged: { hp: [255, 320], atk: [330, 375], speed: [5.0, 5.6], range: [6.4, 7.4] },
    tank: { hp: [335, 420], atk: [250, 295], speed: [4.2, 4.5], range: [3.3, 4.8] },
  },
};

/** Enveloppe d'un stade, tous rôles confondus : total PV + ATQ, échelle, et stats si le rôle n'a pas de plage propre. */
const TIER_ENVELOPE: Record<EvolutionTier, { total: Range; scale: Range; stats: StatRanges }> = {
  base: { total: [250, 290], scale: [0.95, 1.04], stats: { hp: [110, 180], atk: [105, 150], speed: [4.0, 5.4], range: [2.5, 6.4] } },
  mid: { total: [390, 485], scale: [1.15, 1.28], stats: { hp: [170, 290], atk: [170, 245], speed: [4.1, 5.5], range: [2.8, 6.8] } },
  final: { total: [595, 710], scale: [1.32, 1.5], stats: { hp: [255, 420], atk: [250, 375], speed: [4.2, 5.6], range: [3.3, 7.4] } },
};

/** Plages des sorts par style (STYLE.md §2). */
const MOVE_RANGES: Record<MoveStyle, { power: Range; cooldown: Range; range: Range; aoe: Range }> = {
  melee: { power: [1.95, 2.1], cooldown: [4.2, 4.9], range: [4.0, 4.4], aoe: [2.8, 3.0] },
  dash: { power: [1.9, 2.0], cooldown: [4.0, 4.4], range: [6.5, 7.0], aoe: [2.3, 2.5] },
  projectile: { power: [1.85, 2.4], cooldown: [4.5, 6.0], range: [8.5, 10], aoe: [2.0, 2.8] },
  aoe: { power: [2.3, 2.65], cooldown: [6.0, 6.8], range: [4.2, 7.5], aoe: [3.8, 4.8] },
  buff: { power: [0.9, 0.9], cooldown: [6.5, 6.8], range: [3.5, 3.5], aoe: [5.0, 5.0] },
};

export const NAME_LENGTH: Range = [6, 12];
export const DEX_NOTE_LENGTH: Range = [70, 115];

export function getEvolutionTier(species: SpeciesDef): EvolutionTier {
  if (!species.evolvesTo) return 'final';
  const isEvolvedForm = Object.values(SPECIES).some((s) => s.evolvesTo === species.id);
  return isEvolvedForm ? 'mid' : 'base';
}

const inRange = (value: number, [min, max]: Range): boolean => value >= min - 1e-9 && value <= max + 1e-9;

/** Liste des écarts d'une espèce par rapport à STYLE.md (liste vide = conforme). */
export function checkSpeciesStyle(species: SpeciesDef): string[] {
  const issues: string[] = [];
  const tier = getEvolutionTier(species);
  const envelope = TIER_ENVELOPE[tier];
  const ranges = ROLE_RANGES[tier][species.role] ?? envelope.stats;
  const check = (label: string, value: number, range: Range): void => {
    if (!inRange(value, range)) issues.push(`${species.id} (${tier}, ${species.role}) : ${label} ${value} hors de ${range[0]}–${range[1]}`);
  };
  check('PV', species.baseHp, ranges.hp);
  check('ATQ', species.baseAtk, ranges.atk);
  check('vitesse', species.moveSpeed, ranges.speed);
  check('portée', species.attackRange, ranges.range);
  check('PV+ATQ', species.baseHp + species.baseAtk, envelope.total);
  check('échelle', species.scale, envelope.scale);
  check('longueur du nom', species.name.length, NAME_LENGTH);
  check('longueur de la note', species.dexNote.length, DEX_NOTE_LENGTH);
  if (species.isRare !== (tier === 'final' ? true : undefined)) {
    issues.push(`${species.id} : isRare doit être vrai au stade final et absent sinon`);
  }
  for (const hex of Object.values(species.palette)) {
    if (!/^#[0-9A-F]{6}$/i.test(hex)) issues.push(`${species.id} : couleur invalide ${hex}`);
  }
  const move = MOVES[species.moveId];
  if (!move) issues.push(`${species.id} : sort inconnu ${species.moveId}`);
  else if (move.element !== species.element) issues.push(`${species.id} : le sort ${move.id} n'a pas son élément`);
  return issues;
}

/** Liste des écarts d'un sort par rapport à STYLE.md (liste vide = conforme). */
export function checkMoveStyle(moveId: string): string[] {
  const move = MOVES[moveId];
  if (!move) return [`sort inconnu ${moveId}`];
  const ranges = MOVE_RANGES[move.style];
  const issues: string[] = [];
  const check = (label: string, value: number, range: Range): void => {
    if (!inRange(value, range)) issues.push(`${move.id} (${move.style}) : ${label} ${value} hors de ${range[0]}–${range[1]}`);
  };
  check('multiplicateur', move.powerMultiplier, ranges.power);
  check('recharge', move.cooldown, ranges.cooldown);
  check('portée', move.range, ranges.range);
  check('zone', move.aoeRadius, ranges.aoe);
  return issues;
}
