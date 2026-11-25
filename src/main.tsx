import {lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {setSculptDetail, setSculptModels} from './game/models/creatures';
import {setArtDecor, setDecorDetail} from './game/models/meadowDecor';
import {loadSettings} from './game/settings';
import {setCreatureRim} from './game/models/voxelSculpt';
import {setCombatCameraDistance} from './game/engine/camera';
// BESTIAIRE : `?cam=proche` pour comparer avec la caméra plus proche du sprint STYLES (outil ; le jeu garde la sienne)
if (new URLSearchParams(window.location.search).get('cam') === 'proche') setCombatCameraDistance(7.5, 10);
import {parseVox, registerVoxModel} from './game/models/voxFile';

// `?gallery=1` : galerie de revue des créatures et des biomes (outil de développement, le jeu n'est pas lancé).
// Chargée à la demande : son code n'est pas téléchargé par les joueurs.
const galleryParam = new URLSearchParams(window.location.search).get('gallery');
const isGallery = galleryParam === '1';
// `?gallery=ui` : composants de l'interface et moments forts (outil de développement)
const isUiGallery = galleryParam === 'ui';
// `?gallery=reveal` : révélations du Cube Scellé, une par rareté (outil de développement)
const isRevealGallery = galleryParam === 'reveal';
// `?gallery=art` : créatures refaites, avant / après (sprint Art)
const isArtGallery = galleryParam === 'art';
// `?gallery=styles` : Magmadrake en six styles (sprint STYLES, exploration)
const isStylesGallery = galleryParam === 'styles';
// `?gallery=planche` : planche d'une créature ou d'un lot rendue par le jeu (sprint BESTIAIRE, outil)
const isPlancheGallery = galleryParam === 'planche';
// `?proto=salle` : maquette du sprint PROTO-MENEUR (page isolée ; ne lit ni n'écrit la sauvegarde ni les options du jeu)
const protoParam = new URLSearchParams(window.location.search).get('proto');
const isProto = protoParam === 'salle';
// `?proto=donjon` : maquette PROTO-DONJON ; la version publiée sur /proto/ l'ouvre aussi sans paramètre
const isDonjon = protoParam === 'donjon';
// `?banc=controle` : banc d'essai n° 1, le geste de combat (src/proto/banc/)
const isBanc = new URLSearchParams(window.location.search).get('banc') === 'controle';
const BancPage = lazy(() => import('./proto/banc/BancPage.tsx').then((module) => ({default: module.BancPage})));
// PROTO-MODELES : `?proto=accueil`, et `/proto/` sans paramètre, présentent tous les modèles
const isAccueil = protoParam === 'accueil' || (import.meta.env.VITE_SAVE_SLOT === 'proto' && !protoParam && !galleryParam && !isBanc);
const Accueil = lazy(() => import('./proto/Accueil.tsx').then((module) => ({default: module.Accueil})));
const DonjonPage = lazy(() => import('./proto/donjon/DonjonPage.tsx').then((module) => ({default: module.DonjonPage})));
const ProtoSalle = lazy(() => import('./proto/ProtoSalle.tsx').then((module) => ({default: module.ProtoSalle})));
const PlancheGallery = lazy(() => import('./components/PlancheGallery.tsx').then((module) => ({default: module.PlancheGallery})));
const StylesGallery = lazy(() => import('./components/StylesGallery.tsx').then((module) => ({default: module.StylesGallery})));
const ArtGallery = lazy(() => import('./components/ArtGallery.tsx').then((module) => ({default: module.ArtGallery})));
const RevealGallery = lazy(() => import('./components/RevealGallery.tsx').then((module) => ({default: module.RevealGallery})));
const UiGallery = lazy(() => import('./components/ui/UiGallery.tsx').then((module) => ({default: module.UiGallery})));
const GalleryPage = lazy(() =>
  import('./components/GalleryPage.tsx').then((module) => ({default: module.GalleryPage})),
);

// `?bench=1` : mesure de performance (outil). Le combat est « écrit à l'avance » : l'aléatoire est à graine fixe,
// dans cette page seulement (le jeu normal n'est jamais touché).
if (new URLSearchParams(window.location.search).get('bench') === '1') {
  let a = 0x2f6e2b1;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sprint Art : modèles sculptés dans le navigateur (les outils headless gardent les anciens, golden inchangé)
setSculptModels(true);
setArtDecor(true);
// qualité Bas choisie (options ou ?quality=low) : versions simplifiées dès la première scène
{
  const q = new URLSearchParams(window.location.search).get('quality') ?? (isProto || isDonjon || isAccueil || isBanc ? 'high' : loadSettings().quality);
  if (q === 'low') {
    setDecorDetail('low');
    setSculptDetail('low');
    setCreatureRim(false); // ART3 : contour lumineux coupé en Bas
  }
}

// ART3 : modèles .vox facultatifs (src/assets/vox/<espèce>.vox, voir docs/guide-vox.md). Sans fichier, rien ne change.
const VOX_FILES = import.meta.glob('./assets/vox/*.vox', {query: '?url', import: 'default', eager: true}) as Record<string, string>;
const voxReady = Promise.all(
  Object.entries(VOX_FILES).map(async ([path, url]) => {
    const id = path.split('/').pop()!.replace(/\.vox$/, '');
    try {
      registerVoxModel(id, parseVox(await (await fetch(url)).arrayBuffer()));
    } catch (err) {
      console.warn('vox ignoré :', id, err);
    }
  }),
);

voxReady.then(() => createRoot(document.getElementById('root')!).render(
  isBanc ? (
    <Suspense fallback={null}>
      <BancPage />
    </Suspense>
  ) : isAccueil ? (
    <Suspense fallback={null}>
      <Accueil />
    </Suspense>
  ) : isDonjon ? (
    <Suspense fallback={null}>
      <DonjonPage />
    </Suspense>
  ) : isProto ? (
    <Suspense fallback={null}>
      <ProtoSalle />
    </Suspense>
  ) : isPlancheGallery ? (
    <Suspense fallback={null}>
      <PlancheGallery />
    </Suspense>
  ) : isStylesGallery ? (
    <Suspense fallback={null}>
      <StylesGallery />
    </Suspense>
  ) : isArtGallery ? (
    <Suspense fallback={null}>
      <ArtGallery />
    </Suspense>
  ) : isRevealGallery ? (
    <Suspense fallback={null}>
      <RevealGallery />
    </Suspense>
  ) : isUiGallery ? (
    <Suspense fallback={null}>
      <UiGallery />
    </Suspense>
  ) : isGallery ? (
    <Suspense fallback={null}>
      <GalleryPage />
    </Suspense>
  ) : (
    <App />
  ),
));
