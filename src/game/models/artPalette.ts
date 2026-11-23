/**
 * Couleurs des créatures refaites (sprint ART 2, section 1), en règles pures testées.
 * Deux à trois tons nets : la famille du corps (corps, et tête un peu plus claire pour qu'on la distingue),
 * la famille de l'accent (ventre clair, crête ou plaques lumineuses) et des détails sombres (pattes, bobines…).
 * Le bruit de surface (ombre par bloc) est limité à ±4 % de luminosité.
 */
import * as THREE from 'three';

export const ART2_AO_STRENGTH = 0.013; // 3 voisins au plus : 3,9 % d'ombre au maximum

export interface CatalogPalette {
  primary: string;
  secondary: string;
  belly: string;
  accent: string;
  eye: string;
}

export interface Art2Tones {
  primary: string;
  head: string;
  secondary: string;
  belly: string;
  accent: string;
  eye: string;
}

/** Luminance relative (sRGB → linéaire), entre 0 et 1. */
export function luminance(hex: string): number {
  const c = new THREE.Color().setStyle(hex); // linéaire
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** Écart de luminosité relatif entre deux couleurs (0,15 = 15 %). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return Math.abs(la - lb) / Math.max(la, lb, 1e-6);
}

const hex = (c: THREE.Color) => '#' + c.getHexString();

/** Tons ART2 d'une espèce à partir de sa palette du catalogue (identité gardée : mêmes teintes). */
export function art2Palette(p: CatalogPalette): Art2Tones {
  const body = new THREE.Color().setStyle(p.primary);
  const hsl = { h: 0, s: 0, l: 0 };
  body.getHSL(hsl);
  // tête : même teinte, plus claire (ou plus sombre si le corps est déjà très clair)
  const head = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l < 0.62 ? Math.min(0.9, hsl.l + 0.12) : hsl.l - 0.14);
  // détails sombres : la teinte du « secondaire » de l'espèce (identité gardée : cuivre, braise…), assombrie
  const sec = { h: 0, s: 0, l: 0 };
  new THREE.Color().setStyle(p.secondary).getHSL(sec);
  const dark = new THREE.Color().setHSL(sec.h, sec.s, Math.max(0.08, Math.min(sec.l * 0.75, hsl.l * 0.6)));
  // au moins 25 % d'écart de luminosité avec le corps : on assombrit jusqu'à l'obtenir
  for (let i = 0; i < 12 && contrast(hex(dark), p.primary) < 0.25; i++) {
    const d = { h: 0, s: 0, l: 0 };
    dark.getHSL(d);
    dark.setHSL(d.h, d.s, d.l * 0.85);
  }
  return {
    primary: p.primary,
    head: hex(head),
    secondary: hex(dark),
    belly: p.belly,
    accent: p.accent,
    eye: p.eye,
  };
}
