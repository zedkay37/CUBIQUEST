/**
 * PROTO-DONJON : les réglages du banc d'essai. Lus dans l'URL, modifiables par le panneau (F1), recopiés dans les
 * résultats. Rien n'est stocké hors de l'URL (aucune clé de stockage).
 */
import type { LeaderId, Scheme, Version } from '../sim';

export type CamDist = 'proche' | 'moyenne' | 'eloignee';
export type CamAngle = 'forte' | 'rasante';
export type Density = 'faible' | 'normale' | 'forte';
/** PROTO-MODELES : les modèles de jeu jouables dans le donjon (A et B inchangés). */
export type Modele = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export const MODELES: Modele[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export interface DonjonSettings {
  modele: Modele;
  seed: number;
  scheme: Scheme;
  version: Version;
  leader: LeaderId;
  cam: CamDist;
  angle: CamAngle;
  speed: 0.8 | 1 | 1.2;
  density: Density;
  /** Le donjon se réveille : plus on reste à un étage, plus des patrouilles arrivent. */
  wake: boolean;
  minimap: boolean;
  recruit: 0 | 0.1 | 0.3;
}

export const DEFAULTS: DonjonSettings = {
  modele: 'A',
  seed: 1,
  scheme: 1,
  version: 'A',
  leader: 'calcinarque',
  cam: 'moyenne',
  angle: 'forte',
  speed: 1,
  density: 'normale',
  wake: false,
  minimap: true,
  recruit: 0,
};

/** Le préréglage demandé par la fiche (schéma 1, A, caméra moyenne, mini-carte, recrutement 10 %, réveil). */
export const PRESET_EXPLORATION: Partial<DonjonSettings> = { scheme: 1, version: 'A', cam: 'moyenne', minimap: true, recruit: 0.1, wake: true };

/** Réglages qui demandent de recommencer la descente (les autres s'appliquent en direct). */
export const RESTART_KEYS: (keyof DonjonSettings)[] = ['modele', 'seed', 'version', 'leader', 'density'];

const pick = <T>(v: string | null, list: readonly T[], def: T): T => (list.map(String).includes(v ?? '') ? list[list.map(String).indexOf(v!)] : def);

export function readSettings(search: string): DonjonSettings {
  const p = new URLSearchParams(search);
  let s: DonjonSettings = { ...DEFAULTS };
  if (p.get('preset') === 'exploration') s = { ...s, ...PRESET_EXPLORATION };
  const seed = Number(p.get('seed'));
  // modèle : `modele=C` ; sans modèle, l'ancienne composition (`compo=A|B`) reste lue telle quelle
  const modele = pick(p.get('modele'), MODELES, (pick(p.get('compo'), ['A', 'B'] as const, s.version) as Modele));
  return {
    modele,
    seed: Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : s.seed,
    scheme: pick(p.get('schema'), [1, 2, 3] as const, s.scheme),
    version: modele === 'B' ? 'B' : 'A',
    leader: pick(p.get('meneur'), ['calcinarque', 'braizard'] as const, s.leader),
    cam: pick(p.get('cam'), ['proche', 'moyenne', 'eloignee'] as const, s.cam),
    angle: pick(p.get('angle'), ['forte', 'rasante'] as const, s.angle),
    speed: pick(p.get('vitesse'), [0.8, 1, 1.2] as const, s.speed),
    density: pick(p.get('densite'), ['faible', 'normale', 'forte'] as const, s.density),
    wake: p.has('reveil') ? p.get('reveil') === '1' : s.wake,
    minimap: p.has('carte') ? p.get('carte') === '1' : s.minimap,
    recruit: pick(p.get('recrutement'), [0, 0.1, 0.3] as const, s.recruit),
  };
}

export function settingsToQuery(s: DonjonSettings): string {
  const p = new URLSearchParams({
    proto: 'donjon',
    modele: s.modele,
    seed: String(s.seed),
    schema: String(s.scheme),
    compo: s.version,
    meneur: s.leader,
    cam: s.cam,
    angle: s.angle,
    vitesse: String(s.speed),
    densite: s.density,
    reveil: s.wake ? '1' : '0',
    carte: s.minimap ? '1' : '0',
    recrutement: String(s.recruit),
  });
  return p.toString();
}

export const DENSITY_MULT: Record<Density, number> = { faible: 0.6, normale: 1, forte: 1.5 };

/** Touches de chaque combinaison (vérifiées sans conflit : voir docs/proto/TOUCHES.md). */
export function keysFor(s: DonjonSettings): [string, string][] {
  const out: [string, string][] = [];
  if (s.modele !== 'A' && s.modele !== 'B') return keysForModel(s);
  if (s.scheme === 1) out.push(['ZQSD', 'bouger'], ['Clic gauche', 'désigner un ennemi (attaque automatique sinon)']);
  if (s.scheme === 2) out.push(['Clic gauche', 'aller au sol · maintenu sur un ennemi : l’attaquer']);
  if (s.scheme === 3) out.push(['ZQSD', 'bouger'], ['Clic gauche', 'tirer vers le curseur']);
  out.push(['1 · 2', 'sorts vers le curseur'], ['Espace', s.scheme === 2 ? 'esquive vers le curseur' : 'esquive']);
  if (s.version === 'A') out.push(['F', 'compagnons : la cible sous le curseur'], ['R', 'compagnons : revenez'], ['3 · 4', 'sorts des compagnons']);
  else out.push(['Molette', 'choisir une créature'], ['Clic droit', 'elle bondit au point visé (2 crans d’Élan)'], ['R', 'rappel (rend 1 cran)']);
  out.push(['F1', 'réglages'], ['M', 'mini-carte']);
  return out;
}

/** Touches des nouveaux modèles (PROTO-MODELES). */
export function keysForModel(s: DonjonSettings): [string, string][] {
  const out: [string, string][] = [];
  if (s.modele === 'H') out.push(['ZQSD', 'déplacer la caméra'], ['1 · 2 · 3 · 4', 'choisir une carte-créature'], ['Clic gauche', 'la poser (zone autorisée)'], ['Clic droit', 'annuler la carte choisie']);
  if (s.modele === 'G') out.push(['ZQSD', 'bouger'], ['Clic gauche', 'désigner un ennemi (attaque automatique sinon)'], ['1 · 2', 'sorts du Meneur'], ['Espace', 'esquive'], ['F', 'jeton : focus sous le curseur'], ['R', 'jeton : repli'], ['E', 'jeton : ultime']);
  if (s.modele === 'F')
    out.push(['ZQSD', 'bouger'], ['Clic gauche', 'désigner un ennemi · en pause : choisir une créature, puis le sol (aller) ou un ennemi (attaquer)'], ['1 · 2', 'sorts du Meneur · en pause : sort de la créature choisie'], ['Maj', 'esquive'], ['Espace', 'figer / relancer le temps'], ['F', 'compagnons : la cible sous le curseur'], ['R', 'compagnons : revenez'], ['3 · 4', 'sorts des compagnons']);
  if (s.modele === 'E') out.push(['ZQSD', 'bouger'], ['Clic gauche', 'désigner un ennemi (attaque automatique sinon)'], ['1 · 2 · 3 · 4', 'faire entrer cette créature'], ['Clic droit', 'sort de la créature sur le terrain'], ['Espace', 'esquive']);
  if (s.modele === 'D') out.push(['ZQSD', 'bouger'], ['Clic gauche', 'désigner un ennemi (attaque automatique sinon)'], ['1 · 2 · 3 · 4', 'compétences vers le curseur'], ['Espace', 'esquive']);
  if (s.modele === 'C')
    out.push(['ZQSD', 'bouger (l’équipe se bat seule, faiblement)'], ['1 · 2 · 3 · 4', 'choisir une carte'], ['Clic gauche', 'viser et jouer la carte'], ['Clic droit', 'annuler la carte choisie']);
  out.push(['F1', 'réglages'], ['M', 'mini-carte']);
  return out;
}
