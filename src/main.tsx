import {lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// `?gallery=1` : galerie de revue des créatures et des biomes (outil de développement, le jeu n'est pas lancé).
// Chargée à la demande : son code n'est pas téléchargé par les joueurs.
const isGallery = new URLSearchParams(window.location.search).get('gallery') === '1';
const GalleryPage = lazy(() =>
  import('./components/GalleryPage.tsx').then((module) => ({default: module.GalleryPage})),
);

createRoot(document.getElementById('root')!).render(
  isGallery ? (
    <Suspense fallback={null}>
      <GalleryPage />
    </Suspense>
  ) : (
    <App />
  ),
);
