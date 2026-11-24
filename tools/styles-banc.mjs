// STYLES4 : mesures de la page `?gallery=styles` dans Edge sans interface, avec la carte graphique (protocole de
// débogage du navigateur, aucune dépendance) :
//  - images par seconde de chaque style avec six créatures à l'écran (`&banc=X`, 12 s mesurées, `window.__banc`) ;
//  - triangles par créature et par style (grille « Tous » de chaque créature, `window.__mesures`).
//   node tools/styles-banc.mjs <dossier du site construit avec BASE_PATH=/CUBIQUEST/> [styles] [créatures]
// Synchronisation verticale coupée : les images par seconde ne plafonnent pas à 60 (on voit l'écart entre styles).
// Résultat indicatif : Edge sans interface n'est pas le navigateur du joueur (CLAUDE.md, pièges connus).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const [dir, stylesArg = 'A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T', subsArg = 'calcinarque-legendaire,amanitox,crabastion,braizard'] = process.argv.slice(2);
const port = 4191;
const prefix = '/CUBIQUEST/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith(prefix)) return res.writeHead(404).end();
    let file = path.join(dir, url.slice(prefix.length));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port);
const edge = path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(query, expr, timeoutS, settleS = 0) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-styles-'));
  const dbg = 9400 + Math.floor(Math.random() * 400);
  const proc = spawn(edge, ['--headless=new', '--use-angle=d3d11', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit', `--user-data-dir=${profile}`, '--window-size=1280,1180', `--remote-debugging-port=${dbg}`, 'about:blank']);
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${dbg}/json`)).json()).find((t) => t.type === 'page');
    } catch {
      /* Edge démarre */
    }
  }
  if (!target) throw new Error('Edge ne répond pas');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) pending.get(m.id)(m);
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      id += 1;
      pending.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  await send('Page.navigate', { url: `http://localhost:${port}${prefix}?gallery=styles&${query}` });
  if (settleS) await sleep(settleS * 1000);
  let result = null;
  for (let i = 0; i < timeoutS && !result; i++) {
    await sleep(1000);
    const r = await send('Runtime.evaluate', { expression: `JSON.stringify(${expr} ?? null)`, returnByValue: true });
    const v = r.result?.result?.value;
    if (v && v !== 'null') result = JSON.parse(v);
  }
  ws.close();
  proc.kill();
  return result;
}

const styles = stylesArg.split(',');
const subs = subsArg.split(',');
const fps = {};
for (const s of styles) {
  fps[s] = await run(`banc=${s}`, 'window.__banc', 60);
  console.error('banc', s, JSON.stringify(fps[s]));
}
const tri = {};
for (const sub of subs) {
  // grille « Tous » de la créature : on laisse 20 s pour que chaque case ait été dessinée et mesurée
  tri[sub] = await run(`tous=1&creature=${sub}&angle=face`, 'window.__mesures', 10, 20);
  console.error('triangles', sub, Object.keys(tri[sub] ?? {}).length);
}
server.close();
console.log(JSON.stringify({ fps, tri }));
