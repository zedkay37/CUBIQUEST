/**
 * Interface (sprint UI) : jetons identiques en TypeScript et en CSS, contraste des textes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contrastRatio, UI_TEXT_PAIRS, UI_TOKENS } from './styleGuide';

const css = fs.readFileSync('src/index.css', 'utf8');
const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

test('Interface: les couleurs de UI_TOKENS et les variables CSS --ui-* sont identiques', () => {
  for (const [key, value] of Object.entries(UI_TOKENS.color)) {
    const m = css.match(new RegExp(`--ui-${kebab(key)}: *(#[0-9a-fA-F]{6});`));
    assert.ok(m, `--ui-${kebab(key)} absente de index.css`);
    assert.equal(m[1].toUpperCase(), value.toUpperCase(), key);
  }
  assert.match(css, new RegExp(`--ui-radius: *${UI_TOKENS.radius}px`));
  assert.match(css, new RegExp(`--ui-fast: *${UI_TOKENS.duration.fast}ms`));
  assert.match(css, new RegExp(`--ui-normal: *${UI_TOKENS.duration.normal}ms`));
  assert.match(css, new RegExp(`--ui-slow: *${UI_TOKENS.duration.slow}ms`));
});

test('Interface: chaque couleur de texte garde un contraste d’au moins 4,5 pour 1', () => {
  for (const [fg, bg] of UI_TEXT_PAIRS) {
    assert.ok(contrastRatio(fg, bg) >= 4.5, `${fg} sur ${bg} : ${contrastRatio(fg, bg).toFixed(2)}`);
  }
  assert.ok(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.01);
});

test('Interface: les animations respectent prefers-reduced-motion', () => {
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\)/g) ?? [];
  assert.ok(reduced.length >= 2, 'bloc prefers-reduced-motion attendu dans index.css');
  // l'application et la galerie délèguent les animations motion au réglage du système
  assert.match(fs.readFileSync('src/App.tsx', 'utf8'), /MotionConfig reducedMotion="user"/);
  assert.match(fs.readFileSync('src/components/ui/UiGallery.tsx', 'utf8'), /MotionConfig reducedMotion="user"/);
});
