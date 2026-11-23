/**
 * Liste les textes visibles restés en dur dans l'interface (ils devraient vivre dans src/i18n/fr.ts).
 *
 *   npm run texts              # liste fichier:ligne, type, texte
 *   npm run texts -- --strict  # code de sortie 1 s'il en reste (hors exceptions ci-dessous)
 *   npm run texts -- --all     # inclut aussi src/game (plus de faux positifs : identifiants, clés)
 *
 * Est considéré comme texte visible : un texte JSX contenant une lettre ; une chaîne ou un gabarit
 * qui « ressemble à une phrase » (majuscule, accent, ponctuation française ou deux mots), hors
 * attributs techniques (className, id, d...) et hors comparaisons / appels techniques.
 * Les fragments sans lettre (« ( », « % », « · ») ne sont pas des textes à traduire : ils restent en place.
 */
import fs from 'node:fs';
import path from 'node:path';

import { parse } from '@babel/parser';

/** Fichiers volontairement laissés tels quels (voir docs/archives/GIGA_FONDATIONS.md). */
const EXCEPTIONS: Record<string, string> = {
  'src/components/GalleryPage.tsx': 'outil de développement (?gallery=1), jamais vu par le joueur',
  'src/components/ArtGallery.tsx': 'outil de développement (?gallery=art), jamais montré aux joueurs',
  'src/components/StylesGallery.tsx': 'outil de développement (?gallery=styles, sprint STYLES), jamais vu par les joueurs',
  'src/components/PlancheGallery.tsx': 'outil de développement (?gallery=planche, sprint BESTIAIRE), jamais vu par les joueurs',
  'src/components/styles/magmaStyles.ts': 'outil de développement (?gallery=styles, sprint STYLES), jamais vu par les joueurs',
  'src/components/styles/magmaStyles2.ts': 'outil de développement (?gallery=styles, sprint STYLES2), jamais vu par les joueurs',
  'src/components/styles/allStyles.ts': 'outil de développement (?gallery=styles, sprint STYLES2), jamais vu par les joueurs',
  'src/components/styles/calcinarque.ts': 'outil de développement (?gallery=styles, sprint STYLES3), jamais vu par les joueurs',
  'src/components/styles/subject.ts': 'outil de développement (?gallery=styles, sprint STYLES3), jamais vu par les joueurs',
  'src/components/RevealGallery.tsx': 'outil de développement (?gallery=reveal), jamais montré aux joueurs',
  'src/components/BenchOverlay.tsx': 'outil de développement (?bench=1), jamais montré aux joueurs',
  'src/components/DebugOverlay.tsx': 'outil de développement (?debug=1), jamais vu par le joueur',
  'src/components/ui/UiGallery.tsx': 'outil de développement (?gallery=ui), jamais vu par le joueur',
};

const SKIP_ATTRS = new Set([
  'className', 'class', 'key', 'id', 'type', 'role', 'd', 'viewBox', 'fill', 'stroke', 'strokeLinecap',
  'strokeLinejoin', 'xmlns', 'href', 'src', 'name', 'htmlFor', 'style', 'initial', 'animate', 'exit',
  'transition', 'layoutId', 'mode', 'variant', 'size', 'tabIndex', 'accept', 'target', 'rel', 'width',
  'height', 'points', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'transform', 'strokeWidth',
  'opacity', 'inputMode', 'autoComplete', 'method', 'dir', 'lang', 'fontFamily', 'paintOrder',
]);
const SKIP_CALLEES = new Set([
  'log', 'warn', 'error', 'info', 'getItem', 'setItem', 'removeItem', 'addEventListener',
  'removeEventListener', 'createElement', 'getContext', 'getExtension', 'has', 'includes', 'startsWith',
  'endsWith', 'toLocaleString', 'toLocaleDateString', 'toLocaleTimeString', 'get', 'querySelector',
  'setAttribute', 'getAttribute', 'split', 'join', 'replace', 'match', 'test', 'indexOf', 'Error',
  'TypeError', 'RangeError', 'fetch',
]);

