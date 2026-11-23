import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ELEMENT_META, SPECIES } from '../game/catalog';
import type { CubeMaterial } from '../game/balance';
import type { SummonTier } from '../game/summon';
import { buildVoxelCreature } from '../game/voxelModels';
import { buildSealedCubeModel, disposeModel } from '../game/models/sealedCube';
import { soundFx } from '../game/audio';
import { FR } from '../i18n/fr';
import { ElementIcon, VoxelCreatureAvatar } from './Icons';
import { usePrefersReducedMotion } from './ui';

/** Couleur de rareté (révélée au troisième coup). */
export const TIER_COLOR: Record<SummonTier, string> = {
  common: '#B8C2D1',
  uncommon: '#2FB97A',
  rare: '#38BDF8',
  awakened: '#F4B942',
};

export interface SummonRevealProps {
  material: CubeMaterial;
  speciesId: string;
  tier: SummonTier;
  isNew: boolean;
  bondAfter: number;
  variantUnlocked: boolean;
  /** Toute première ouverture : on ne peut pas accélérer. */
  firstTime?: boolean;
  /** Outil de captures (`?gallery=reveal&auto=1`) : les trois coups sont donnés tout seuls. */
  autoTap?: boolean;
  onDone: () => void;
}

type Phase = 'drop' | 'tap' | 'burst' | 'suspense' | 'color' | 'result';

/**
 * Révélation d'un Cube Scellé (spec Atelier, A2.4), environ 6 s :
 * 1. le cube se pose, la caméra s'approche, le décor s'assombrit ;
 * 2. trois coups du joueur (clic, toucher, Espace) : fissures blanches, couleur de rareté au troisième ;
 * 3. le cube éclate, ses blocs volent puis se réassemblent en ombre noire (les vrais blocs de la créature) ;
 * 4. suspense : l'ombre tourne 1,2 s, roulement, particules de la couleur de rareté ;
 * 5. la couleur remonte bloc par bloc, des pieds à la tête, un tintement par rangée ; la créature saute ;
 * 6. le résultat (nouvelle créature, Lien, variante, forme éveillée).
 * Maintenir le clic accélère (sauf la toute première fois). Mouvement réduit : simple fondu de l'ombre à la couleur.
 */
export function SummonReveal(props: SummonRevealProps) {
  const reduced = usePrefersReducedMotion();
  return reduced ? <ReducedReveal {...props} /> : <FullReveal {...props} />;
}

function ResultPanel({ speciesId, tier, isNew, bondAfter, variantUnlocked, onDone }: SummonRevealProps) {
  const sp = SPECIES[speciesId];
  const color = TIER_COLOR[tier];
  return (
    <div className="pointer-events-auto mt-4 flex flex-col items-center gap-2 text-center">
      <div className="flex items-center gap-2">
        <ElementIcon element={sp.element} size={22} />
        <h2 className="font-display text-4xl font-extrabold text-[#FAF7F0] hud-text-stroke">{sp.name}</h2>
      </div>
      <p className="font-display text-lg font-bold" style={{ color }}>
        {tier === 'awakened' ? FR.ui.atelier.formeEveillee : isNew ? FR.ui.atelier.nouvelleCreature : FR.ui.atelier.doublon}
      </p>
      {!isNew && (
        <p className="text-sm text-[#F4B942]" aria-label={FR.ui.atelier.lienAria(Math.floor(bondAfter))}>
          {[0, 1, 2, 3, 4].map((i) => (i < Math.floor(bondAfter) ? '★' : '☆')).join(' ')}
        </p>
      )}
      {variantUnlocked && <p className="text-sm font-bold text-[#C084FC]">{FR.ui.atelier.varianteDebloquee}</p>}
      <button type="button" data-start="true" onClick={onDone} className="voxel-btn block-btn-primary mt-2 rounded-xl border-2 px-6 py-2 font-display font-bold">
        {FR.ui.atelier.continuer}
      </button>
    </div>
  );
}

function ReducedReveal(props: SummonRevealProps) {
  const [colored, setColored] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setColored(true), 900);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070C]/90" role="dialog" aria-modal="true" aria-label={FR.ui.atelier.revelationAria}>
      <div style={{ transition: 'filter 900ms ease', filter: colored ? 'none' : 'brightness(0)' }}>
        <VoxelCreatureAvatar speciesId={props.speciesId} size={180} />
      </div>
      {colored && <ResultPanel {...props} />}
    </div>
  );
}

