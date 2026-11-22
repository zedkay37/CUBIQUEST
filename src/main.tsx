import {lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// `?gallery=1` : galerie de revue des créatures et des biomes (outil de développement, le jeu n'est pas lancé).
// Chargée à la demande : son code n'est pas téléchargé par les joueurs.
const galleryParam = new URLSearchParams(window.location.search).get('gallery');
const isGallery = galleryParam === '1';
// `?gallery=ui` : composants de l'interface et moments forts (outil de développement)
const isUiGallery = galleryParam === 'ui';
const UiGallery = lazy(() => import('./components/ui/UiGallery.tsx').then((module) => ({default: module.UiGallery})));
const GalleryPage = lazy(() =>
  import('./components/GalleryPage.tsx').then((module) => ({default: module.GalleryPage})),
);

createRoot(document.getElementById('root')!).render(
  isUiGallery ? (
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
