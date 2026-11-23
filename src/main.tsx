import {lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {setSculptModels} from './game/models/creatures';

// `?gallery=1` : galerie de revue des créatures et des biomes (outil de développement, le jeu n'est pas lancé).
// Chargée à la demande : son code n'est pas téléchargé par les joueurs.
const galleryParam = new URLSearchParams(window.location.search).get('gallery');
const isGallery = galleryParam === '1';
// `?gallery=ui` : composants de l'interface et moments forts (outil de développement)
const isUiGallery = galleryParam === 'ui';
// `?gallery=reveal` : révélations du Cube Scellé, une par rareté (outil de développement)
const isRevealGallery = galleryParam === 'reveal';
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

createRoot(document.getElementById('root')!).render(
  isRevealGallery ? (
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
);
