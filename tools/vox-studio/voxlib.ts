/**
 * vox-studio en TypeScript : portage fidèle de `voxlib.py` (référence du 23/11/2026).
 *
 * Pourquoi un portage : Python n'est pas installé sur la machine de développement, et le dépôt tourne déjà sous
 * Node (`tsx`). Le portage est vérifié octet pour octet : `npm run vox:build -- --references` doit réécrire
 * exactement `references/calcinarque-legendaire.vox` (voir `vox-check.ts`).
 *
 * Repère (docs/guide-vox.md) : Z = haut, la créature regarde vers −Y (tête aux Y faibles), le voxel le plus bas
 * touche z = 0. Symétrie gauche/droite selon X ; la gauche de la créature est +X.
 * Les formules et l'ordre des calculs suivent ceux de numpy, pour obtenir les mêmes voxels.
 */

export const EYE = 248;
export const HIGHLIGHT = 249;
export const LEG_L = [250, 251, 252] as const;
export const LEG_R = [253, 254, 255] as const;
export const isGlow = (i: number) => i >= 240 && i <= 247;

export type RGB = [number, number, number];
export type Palette = Record<number, RGB>;
export type V3 = [number, number, number];
/** Masque booléen sur la grille (même ordre que le volume). */
export type Mask = Uint8Array;

