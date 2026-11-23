// Phase 0 du sprint BESTIAIRE : lance la mesure `?bench=1` (30 s en temps réel) dans Edge sans interface, avec la
// carte graphique, et lit le résultat (`window.__bench`) par le protocole de débogage du navigateur.
//   node tools/vox-studio/bench-edge.mjs <dossier du site construit> "<paramètres>" [répétitions]
// Le site doit être construit avec BASE_PATH=/CUBIQUEST/. Aucune dépendance : http et WebSocket de Node.
// Résultat indicatif : Edge sans interface n'est pas le navigateur du joueur (voir CLAUDE.md, pièges connus).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const [dir, query, reps = '1'] = process.argv.slice(2);
const port = 4189;
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

const edge = `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function once() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-bench-'));
  const dbg = 9300 + Math.floor(Math.random() * 400);
  const proc = spawn(edge, ['--headless=new', '--use-angle=d3d11', '--enable-gpu', `--user-data-dir=${profile}`, '--window-size=1280,720', `--remote-debugging-port=${dbg}`, 'about:blank']);
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json();
      target = list.find((t) => t.type === 'page');
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
  await send('Page.navigate', { url: `http://localhost:${port}${prefix}?bench=1&${query}` });
  let result = null;
  for (let i = 0; i < 120 && !result; i++) {
    await sleep(1000);
    const r = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__bench ?? null)', returnByValue: true });
    const v = r.result?.result?.value;
    if (process.env.BENCH_DEBUG && i % 10 === 0) {
      const t = await send('Runtime.evaluate', { expression: 'performance.getEntriesByType("resource").map(e => e.name.split("/").pop() + " " + e.responseStatus).join(", ").slice(0, 400)', returnByValue: true });
      console.error(i, t.result?.result?.value);
    }
    if (v && v !== 'null') result = JSON.parse(v);
  }
  ws.close();
  proc.kill();
  return result;
}

for (let k = 0; k < Number(reps); k++) console.log(JSON.stringify(await once()));
server.close();