function looksVisible(s: string): boolean {
  if (!/\p{L}/u.test(s)) return false;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return false; // couleur
  if (/^[a-z]+([A-Z][a-z0-9]+)+$/.test(s)) return false; // identifiant camelCase
  if (/^[A-Z][A-Z0-9_]*$/.test(s) && s.length <= 6 && /^(GET|POST|PUT|INPUT|TEXTAREA)$/.test(s)) return false;
  // liste de classes CSS (Tailwind) : jetons sans accent ni majuscule, dont au moins un « technique » (- : [ ])
  const tokens = s.replace(/\$\{…\}/g, '').trim().split(/\s+/).filter(Boolean);
  if (
    tokens.length > 0 &&
    tokens.every((t) => /^[a-z0-9:\-[\]#/.%()_!,]+$/i.test(t) && !/[A-Z]/.test(t.replace(/\[[^\]]*\]/g, ''))) &&
    tokens.some((t) => /[-:[]/.test(t))
  ) {
    return false;
  }
  return /[A-ZÀ-ÖØ-Þ]/.test(s) || /[à-öø-ÿœ]/.test(s) || /[!?…«»’]/.test(s) || /\p{L} \p{L}/u.test(s);
}

interface Finding {
  file: string;
  line: number;
  kind: 'jsx' | 'attribut' | 'chaîne' | 'gabarit';
  text: string;
}

// nœud de l'arbre syntaxique : parcouru de façon générique, sans typer chaque forme
type Node = any;

function scan(file: string): Finding[] {
  const code = fs.readFileSync(file, 'utf8');
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const out: Finding[] = [];
  const add = (node: Node, kind: Finding['kind'], text: string): void => {
    out.push({ file, line: node.loc.start.line, kind, text: text.replace(/\s+/g, ' ').trim() });
  };
  const walk = (node: Node, parent: Node, ctx: { attr?: string; skip?: boolean }): void => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration') return;
    if (node.type === 'ExportNamedDeclaration' && node.source) return;
    // import('./chemin') : un chemin de module, pas un texte
    if (node.type === 'ImportExpression' || (node.type === 'CallExpression' && node.callee?.type === 'Import')) return;
    if (node.type.startsWith('TS') && !['TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression'].includes(node.type)) return;
    let c = ctx;
    if (node.type === 'JSXAttribute') c = { ...c, attr: String(node.name.name) };
    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
      const callee = node.callee;
      const name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' ? callee.property?.name : '';
      if (SKIP_CALLEES.has(name)) c = { ...c, skip: true };
    }
    if (node.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(node.operator)) c = { ...c, skip: true };
    if (node.type === 'SwitchCase') {
      for (const s of node.consequent) walk(s, node, c);
      return;
    }
    if (node.type === 'MemberExpression' && node.object?.type === 'Identifier' && node.object.name === 'FR') return;

    if (node.type === 'JSXText') {
      if (/\p{L}/u.test(node.value)) add(node, 'jsx', node.value);
      return;
    }
    if (node.type === 'StringLiteral') {
      if (c.skip || (c.attr && SKIP_ATTRS.has(c.attr))) return;
      if (parent && ['ObjectProperty', 'ObjectMethod', 'ClassProperty'].includes(parent.type) && parent.key === node) return;
      if (looksVisible(node.value)) add(node, c.attr ? 'attribut' : 'chaîne', node.value);
      return;
    }
    if (node.type === 'TemplateLiteral') {
      if (!c.skip && !(c.attr && SKIP_ATTRS.has(c.attr)) && parent?.type !== 'TaggedTemplateExpression') {
        const cooked = node.quasis.map((q: Node) => q.value.cooked ?? '').join('');
        if (looksVisible(cooked)) add(node, 'gabarit', node.quasis.map((q: Node) => q.value.cooked ?? '').join('${…}'));
      }
      for (const e of node.expressions) walk(e, node, c);
      return;
    }
    for (const key of Object.keys(node)) {
      if (['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach((x) => walk(x, node, c));
      else if (value && typeof value === 'object') walk(value, node, c);
    }
  };
  walk(ast.program, null, {});
  return out;
}

const args = process.argv.slice(2);
const list = (dir: string, ext: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(ext) && !f.endsWith('.test.ts')).map((f) => `${dir}/${f}`)
    : [];
const files = ['src/App.tsx', ...list('src/components', '.tsx'), ...list('src/components/ui', '.tsx')];
if (args.includes('--all')) files.push(...list('src/game', '.ts'), ...list('src/game/engine', '.ts'), ...list('src/game/models', '.ts'));

let remaining = 0;
const skipped: string[] = [];
for (const file of files) {
  const findings = scan(file);
  if (findings.length === 0) continue;
  if (EXCEPTIONS[file]) {
    skipped.push(`${file} : ${findings.length} texte(s) — ${EXCEPTIONS[file]}`);
    continue;
  }
  for (const f of findings) {
    remaining += 1;
    console.log(`${path.posix.normalize(f.file)}:${f.line}\t${f.kind}\t${JSON.stringify(f.text)}`);
  }
}
console.log(`\n${remaining} texte(s) en dur dans ${files.length} fichier(s) analysé(s).`);
if (skipped.length) console.log(`Exceptions (non comptées) :\n  ${skipped.join('\n  ')}`);
if (args.includes('--strict') && remaining > 0) process.exit(1);