export function hexrgb(h: string): RGB {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export class Model {
  w: number;
  l: number;
  h: number;
  /** Volume (x, y, z) rangé comme numpy (C) : index = (x * l + y) * h + z. */
  v: Uint8Array;
  /** Plan de symétrie. */
  cx: number;

  constructor(w: number, l: number, h: number) {
    this.w = w;
    this.l = l;
    this.h = h;
    this.v = new Uint8Array(w * l * h);
    this.cx = w / 2;
  }

  idx(x: number, y: number, z: number): number {
    return (x * this.l + y) * this.h + z;
  }

  get(x: number, y: number, z: number): number {
    if (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.l || z >= this.h) return 0;
    return this.v[this.idx(x, y, z)];
  }

  /** Parcourt la grille ; centres des voxels en i + 0,5 (comme `_grid`). */
  each(fn: (i: number, x: number, y: number, z: number, xi: number, yi: number, zi: number) => void): void {
    let i = 0;
    for (let xi = 0; xi < this.w; xi++)
      for (let yi = 0; yi < this.l; yi++)
        for (let zi = 0; zi < this.h; zi++, i++) fn(i, xi + 0.5, yi + 0.5, zi + 0.5, xi, yi, zi);
  }

  mask(pred: (x: number, y: number, z: number, value: number) => boolean): Mask {
    const m = new Uint8Array(this.v.length);
    this.each((i, x, y, z) => {
      m[i] = pred(x, y, z, this.v[i]) ? 1 : 0;
    });
    return m;
  }

  private paint(m: Mask, color: number, onlyEmpty: boolean): void {
    for (let i = 0; i < m.length; i++) if (m[i] && (!onlyEmpty || this.v[i] === 0)) this.v[i] = color;
  }

  // -- primitives ------------------------------------------------------------

  /** c = centre, r = rayons ; avec `mirror`, c[0] est un décalage latéral depuis le plan de symétrie. */
  ellipsoid(c: V3, r: V3, color: number, mirror = false, onlyEmpty = false): void {
    const centers: V3[] = mirror ? [[this.cx + c[0], c[1], c[2]], [this.cx - c[0], c[1], c[2]]] : [c];
    for (const cc of centers) {
      const m = this.mask((x, y, z) => {
        const a = (x - cc[0]) / r[0];
        const b = (y - cc[1]) / r[1];
        const d = (z - cc[2]) / r[2];
        return a * a + b * b + d * d <= 1.0;
      });
      this.paint(m, color, onlyEmpty);
    }
  }

  /** Bornes entières [x0, x1) ; avec `mirror`, x0 et x1 sont des décalages ≥ 0 depuis le centre (entier). */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: number, mirror = false, onlyEmpty = false): void {
    const c = Math.trunc(this.cx);
    const boxes: [number, number][] = mirror ? [[c + x0, c + x1], [c - x1, c - x0]] : [[x0, x1]];
    for (const [a, b] of boxes)
      for (let x = Math.max(a, 0); x < Math.min(b, this.w); x++)
        for (let y = Math.max(y0, 0); y < Math.min(y1, this.l); y++)
          for (let z = Math.max(z0, 0); z < Math.min(z1, this.h); z++) {
            const i = this.idx(x, y, z);
            if (!onlyEmpty || this.v[i] === 0) this.v[i] = color;
          }
  }

  /** Tronc de cône arrondi entre p0 et p1 (rayons r0 → r1). */
  capsule(p0: V3, p1: V3, r0: number, r1: number, color: number, mirror = false, onlyEmpty = false): void {
    const pairs: [V3, V3][] = mirror
      ? [
          [[this.cx + p0[0], p0[1], p0[2]], [this.cx + p1[0], p1[1], p1[2]]],
          [[this.cx - p0[0], p0[1], p0[2]], [this.cx - p1[0], p1[1], p1[2]]],
        ]
      : [[p0, p1]];
    for (const [a, b] of pairs) {
      const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1e-9;
      const m = this.mask((x, y, z) => {
        let t = ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = a[0] + t * ab[0];
        const py = a[1] + t * ab[1];
        const pz = a[2] + t * ab[2];
        const dx = x - px;
        const dy = y - py;
        const dz = z - pz;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) <= r0 + (r1 - r0) * t;
      });
      this.paint(m, color, onlyEmpty);
    }
  }

  carve(pred: (x: number, y: number, z: number) => boolean): void {
    this.each((i, x, y, z) => {
      if (pred(x, y, z)) this.v[i] = 0;
    });
  }

  // -- passes de couleur -----------------------------------------------------

  /** Vrai là où le voisin (dx, dy, dz) est vide (hors grille = vide). */
  neighborsEmpty(dx: number, dy: number, dz: number): Mask {
    const m = new Uint8Array(this.v.length);
    this.each((i, _x, _y, _z, xi, yi, zi) => {
      m[i] = this.get(xi + dx, yi + dy, zi + dz) === 0 ? 1 : 0;
    });
    return m;
  }

  recolor(where: Mask, frm: number[], to: number): void {
    for (let i = 0; i < where.length; i++) if (where[i] && frm.includes(this.v[i])) this.v[i] = to;
  }

  surface(): Mask {
    const m = new Uint8Array(this.v.length);
    const dirs: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    this.each((i, _x, _y, _z, xi, yi, zi) => {
      if (this.v[i] === 0) return;
      m[i] = dirs.some(([dx, dy, dz]) => this.get(xi + dx, yi + dy, zi + dz) === 0) ? 1 : 0;
    });
    return m;
  }

  /** Peint une fissure (polyligne 3D, x latéral, des deux côtés) sur les voxels de surface. */
  crack(points: V3[], color: number, radius = 0.75, frm: number[] | null = null): void {
    const surf = this.surface();
    const allowed = new Uint8Array(surf.length);
    for (let i = 0; i < surf.length; i++) allowed[i] = surf[i] && (frm === null || frm.includes(this.v[i])) ? 1 : 0;
    for (const sgn of [1, -1]) {
      const pts: V3[] = points.map((p) => [this.cx + sgn * p[0], p[1], p[2]]);
      const m = new Uint8Array(surf.length);
      for (let s = 0; s + 1 < pts.length; s++) {
        const a = pts[s];
        const b = pts[s + 1];
        const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1e-9;
        this.each((i, x, y, z) => {
          let t = ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / L2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = x - a[0] - t * ab[0];
          const dy = y - a[1] - t * ab[1];
          const dz = z - a[2] - t * ab[2];
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius) m[i] = 1;
        });
      }
      for (let i = 0; i < m.length; i++) if (m[i] && allowed[i]) this.v[i] = color;
    }
  }

  /** Voxels de pattes → 250–252 (gauche, +X) / 253–255 (droite, −X), selon la couleur de corps. */
  legsSplit(legMask: Mask, colorsByBody: [number, [number, number]][]): void {
    for (const [bodyC, [lc, rc]] of colorsByBody) {
      this.each((i, x) => {
        if (legMask[i] && this.v[i] === bodyC) this.v[i] = x > this.cx ? lc : rc;
      });
    }
  }

  // -- contrôles ---------------------------------------------------------------

  bbox(): { lo: V3; hi: V3 } {
    const lo: V3 = [Infinity, Infinity, Infinity];
    const hi: V3 = [-Infinity, -Infinity, -Infinity];
    this.each((i, _x, _y, _z, xi, yi, zi) => {
      if (!this.v[i]) return;
      lo[0] = Math.min(lo[0], xi);
      lo[1] = Math.min(lo[1], yi);
      lo[2] = Math.min(lo[2], zi);
      hi[0] = Math.max(hi[0], xi);
      hi[1] = Math.max(hi[1], yi);
      hi[2] = Math.max(hi[2], zi);
    });
    return { lo, hi };
  }

  crop(): void {
    const { lo, hi } = this.bbox();
    const w = hi[0] - lo[0] + 1;
    const l = hi[1] - lo[1] + 1;
    const h = hi[2] - lo[2] + 1;
    const v = new Uint8Array(w * l * h);
    for (let x = 0; x < w; x++) for (let y = 0; y < l; y++) for (let z = 0; z < h; z++) v[(x * l + y) * h + z] = this.v[this.idx(x + lo[0], y + lo[1], z + lo[2])];
    this.w = w;
    this.l = l;
    this.h = h;
    this.v = v;
    this.cx = w / 2;
  }

  /** Symétrie X parfaite, pattes gauche et droite échangées. */
  symmetric(): boolean {
    const swap = (k: number) => {
      const li = (LEG_L as readonly number[]).indexOf(k);
      if (li >= 0) return LEG_R[li];
      const ri = (LEG_R as readonly number[]).indexOf(k);
      return ri >= 0 ? LEG_L[ri] : k;
    };
    for (let x = 0; x < this.w; x++)
      for (let y = 0; y < this.l; y++)
        for (let z = 0; z < this.h; z++) if (this.v[this.idx(x, y, z)] !== swap(this.v[this.idx(this.w - 1 - x, y, z)])) return false;
    return true;
  }

  report(name: string): string {
    const counts = new Map<number, number>();
    for (const k of this.v) if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    const n = [...counts.values()].reduce((a, b) => a + b, 0);
    const surf = this.surface();
    let surfN = 0;
    let glowSurf = 0;
    for (let i = 0; i < surf.length; i++)
      if (surf[i]) {
        surfN++;
        if (isGlow(this.v[i])) glowSurf++;
      }
    const eyesY: number[] = [];
    this.each((i, _x, _y, _z, _xi, yi) => {
      if (this.v[i] === EYE) eyesY.push(yi);
    });
    return [
      `== ${name} ==`,
      `taille X(largeur)=${this.w} Y(longueur)=${this.l} Z(hauteur)=${this.h}`,
      `voxels=${n}  surface=${surfN}  lave en surface=${glowSurf} (${((100 * glowSurf) / surfN).toFixed(1)} %)`,
      `symetrie X : ${this.symmetric() ? 'OK' : 'ECHEC'}`,
      `yeux : ${eyesY.length} voxels, Y min=${eyesY.length ? Math.min(...eyesY) : '-'}`,
      `indices utilises : [${[...counts.keys()].sort((a, b) => a - b).join(', ')}]`,
    ].join('\n');
  }
}

