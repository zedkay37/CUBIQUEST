import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildVoxelCreature } from '../game/voxelModels';
import { buildLegacyCreature, buildSculptCreature } from '../game/models/creatures';
import { SPECIES } from '../game/catalog';
import { usePrefersReducedMotion } from './ui';
import { VoxelCreatureAvatar } from './Icons';

/**
 * Portrait qui tourne (G1.3) : une petite scène 3D, réservée aux grands affichages (arrivée d'une créature)
 * pour ne pas multiplier les rendus. Sans WebGL ou avec « mouvement réduit » : le portrait fixe.
 */
export function CreatureTurntable({
  speciesId,
  size = 160,
  variant,
  version = 'art3',
  silhouette,
}: {
  speciesId: string;
  size?: number;
  variant?: boolean;
  /** `?gallery=art` : « avant » = ancien modèle en gros pavés ; art1 / art2 = versions figées ; art3 = le jeu. */
  version?: 'avant' | 'art1' | 'art2' | 'art3';
  /** Sprint Art : ombre noire unie (comparaison des silhouettes). */
  silhouette?: boolean;
}) {
  const mount = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const failed = useRef(false);

  useEffect(() => {
    const host = mount.current;
    if (!host || reduced) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      failed.current = true;
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();
    const key = new THREE.DirectionalLight('#FFF1DA', 1.5);
    key.position.set(4, 6, 6);
    const rim = new THREE.DirectionalLight('#9CC8FF', 0.7);
    rim.position.set(-5, 4, -6);
    scene.add(key, rim, new THREE.HemisphereLight('#DDEBFF', '#5B4A3A', 0.55));
    const rig =
      version === 'avant'
        ? buildLegacyCreature(SPECIES[speciesId], 1, variant)
        : version === 'art3'
          ? buildVoxelCreature(speciesId, 1, variant)
          : buildSculptCreature(SPECIES[speciesId], 1, variant, version);
    if (silhouette) {
      // comparaison des silhouettes : une seule matière noire
      const black = new THREE.MeshBasicMaterial({ color: '#000000' });
      rig.bodyPivot.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = black;
      });
    }
    scene.add(rig.root);
    rig.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(rig.bodyPivot);
    const center = bounds.getCenter(new THREE.Vector3());
    const s = bounds.getSize(new THREE.Vector3());
    // ART2 : la créature remplit au moins 70 % de la hauteur du cadre (largeur bornée à 90 %)
    const dist = Math.max(s.y / 0.8, Math.max(s.x, s.z) / 0.9) / 2 / Math.tan((14 * Math.PI) / 180);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(center.x, center.y + dist * 0.28, center.z + dist);
    camera.lookAt(center);
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      rig.root.rotation.y = ((now - start) / 1000) * 0.9;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      rig.root.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) for (const x of Array.isArray(mat) ? mat : [mat]) x.dispose();
      });
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [speciesId, size, reduced, variant, version, silhouette]);

  if (reduced || failed.current) return <VoxelCreatureAvatar speciesId={speciesId} size={size} />;
  return <div ref={mount} style={{ width: size, height: size }} aria-hidden="true" />;
}