function FullReveal(props: SummonRevealProps) {
  const { material, speciesId, tier, firstTime } = props;
  const mount = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>('drop');
  const [taps, setTaps] = useState(0);
  const tapRef = useRef<() => void>(() => {});
  const fastRef = useRef(false);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setPhase('result');
      return;
    }
    const W = Math.min(window.innerWidth, 720);
    const H = Math.min(window.innerHeight * 0.62, 520);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();
    const key = new THREE.DirectionalLight('#FFF1DA', 1.6);
    key.position.set(3, 6, 5);
    scene.add(key, new THREE.HemisphereLight('#DDEBFF', '#3B2E22', 0.6));
    const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
    camera.position.set(0, 1.6, 7);
    camera.lookAt(0, 0.7, 0);

    // le moule (socle lumineux) et le cube
    const moldMat = new THREE.MeshStandardMaterial({ color: '#2A3449', emissive: new THREE.Color(TIER_COLOR[tier]), emissiveIntensity: 0.0 });
    const mold = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), moldMat);
    mold.position.y = -0.1;
    scene.add(mold);
    const cube = buildSealedCubeModel(material);
    cube.root.position.y = 4;
    scene.add(cube.root);

    // fissures : fines barres lumineuses sur la face avant, blanches puis couleur de rareté
    const crackMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const cracks: THREE.Mesh[] = [];
    const crackShapes: [number, number, number, number][] = [
      [0.06, 0.7, -0.15, 0.55],
      [0.5, 0.06, 0.1, 0.75],
      [0.06, 0.5, 0.25, 0.35],
      [0.4, 0.06, -0.2, 0.25],
      [0.06, 0.45, 0.0, 0.95],
      [0.35, 0.06, 0.2, 1.05],
    ];

    // la créature : ses vrais blocs, d'abord dispersés et en ombre noire
    const rig = buildVoxelCreature(speciesId, 1);
    rig.root.children.forEach((c) => {
      if ((c as THREE.Mesh).geometry instanceof THREE.CircleGeometry) c.visible = false;
    });
    rig.root.visible = false;
    scene.add(rig.root);
    rig.root.updateMatrixWorld(true);
    const parts: { mesh: THREE.Mesh; home: THREE.Vector3; from: THREE.Vector3; mat: THREE.Material | THREE.Material[]; y: number }[] = [];
    const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    rig.bodyPivot.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const wp = new THREE.Vector3();
      m.getWorldPosition(wp);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
      parts.push({ mesh: m, home: m.position.clone(), from: m.position.clone().addScaledVector(dir, 2.4), mat: m.material, y: wp.y });
      m.material = shadowMat;
    });
    // rangées des pieds à la tête
    const ys = [...new Set(parts.map((p) => Math.round(p.y * 6) / 6))].sort((a, b) => a - b);

    // particules de rareté
    const sparkMat = new THREE.MeshBasicMaterial({ color: TIER_COLOR[tier] });
    const sparkCount = tier === 'awakened' ? 40 : tier === 'rare' ? 28 : tier === 'uncommon' ? 16 : 8;
    const sparks: THREE.Mesh[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), sparkMat);
      s.visible = false;
      s.userData.a = (i / sparkCount) * Math.PI * 2;
      s.userData.r = 1 + (i % 4) * 0.2;
      scene.add(s);
      sparks.push(s);
    }

    let local: Phase = 'drop';
    let t = 0;
    let tapsLocal = 0;
    let shake = 0;
    let colorRow = 0;
    let last = performance.now();
    let raf = 0;
    const go = (p: Phase) => {
      local = p;
      t = 0;
      setPhase(p);
    };
    tapRef.current = () => {
      if (local !== 'tap') return;
      tapsLocal += 1;
      setTaps(tapsLocal);
      shake = 0.25;
      soundFx.playCrack(tapsLocal);
      const per = 2;
      for (let i = 0; i < per; i++) {
        const [w, h, x, y] = crackShapes[(tapsLocal - 1) * per + i];
        const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), crackMat);
        c.position.set(x, y + 0.04, 0.56);
        cube.root.add(c);
        cracks.push(c);
      }
      if (tapsLocal >= 3) {
        crackMat.color.set(TIER_COLOR[tier]);
        moldMat.emissiveIntensity = 0.9;
        go('burst');
      }
    };

    const tick = () => {
      const now = performance.now();
      // horloge de requestAnimationFrame : jamais de pas négatif (bases de temps différentes selon les navigateurs)
      let dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (fastRef.current && !firstTime) dt *= 3;
      // léger ralenti pour une rare (et plus) pendant l'éclatement
      if (local === 'burst' && (tier === 'rare' || tier === 'awakened')) dt *= 0.7;
      t += dt;
      cube.extras.forEach((e) => (e.rotation.y += dt * 2));
      if (local === 'drop') {
        cube.root.position.y = Math.max(0, 4 - t * t * 9);
        camera.position.z = 7 - Math.min(1, t / 0.8) * 2.2;
        camera.lookAt(0, 0.7, 0);
        if (t > 0.9) go('tap');
      } else if (local === 'tap') {
        if (props.autoTap && t > 0.35) {
          t = 0;
          tapRef.current();
        }
        shake = Math.max(0, shake - dt);
        cube.root.position.x = Math.sin(now * 0.08) * shake * 0.2;
      } else if (local === 'burst') {
        const k = Math.min(1, t / 0.5);
        cube.blocks.forEach((b, i) => {
          const home = b.userData.home as THREE.Vector3;
          const dir = new THREE.Vector3(home.x, home.y - 0.5, home.z + 0.2).normalize();
          b.position.copy(home).addScaledVector(dir, k * 3.2 * (1 - k * 0.4));
          b.rotation.set(k * 3 + i, k * 2, 0);
          (b.material as THREE.MeshStandardMaterial).transparent = true;
          (b.material as THREE.MeshStandardMaterial).opacity = 1 - k;
        });
        cracks.forEach((c) => (c.visible = false));
        if (t > 0.35) {
          rig.root.visible = true;
          const r = Math.min(1, (t - 0.35) / 0.85);
          const ease = 1 - Math.pow(1 - r, 3);
          parts.forEach((p) => p.mesh.position.lerpVectors(p.from, p.home, ease));
        }
        if (t > 1.25) {
          cube.root.visible = false;
          parts.forEach((p) => p.mesh.position.copy(p.home));
          soundFx.playDrumroll();
          go('suspense');
        }
      } else if (local === 'suspense') {
        rig.root.rotation.y += dt * 1.2;
        sparks.forEach((s) => {
          s.visible = true;
          s.userData.a += dt * 2;
          s.position.set(Math.cos(s.userData.a) * s.userData.r, 0.4 + Math.sin(s.userData.a * 3) * 0.4, Math.sin(s.userData.a) * s.userData.r);
        });
        if (t > 1.2) go('color');
      } else if (local === 'color') {
        // face au joueur
        rig.root.rotation.y += (0 - rig.root.rotation.y) * Math.min(1, dt * 6);
        const target = Math.floor(t / 0.12);
        while (colorRow < ys.length && colorRow <= target) {
          const y = ys[colorRow];
          parts.filter((p) => Math.round(p.y * 6) / 6 === y).forEach((p) => (p.mesh.material = p.mat));
          soundFx.playChime(colorRow);
          colorRow += 1;
        }
        if (colorRow >= ys.length) {
          rig.bodyPivot.position.y = Math.max(0, Math.sin(Math.min(Math.PI, (t - ys.length * 0.12) * 6)) * 0.5);
          if (t > ys.length * 0.12 + 0.7) {
            soundFx.playRevealTier(tier);
            go('result');
          }
        }
      } else if (local === 'result') {
        rig.root.rotation.y = Math.sin(now / 900) * 0.25;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      disposeModel(cube.root);
      disposeModel(rig.root);
      cracks.forEach((c) => c.geometry.dispose());
      sparks.forEach((s) => s.geometry.dispose());
      crackMat.dispose();
      sparkMat.dispose();
      shadowMat.dispose();
      moldMat.dispose();
      mold.geometry.dispose();
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [material, speciesId, tier, firstTime]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        tapRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sp = SPECIES[speciesId];
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070C]/92 select-none"
      role="dialog"
      aria-modal="true"
      aria-label={FR.ui.atelier.revelationAria}
      onPointerDown={() => {
        tapRef.current();
        fastRef.current = true;
      }}
      onPointerUp={() => (fastRef.current = false)}
      onPointerLeave={() => (fastRef.current = false)}
    >
      <div ref={mount} />
      {phase === 'tap' && (
        <p className="mt-2 font-display text-xl font-bold text-[#FAF7F0] animate-pulse">{FR.ui.atelier.tapeLeCube(3 - taps)}</p>
      )}
      {(phase === 'suspense' || phase === 'color') && sp && (
        <div className="mt-2 flex items-center gap-2 text-[#FAF7F0]" aria-hidden="true">
          <ElementIcon element={sp.element} size={26} />
          <span className="font-display text-2xl font-bold" style={{ color: ELEMENT_META[sp.element].color }}>
            ???
          </span>
        </div>
      )}
      {phase === 'result' && <ResultPanel {...props} />}
      {!firstTime && phase !== 'result' && <p className="mt-3 text-xs text-[#94A3B8]">{FR.ui.atelier.maintenirPourAccelerer}</p>}
    </div>
  );
}
