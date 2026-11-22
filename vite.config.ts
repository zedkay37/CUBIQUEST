import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

import {GAME_FULL_TITLE} from './src/i18n/fr';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Le titre du jeu vit dans src/i18n/fr.ts : index.html ne contient que le repère %GAME_FULL_TITLE%.
      {
        name: 'game-title-in-html',
        transformIndexHtml(html: string): string {
          return html.replaceAll('%GAME_FULL_TITLE%', GAME_FULL_TITLE);
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          // three.js et les bibliothèques d'interface changent rarement : rangées dans leurs propres
          // fichiers, le navigateur les garde en cache quand seul le code du jeu change, et les
          // télécharge en parallèle du reste.
          manualChunks(id: string): string | undefined {
            if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three';
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|motion|motion-dom|motion-utils|framer-motion|lucide-react)[\\/]/.test(id)) {
              return 'interface';
            }
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
