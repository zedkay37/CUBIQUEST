# Captures de tous les écrans (outil de développement, sprint UI).
#   powershell -File tools/captures.ps1 -Out docs/captures/ui/avant
# Construit le site dans un dossier temporaire, le sert localement sous /CUBIQUEST/ et photographie chaque
# écran avec Edge sans interface, en bureau (1280 x 720) et en mobile (360 x 640). Chaque capture part d'un
# profil vide : aucune sauvegarde du joueur n'est lue ni modifiée.
param([string]$Out = 'docs/captures/ui/avant', [int]$Port = 4176)
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$tmp = Join-Path $env:TEMP ("cubiquest-captures-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $tmp | Out-Null
$env:BASE_PATH = '/CUBIQUEST/'
cmd /c "npx vite build --outDir `"$tmp\site`" --emptyOutDir > nul 2>&1"
if (-not (Test-Path "$tmp\site\index.html")) { throw 'la construction du site a échoué' }
Remove-Item Env:BASE_PATH
$server = @"
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const dir = process.argv[2]; const prefix = '/CUBIQUEST/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (!url.startsWith(prefix)) { res.writeHead(404); return res.end(); }
  let file = path.join(dir, url.slice(prefix.length));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.argv[3]));
"@
Set-Content -Encoding utf8 "$tmp\serve.mjs" $server
$proc = Start-Process -PassThru -WindowStyle Hidden -FilePath node -ArgumentList @("$tmp\serve.mjs", "$tmp\site", "$Port")
Start-Sleep -Seconds 2
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$screens = [ordered]@{
  'titre'          = ''
  'depart'         = '?ui=starter'
  'camp-jour'      = '?autostart=1&hour=0.3'
  'camp-nuit'      = '?autostart=1&hour=0.8'
  'expeditions'    = '?autostart=1&ui=expeditions'
  'equipe'         = '?autostart=1&ui=team'
  'marmite'        = '?autostart=1&ui=cooking'
  'quetes'         = '?autostart=1&ui=quests'
  'codex'          = '?autostart=1&ui=codex'
  'combat'         = '?stage=tundra-1'
  'pause'          = '?stage=tundra-1&ui=pause'
  'victoire'       = '?stage=meadow-2&ui=victory'
  'defaite'        = '?stage=meadow-2&ui=defeat'
  'evolution'      = '?autostart=1&ui=evolution'
  'galerie-ui'     = '?gallery=ui'
}
$sizes = @{ 'bureau' = '1280,720'; 'mobile' = '360,640' }
New-Item -ItemType Directory -Force (Join-Path $root $Out) | Out-Null
try {
  foreach ($name in $screens.Keys) {
    foreach ($size in $sizes.Keys) {
      $file = Join-Path $root "$Out\$name-$size.png"
      $profile = Join-Path $tmp ("edge-" + [guid]::NewGuid().ToString('N'))
      Start-Process -Wait -WindowStyle Hidden -FilePath $edge -ArgumentList @('--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', "--user-data-dir=$profile", '--hide-scrollbars', "--window-size=$($sizes[$size])", '--virtual-time-budget=9000', "--screenshot=$file", "http://localhost:$Port/CUBIQUEST/$($screens[$name])")
    }
  }
} finally {
  Stop-Process -Id $proc.Id -Force
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
Get-ChildItem (Join-Path $root $Out) | Measure-Object | Select-Object -ExpandProperty Count
