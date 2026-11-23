# Captures de tous les Ã©crans (outil de dÃ©veloppement, sprint UI).
#   powershell -File tools/captures.ps1 -Out docs/captures/ui/avant
# Construit le site dans un dossier temporaire, le sert localement sous /CUBIQUEST/ et photographie chaque
# Ã©cran avec Edge sans interface, en bureau (1280 x 720) et en mobile (360 x 640). Chaque capture part d'un
# profil vide : aucune sauvegarde du joueur n'est lue ni modifiÃ©e.
param([string]$Out = 'docs/captures/ui/avant', [int]$Port = 4176, [string]$Only = '', [switch]$Gpu, [string]$Formats = 'bureau,mobile', [string]$Extra = '')
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$tmp = Join-Path $env:TEMP ("cubiquest-captures-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $tmp | Out-Null
$env:BASE_PATH = '/CUBIQUEST/'
cmd /c "npx vite build --outDir `"$tmp\site`" --emptyOutDir > nul 2>&1"
if (-not (Test-Path "$tmp\site\index.html")) { throw 'la construction du site a Ã©chouÃ©' }
Remove-Item Env:BASE_PATH
$server = @"
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const dir = process.argv[2]; const prefix = '/CUBIQUEST/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  // Cadre de taille fixe : les navigateurs de bureau imposent une largeur minimale de fenêtre (environ 500 px),
  // une vraie largeur de 360 px s'obtient avec une iframe.
  if (url === prefix + '__frame') {
    const q = new URL(req.url, 'http://x').searchParams;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<!doctype html><html><body style="margin:0;background:#000"><iframe src="' + q.get('src') + '" width="' + q.get('w') + '" height="' + q.get('h') + '" style="border:0;display:block"></iframe></body></html>');
  }
  if (!url.startsWith(prefix)) { res.writeHead(404); return res.end(); }
  let file = path.join(dir, url.slice(prefix.length));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.argv[3]));
"@
Set-Content -Encoding utf8 "$tmp\serve.mjs" $server
# BESTIAIRE : refuser de photographier si le port est déjà pris (un serveur resté ouvert servirait un ancien site)
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw "le port $Port est deja utilise (serveur de captures reste ouvert ?) : arreter ce processus avant de recommencer" }
$proc = Start-Process -PassThru -WindowStyle Hidden -FilePath node -ArgumentList @("$tmp\serve.mjs", "$tmp\site", "$Port")
Start-Sleep -Seconds 2
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$screens = [ordered]@{
  'titre'          = ''
  'depart'         = '?ui=starter'
  'camp-jour'      = '?autostart=1&hour=0.3'
  'camp-nuit'      = '?autostart=1&hour=0.8'
  'camp-aube'      = '?autostart=1&hour=0.01'
  'expeditions'    = '?autostart=1&ui=expeditions'
  'equipe'         = '?autostart=1&ui=team'
  'carnet'         = '?autostart=1&ui=carnet'
  'combat'         = '?stage=tundra-1'
  'pause'          = '?stage=tundra-1&ui=pause'
  'victoire'       = '?stage=meadow-2&ui=victory'
  'defaite'        = '?stage=meadow-2&ui=defeat'
  'evolution'      = '?autostart=1&ui=evolution'
  'galerie-ui'     = '?gallery=ui'
  'atelier'        = '?autostart=1&ui=atelier'
  'revelation-commune' = '?gallery=reveal&case=common&fin=1'
  'revelation-peu-commune' = '?gallery=reveal&case=uncommon&fin=1'
  'revelation-rare' = '?gallery=reveal&case=rare&fin=1'
  'revelation-galerie' = '?gallery=reveal'
  'revelation-eveillee' = '?gallery=reveal&case=awakened&fin=1'
  'revelation-doublon' = '?gallery=reveal&case=variant&fin=1'
  'galerie'        = '?gallery=1'
  'lignee-foudre'  = '?gallery=1&line=voltik'
  'combat-prairie' = '?stage=meadow-2'
  'boss-prairie'   = '?stage=meadow-3'
  'art-pyrocube' = '?gallery=art&species=pyrocube'
  'art-flambrix' = '?gallery=art&species=flambrix'
  'art-ignisaur' = '?gallery=art&species=ignisaur'
  'art-voltik' = '?gallery=art&species=voltik'
  'art-sparkube' = '?gallery=art&species=sparkube'
  'art-raicube' = '?gallery=art&species=raicube'
  'art-cailloc' = '?gallery=art&species=cailloc'
  'art-granitox' = '?gallery=art&species=granitox'
  'art-magmadrake' = '?gallery=art&species=magmadrake'
  'art-silhouettes' = '?gallery=art&species=pyrocube&silhouette=1'
  'art-vox'        = '?gallery=art&species=voltik&vox=exemple'
  'styles-vitrine' = '?gallery=styles'
  'styles-jeu'     = '?gallery=styles&view=jeu'
  'styles-jeu-nuit' = '?gallery=styles&view=jeu&nuit=1'
  'styles-vitrine-nuit' = '?gallery=styles&nuit=1'
  'styles-tons-aucun' = '?gallery=styles&view=jeu&compare=C&tone=aucun'
  'styles-tons-neutre' = '?gallery=styles&view=jeu&compare=C&tone=neutre'
  'styles-tons-actuel' = '?gallery=styles&view=jeu&compare=C'
  'styles-saturation' = '?gallery=styles&view=jeu&compare=C&sat=1'
  'styles-aa' = '?gallery=styles&view=jeu&compare=C&aa=2'
  'styles-camera-proche' = '?gallery=styles&view=jeu&compare=C&cam=proche'
  'styles-comparer-e' = '?gallery=styles&compare=E'
  's2-A' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=A'
  's2-B' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=B'
  's2-C' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=C'
  's2-D' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=D'
  's2-E' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=E'
  's2-F' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=F'
  's2-G' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=G'
  's2-H' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=H'
  's2-I' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=I'
  's2-J' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=J'
  's2-K' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=K'
  's2-L' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=L'
  's2-M' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=M'
  's2-N' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=N'
  's2-O' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=O'
  's2-P' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=P'
  's2-Q' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=Q'
  's2-R' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=R'
  's2-S' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=S'
  's2-T' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&focus=T'
  's2-grille-jeu' = '?gallery=styles&view=jeu&tone=neutre&cam=proche'
  's2-grille-vitrine' = '?gallery=styles'
  's2-comparer' = '?gallery=styles&view=jeu&tone=neutre&cam=proche&compare=C,O'
  'c3-face-A' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=A'
  'c3-profil-A' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=A'
  'c3-face-B' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=B'
  'c3-profil-B' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=B'
  'c3-face-C' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=C'
  'c3-profil-C' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=C'
  'c3-face-D' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=D'
  'c3-profil-D' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=D'
  'c3-face-E' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=E'
  'c3-profil-E' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=E'
  'c3-face-F' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=F'
  'c3-profil-F' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=F'
  'c3-face-G' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=G'
  'c3-profil-G' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=G'
  'c3-face-H' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=H'
  'c3-profil-H' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=H'
  'c3-face-I' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=I'
  'c3-profil-I' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=I'
  'c3-face-J' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=J'
  'c3-profil-J' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=J'
  'c3-face-K' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=K'
  'c3-profil-K' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=K'
  'c3-face-L' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=L'
  'c3-profil-L' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=L'
  'c3-face-M' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=M'
  'c3-profil-M' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=M'
  'c3-face-N' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=N'
  'c3-profil-N' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=N'
  'c3-face-O' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=O'
  'c3-profil-O' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=O'
  'c3-face-P' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=P'
  'c3-profil-P' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=P'
  'c3-face-Q' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=Q'
  'c3-profil-Q' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=Q'
  'c3-face-R' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=R'
  'c3-profil-R' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=R'
  'c3-face-S' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=S'
  'c3-profil-S' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=S'
  'c3-face-T' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=face&focus=T'
  'c3-profil-T' = '?gallery=styles&creature=calcinarque&tone=neutre&angle=profil&focus=T'
  'c3-silhouettes' = '?gallery=styles&silhouette=1&angle=profil&compare=magmadrake:A,calcinarque:A'
  'c3-grille-vitrine' = '?gallery=styles&creature=calcinarque&tone=neutre'
  'c3-grille-jeu' = '?gallery=styles&creature=calcinarque&view=jeu&tone=neutre'
  'c3-comparer-jeu' = '?gallery=styles&view=jeu&tone=neutre&compare=magmadrake:C,calcinarque:C'
  'mesure-prairie-low' = '?stage=meadow-2&debug=1&quality=low'
  'mesure-prairie-medium' = '?stage=meadow-2&debug=1&quality=medium'
  'mesure-prairie-high' = '?stage=meadow-2&debug=1&quality=high'
  'lignee-pyrocube' = '?gallery=1&line=pyrocube'
  'lignee-cailloc' = '?gallery=1&line=cailloc'
  'combat-rive'    = '?stage=shore-2'
  'combat-crete'   = '?stage=volcano-2'
  'combat-sanctuaire' = '?stage=sanctuary-2'
  'combat-toundra' = '?stage=tundra-2'
  'combat-cime'    = '?stage=stormpeak-2'
  'combat-canyon'  = '?stage=canyon-2'
  'mesure-high' = '?stage=volcano-2&debug=1&quality=high'
  'mesure-medium' = '?stage=volcano-2&debug=1&quality=medium'
  'mesure-low' = '?stage=volcano-2&debug=1&quality=low'
}
$sizes = @{ 'bureau' = '1280,720'; 'mobile' = '360,640'; 'telephone' = '390,844'; 'grand' = '1280,1180' }
if ($Formats) { $keep = $Formats -split ','; foreach ($k in @($sizes.Keys)) { if (-not ($keep -contains $k)) { $sizes.Remove($k) } } }
New-Item -ItemType Directory -Force (Join-Path $root $Out) | Out-Null
try {
# écrans supplémentaires (vox:planche) : « nom|adresse;nom|adresse »
if ($Extra) { foreach ($pair in ($Extra -split ';')) { $kv = $pair -split '\|', 2; if ($kv.Count -eq 2) { $screens[$kv[0]] = $kv[1] } } }
  foreach ($name in $screens.Keys) {
    if ($Only -and -not (($Only -split ",") -contains $name)) { continue }
    foreach ($size in $sizes.Keys) {
      $file = Join-Path $root "$Out\$name-$size.png"
      $profile = Join-Path $tmp ("edge-" + [guid]::NewGuid().ToString('N'))
      Start-Process -Wait -WindowStyle Hidden -FilePath $edge -ArgumentList @('--headless=new', $(if ($Gpu) { '--use-angle=d3d11' } else { '--use-angle=swiftshader' }), $(if ($Gpu) { '--enable-gpu' } else { '--enable-unsafe-swiftshader' }), "--user-data-dir=$profile", '--hide-scrollbars', "--window-size=$($sizes[$size])", '--virtual-time-budget=9000', "--screenshot=$file", ($(if ($size -ne 'bureau') { $wh = $sizes[$size] -split ','; "http://localhost:$Port/CUBIQUEST/__frame?w=$($wh[0])&h=$($wh[1])&src=" + [uri]::EscapeDataString("/CUBIQUEST/$($screens[$name])") } else { "http://localhost:$Port/CUBIQUEST/$($screens[$name])" })))
    }
  }
} finally {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
Get-ChildItem (Join-Path $root $Out) | Measure-Object | Select-Object -ExpandProperty Count

