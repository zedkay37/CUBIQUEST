import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {GalleryPage} from './components/GalleryPage.tsx';
import './index.css';

// `?gallery=1` : galerie de revue des Cubimons et des biomes (outil de développement, le jeu n'est pas lancé)
const isGallery = new URLSearchParams(window.location.search).get('gallery') === '1';

createRoot(document.getElementById('root')!).render(isGallery ? <GalleryPage /> : <App />);
