/**
 * Mise en ligne sur GitHub Pages (branche `gh-pages`), sans dépendance et compatible Windows.
 *
 *   npm run deploy:pages -- --target next            # la branche courante devient …/CUBIQUEST/next/
 *   npm run deploy:pages -- --target root            # la branche courante devient …/CUBIQUEST/
 *   npm run deploy:pages -- --target next --dry-run  # construit et prépare, sans committer ni pousser
 *
 * - `next` : BASE_PATH=/CUBIQUEST/next/, VITE_SAVE_SLOT=next (sauvegarde séparée), bandeau « version en test ».
 *   Seul le dossier `next/` de gh-pages est remplacé.
 * - `proto` : BASE_PATH=/CUBIQUEST/proto/, VITE_SAVE_SLOT=proto (sprint PROTO-MENEUR, maquette `?proto=salle`).
 *   Seul le dossier `proto/` de gh-pages est remplacé.
 * - `root` : BASE_PATH=/CUBIQUEST/. Tout est remplacé SAUF `next/` et `proto/`.
 * - Le site est construit dans un dossier temporaire et `gh-pages` est mis à jour dans un `git worktree`
 *   temporaire : l'arbre de travail et la branche courante ne sont jamais modifiés.
 * - N'active pas GitHub Pages et ne touche à aucun réglage du dépôt (rôle du propriétaire).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_BASE = '/CUBIQUEST/';
const PAGES_BRANCH = 'gh-pages';

const args = process.argv.slice(2);
const target = args[args.indexOf('--target') + 1];
const dryRun = args.includes('--dry-run');
if (!args.includes('--target') || (target !== 'next' && target !== 'proto' && target !== 'root')) {
  console.error('Usage : npm run deploy:pages -- --target next|proto|root [--dry-run]');
  process.exit(1);
}

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, { stdio: opts.capture ? 'pipe' : 'inherit', encoding: 'utf8', shell: process.platform === 'win32' && opts.shell, ...opts });
  if (res.status !== 0 && !opts.allowFail) {
    throw new Error(`échec : ${cmd} ${cmdArgs.join(' ')}\n${res.stderr ?? ''}`);
  }
  return res;
}
const git = (gitArgs, opts = {}) => run('git', gitArgs, { capture: true, ...opts });

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
const sha = git(['rev-parse', '--short', 'HEAD']).stdout.trim();
const dirty = git(['status', '--porcelain']).stdout.trim();
if (dirty) console.warn('Attention : modifications non commitées ; le site est construit depuis l’arbre de travail actuel.');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cubiquest-pages-'));
const outDir = path.join(tmp, 'site');
const worktree = path.join(tmp, 'gh-pages');
let worktreeAdded = false;

try {
  // 1. Construction dans un dossier temporaire
  const env = { ...process.env, BASE_PATH: target === 'root' ? REPO_BASE : `${REPO_BASE}${target}/` };
  delete env.VITE_SAVE_SLOT;
  delete env.VITE_TEST_BRANCH;
  if (target === 'proto') env.VITE_SAVE_SLOT = 'proto';
  if (target === 'next') {
    env.VITE_SAVE_SLOT = 'next';
    env.VITE_TEST_BRANCH = branch;
  }
  console.log(`Construction de ${branch}@${sha} pour « ${target} » (base ${env.BASE_PATH})…`);
  run('npx', ['vite', 'build', '--outDir', JSON.stringify(outDir), '--emptyOutDir'], { env, shell: true });
  if (!fs.existsSync(path.join(outDir, 'index.html'))) throw new Error('la construction n’a pas produit index.html');
  // Garde-fou : sous Git Bash, une variable qui commence par « / » peut être convertie en chemin Windows.
  if (!fs.readFileSync(path.join(outDir, 'index.html'), 'utf8').includes(`src="${env.BASE_PATH}assets/`)) {
    throw new Error(`index.html ne référence pas ${env.BASE_PATH}assets/ : chemin de base mal transmis`);
  }

  // 2. Branche gh-pages dans un worktree temporaire (créée vide si elle n'existe pas encore)
  const remote = git(['ls-remote', '--heads', 'origin', PAGES_BRANCH]).stdout.trim();
  if (remote) {
    git(['fetch', 'origin', `${PAGES_BRANCH}:refs/remotes/origin/${PAGES_BRANCH}`]);
    git(['worktree', 'add', '--force', '-B', PAGES_BRANCH, worktree, `origin/${PAGES_BRANCH}`]);
  } else {
    git(['worktree', 'add', '--force', '--orphan', '-b', PAGES_BRANCH, worktree]);
  }
  worktreeAdded = true;

  // 3. Remplacement du contenu ciblé
  const keep = new Set(['.git']);
  if (target === 'root') {
    keep.add('next');
    keep.add('proto');
  }
  const dest = target === 'root' ? worktree : path.join(worktree, target);
  if (target !== 'root') fs.rmSync(dest, { recursive: true, force: true });
  else for (const name of fs.readdirSync(worktree)) if (!keep.has(name)) fs.rmSync(path.join(worktree, name), { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(outDir, dest, { recursive: true });
  fs.writeFileSync(path.join(worktree, '.nojekyll'), '');

  git(['add', '-A'], { cwd: worktree });
  const changes = git(['status', '--porcelain'], { cwd: worktree }).stdout.trim();
  const count = changes ? changes.split('\n').length : 0;
  const message = `pages: ${target} ← ${branch}@${sha}`;
  if (dryRun) {
    console.log(`[essai] ${count} fichier(s) changeraient sur ${PAGES_BRANCH} ; commit prévu : « ${message} ». Rien n’est poussé.`);
  } else if (count === 0) {
    console.log('Aucun changement à publier.');
  } else {
    git(['commit', '-q', '-m', message], { cwd: worktree });
    run('git', ['push', 'origin', `${PAGES_BRANCH}:${PAGES_BRANCH}`], { cwd: worktree });
    console.log(`Publié : ${message}`);
  }
} finally {
  if (worktreeAdded) git(['worktree', 'remove', '--force', worktree], { allowFail: true });
  git(['worktree', 'prune'], { allowFail: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}
