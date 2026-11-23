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
import { ElementBadge, usePrefersReducedMotion } from './ui';
import { VoxelConfetti } from './ui/moments';

/** Fond de fin de révélation : dégradé de la couleur de rareté (A4.2). */
const tierGradient = (tier: SummonTier) => {
  const c = TIER_COLOR[tier];
  // valeur CSS (pas un texte affiché)
  return 'radial-gradient(ellipse at 50% 38%,' + c + 'aa 0%,' + c + '33 38%,rgba(5,7,12,0) 78%)';
};

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
  /** Outil de captures (`&fin=1`) : affiche directement l'image finale (le navigateur headless n'anime pas). */
  startAtResult?: boolean;
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
  const stars = Math.floor(bondAfter);
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 px-4 text-center">
      {/* A4.2 : le nom en très grand (trois fois l'ancienne taille), avec un rebond, et son badge d'élément */}
      <h2
        className="reveal-name font-display font-extrabold leading-none text-[#FAF7F0] hud-text-stroke"
        style={{ fontSize: 'clamp(2.75rem, 12vw, 7rem)', textShadow: `0 0 28px ${color}, 0 6px 0 rgba(0,0,0,0.55)` }}
      >
        {sp.name}
      </h2>
      <div className="reveal-sub">
        <ElementBadge element={sp.element} />
      </div>
      <p className="reveal-sub font-display text-xl sm:text-2xl font-bold" style={{ color }}>
        {tier === 'awakened' ? FR.ui.atelier.formeEveillee : isNew ? FR.ui.atelier.nouvelleCreature : FR.ui.atelier.doublon}
      </p>
      {!isNew && (
        <p className="reveal-sub flex gap-1 text-3xl text-[#F4B942]" aria-label={FR.ui.atelier.lienAria(stars)}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i < stars ? 'reveal-star' : 'opacity-40'} style={{ animationDelay: `${0.5 + i * 0.12}s` }}>
              {i < stars ? '★' : '☆'}
            </span>
          ))}
        </p>
      )}
      {variantUnlocked && <p className="reveal-sub text-lg font-bold text-[#C084FC]">{FR.ui.atelier.varianteDebloquee}</p>}
      <button type="button" data-start="true" onClick={onDone} className="reveal-sub voxel-btn block-btn-primary mt-2 min-h-[44px] rounded-xl border-2 px-8 py-2 font-display text-lg font-bold">
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
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#05070C', backgroundImage: colored ? tierGradient(props.tier) : 'none' }}
      role="dialog"
      aria-modal="true"
      aria-label={FR.ui.atelier.revelationAria}
    >
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
    // plein écran : la créature occupera environ la moitié de la hauteur à la fin
    const W = window.innerWidth;
    const H = window.innerHeight;
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
    const camLook = new THREE.Vector3(0, 0.7, 0);
    camera.lookAt(camLook);

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

    // A4.2 : cadrage final (la créature fait environ la moitié de la hauteur de l'écran), un peu au-dessus du centre
    const minY = Math.min(...parts.map((p) => p.y));
    const maxY = Math.max(...parts.map((p) => p.y)) + 0.25;
    const creatureH = Math.max(0.8, maxY - Math.max(0, minY - 0.2));
    const halfFov = (camera.fov * Math.PI) / 360;
    // sur un écran étroit (téléphone), la largeur limite aussi : la créature ne déborde jamais
    const xs = parts.map((p) => p.home.x);
    const creatureW = Math.max(0.8, Math.max(...xs) - Math.min(...xs) + 0.6);
    const aspect = W / H;
    const finalDist = Math.max(creatureH / (2 * Math.tan(halfFov) * 0.5), creatureW / (2 * Math.tan(halfFov) * aspect * 0.7));
    const finalLook = new THREE.Vector3(0, creatureH * 0.5 - creatureH * (aspect < 1 ? 0.55 : 0.45), 0);
    const finalEye = new THREE.Vector3(0, finalLook.y + creatureH * 0.15, finalDist);

    // A4.2 : faisceau de lumière et rayons qui tournent, de la couleur de la rareté, derrière la créature
    const beamMat = new THREE.MeshBasicMaterial({ color: TIER_COLOR[tier], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, creatureH * 0.9, creatureH * 6, 32, 1, true), beamMat);
    beam.position.set(0, creatureH * 2.6, -1.4);
    scene.add(beam);
    const rayMat = new THREE.MeshBasicMaterial({ color: TIER_COLOR[tier], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const rays = new THREE.Group();
    const rayGeo = new THREE.BoxGeometry(0.14, creatureH * 5, 0.01);
    const rayCount = tier === 'awakened' ? 16 : tier === 'rare' ? 12 : 8;
    for (let i = 0; i < rayCount; i++) {
      const r = new THREE.Mesh(rayGeo, rayMat);
      r.rotation.z = (i / rayCount) * Math.PI * 2;
      rays.add(r);
    }
    rays.position.set(0, creatureH * 0.55, -1.8);
    scene.add(rays);
    let joyT = -1;

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

    if (props.startAtResult) {
      cube.root.visible = false;
      rig.root.visible = true;
      parts.forEach((p) => {
        p.mesh.position.copy(p.home);
        p.mesh.material = p.mat;
      });
      camera.position.copy(finalEye);
      camLook.copy(finalLook);
      camera.lookAt(camLook);
      beamMat.opacity = 0.3;
      rayMat.opacity = 0.18;
      sparks.forEach((s) => (s.visible = false));
      go('result');
    }
    const tick = () => {
      const now = performance.now();
      // horloge de requestAnimationFrame : jamais de pas négatif (bases de temps différentes selon les navigateurs)
      let dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (fastRef.current && !firstTime) dt *= 3;
      // léger ralenti pour une rare (et plus) pendant l'éclatement
      if ((local === 'burst' || local === 'color') && (tier === 'rare' || tier === 'awakened')) dt *= 0.7;
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
        // A4.2 : la caméra se rapproche doucement, le faisceau et les rayons apparaissent
        const k = 1 - Math.pow(0.02, dt);
        camera.position.lerp(finalEye, k);
        camLook.lerp(finalLook, k);
        camera.lookAt(camLook);
        beamMat.opacity = Math.min(0.32, beamMat.opacity + dt * 0.4);
        rayMat.opacity = Math.min(0.18, rayMat.opacity + dt * 0.25);
        rays.rotation.z += dt * 0.25;
        // face au joueur
        rig.root.rotation.y += (0 - rig.root.rotation.y) * Math.min(1, dt * 6);
        const target = Math.floor(t / 0.12);
        while (colorRow < ys.length && colorRow <= target) {
          const y = ys[colorRow];
          parts.filter((p) => Math.round(p.y * 6) / 6 === y).forEach((p) => (p.mesh.material = p.mat));
          soundFx.playChime(colorRow);
          colorRow += 1;
        }
        if (colorRow >= ys.length && t > ys.length * 0.12 + 0.15) {
          soundFx.playRevealTier(tier);
          joyT = 0;
          go('result');
        }
      } else if (local === 'result') {
        // A4.2 : petite animation de joie (saut et tour sur elle-même), puis elle regarde le joueur
        camera.position.lerp(finalEye, 1 - Math.pow(0.02, dt));
        camLook.lerp(finalLook, 1 - Math.pow(0.02, dt));
        camera.lookAt(camLook);
        rays.rotation.z += dt * 0.2;
        beamMat.opacity = 0.26 + Math.sin(now / 500) * 0.06;
        rayMat.opacity = Math.min(0.18, rayMat.opacity + dt * 0.25);
        if (joyT >= 0) {
          joyT += dt;
          const j = Math.min(1, joyT / 0.9);
          rig.bodyPivot.position.y = Math.sin(j * Math.PI) * creatureH * 0.35;
          rig.root.rotation.y = j * Math.PI * 2;
          if (j >= 1) {
            joyT = -1;
            rig.root.rotation.y = 0;
            rig.bodyPivot.position.y = 0;
          }
        } else {
          rig.root.rotation.y = Math.sin(now / 1200) * 0.12;
        }
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
      beamMat.dispose();
      beam.geometry.dispose();
      rayMat.dispose();
      rayGeo.dispose();
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden"
      data-static={props.startAtResult ? 'true' : undefined}
      style={{ backgroundColor: '#05070C', backgroundImage: phase === 'color' || phase === 'result' ? tierGradient(tier) : 'none' }}
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
      <div ref={mount} className="absolute inset-0" />
      {phase === 'tap' && (
        <p className="absolute bottom-[18vh] font-display text-2xl font-bold text-[#FAF7F0] animate-pulse">{FR.ui.atelier.tapeLeCube(3 - taps)}</p>
      )}
      {(phase === 'suspense' || phase === 'color') && sp && (
        <div className="absolute bottom-[18vh] flex items-center gap-2 text-[#FAF7F0]" aria-hidden="true">
          <ElementIcon element={sp.element} size={26} />
          <span className="font-display text-2xl font-bold" style={{ color: ELEMENT_META[sp.element].color }}>
            ???
          </span>
        </div>
      )}
      {/* A4.2 : plus c'est rare, plus c'est fort : flash doré et pluie de petits cubes pour une forme éveillée */}
      {phase === 'result' && tier === 'awakened' && <div className="reveal-flash pointer-events-none absolute inset-0" aria-hidden="true" />}
      {phase === 'result' && (tier === 'awakened' || tier === 'rare') && (
        <VoxelConfetti count={tier === 'awakened' ? 60 : 24} colors={tier === 'awakened' ? ['#F4B942', '#FFE27A', '#FFF3C4'] : ['#38BDF8', '#7DD3FC', '#FAF7F0']} />
      )}
      {phase === 'result' && (
        <div className="absolute inset-x-0 bottom-[6vh] flex justify-center">
          <ResultPanel {...props} />
        </div>
      )}
      {!firstTime && phase !== 'result' && <p className="absolute bottom-6 text-xs text-[#94A3B8]">{FR.ui.atelier.maintenirPourAccelerer}</p>}
    </div>
  );
}