// -- écriture .vox (MagicaVoxel, version 150), identique à write_vox -----------

export function writeVoxBytes(model: Model, palette: Palette): Uint8Array {
  const { w, l, h } = model;
  if (Math.max(w, l, h) > 256) throw new Error('modèle trop grand (256 max par axe)');
  const pts: number[] = [];
  model.each((i, _x, _y, _z, xi, yi, zi) => {
    if (model.v[i]) pts.push(xi, yi, zi, model.v[i]);
  });
  const n = pts.length / 4;
  const sizeLen = 12 + 12;
  const xyziLen = 12 + 4 + n * 4;
  const rgbaLen = 12 + 256 * 4;
  const buf = new ArrayBuffer(8 + 12 + sizeLen + xyziLen + rgbaLen);
  const dv = new DataView(buf);
  let o = 0;
  const tag = (s: string) => {
    for (let k = 0; k < 4; k++) dv.setUint8(o + k, s.charCodeAt(k));
    o += 4;
  };
  const i32 = (x: number) => {
    dv.setInt32(o, x, true);
    o += 4;
  };
  tag('VOX ');
  i32(150);
  tag('MAIN');
  i32(0);
  i32(sizeLen + xyziLen + rgbaLen);
  tag('SIZE');
  i32(12);
  i32(0);
  i32(w);
  i32(l);
  i32(h);
  tag('XYZI');
  i32(4 + n * 4);
  i32(0);
  i32(n);
  for (const b of pts) dv.setUint8(o++, b);
  tag('RGBA');
  i32(256 * 4);
  i32(0);
  for (let k = 0; k < 256; k++) {
    const [r, g, b] = palette[k + 1] ?? [128, 128, 128];
    dv.setUint8(o++, r);
    dv.setUint8(o++, g);
    dv.setUint8(o++, b);
    dv.setUint8(o++, 255);
  }
  return new Uint8Array(buf);
}
