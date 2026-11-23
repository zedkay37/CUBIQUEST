# STYLES2 : réunit des captures en une planche unique (grille), avec la lettre de chaque case.
#   powershell -ExecutionPolicy Bypass -File tools/planche.ps1 -Dir docs/captures/styles2 -Prefix s2- -Out docs/captures/styles2/planche-20-styles.png
# Lit <Dir>/<Prefix><Lettre>-bureau.png pour A à T ; colonnes : 5 ; vignettes de 384 × 216.
param([string]$Dir = 'docs/captures/styles2', [string]$Prefix = 's2-', [string]$Out = 'docs/captures/styles2/planche-20-styles.png', [int]$Cols = 5)
Add-Type -AssemblyName System.Drawing
$letters = 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'
$w = 384; $h = 216; $rows = [math]::Ceiling($letters.Count / $Cols)
$bmp = New-Object System.Drawing.Bitmap ($w * $Cols), ($h * $rows)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(15, 20, 32))
$font = New-Object System.Drawing.Font 'Segoe UI', 16, ([System.Drawing.FontStyle]::Bold)
$bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210, 15, 20, 32))
$fg = [System.Drawing.Brushes]::White
for ($i = 0; $i -lt $letters.Count; $i++) {
  $file = Join-Path $Dir ("$Prefix" + $letters[$i] + '-bureau.png')
  $x = ($i % $Cols) * $w; $y = [math]::Floor($i / $Cols) * $h
  if (Test-Path $file) {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $file))
    # la capture plein écran a une barre de titre de 60 pixels : on la retire
    $src = New-Object System.Drawing.Rectangle 10, 62, ($img.Width - 20), ($img.Height - 72)
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle $x, $y, $w, $h), $src, [System.Drawing.GraphicsUnit]::Pixel)
    $img.Dispose()
  }
  $g.FillRectangle($bg, $x + 6, $y + 6, 34, 30)
  $g.DrawString($letters[$i], $font, $fg, $x + 10, $y + 7)
}
$bmp.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "planche : $Out"
