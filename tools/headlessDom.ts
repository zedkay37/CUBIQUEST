/**
 * Faux DOM minimal pour faire tourner le moteur hors navigateur (`npm run sim`, tests du moteur).
 * Les textures de sol et de texte flottant créent des <canvas> qui ne sont jamais affichés ici :
 * on fournit donc un canvas dont le contexte 2D accepte tous les appels sans rien faire.
 * Aucun `window` n'est défini : le son se désactive de lui-même (voir audio.ts).
 */
const noop = (): void => {};

const ctxStub: unknown = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => ({ addColorStop: noop });
      }
      if (prop === 'measureText') return () => ({ width: 0 });
      return noop;
    },
    set: () => true,
  },
);

export function installHeadlessDom(): void {
  const g = globalThis as unknown as { document?: unknown };
  if (g.document) return;
  g.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctxStub }),
    addEventListener: noop,
    removeEventListener: noop,
    hidden: false,
  };
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Exécute `fn` avec `Math.random` remplacé par un générateur à graine, puis restaure l'original. */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const real = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}
