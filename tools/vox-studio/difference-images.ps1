# BESTIAIRE : compare deux captures pixel par pixel (même taille) et dit combien de pixels diffèrent.
#   powershell -ExecutionPolicy Bypass -File tools/vox-studio/difference-images.ps1 -A avant.png -B apres.png [-Seuil 8]
# Un pixel « diffère » si une composante (R, G ou B) s'écarte de plus de -Seuil (0 à 255).
param([Parameter(Mandatory = $true)][string]$A, [Parameter(Mandatory = $true)][string]$B, [int]$Seuil = 8)
Add-Type -AssemblyName System.Drawing
$ia = [System.Drawing.Bitmap]::FromFile((Resolve-Path $A))
$ib = [System.Drawing.Bitmap]::FromFile((Resolve-Path $B))
if ($ia.Width -ne $ib.Width -or $ia.Height -ne $ib.Height) { Write-Output "tailles differentes : $($ia.Width)x$($ia.Height) / $($ib.Width)x$($ib.Height)"; exit 2 }
$rect = New-Object System.Drawing.Rectangle 0, 0, $ia.Width, $ia.Height
$fmt = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
$da = $ia.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $fmt)
$db = $ib.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $fmt)
$n = $da.Stride * $ia.Height
$ba = New-Object byte[] $n; $bb = New-Object byte[] $n
[System.Runtime.InteropServices.Marshal]::Copy($da.Scan0, $ba, 0, $n)
[System.Runtime.InteropServices.Marshal]::Copy($db.Scan0, $bb, 0, $n)
$ia.UnlockBits($da); $ib.UnlockBits($db)
$diff = 0; $max = 0
for ($i = 0; $i -lt $n; $i += 4) {
  $d = [math]::Max([math]::Abs($ba[$i] - $bb[$i]), [math]::Max([math]::Abs($ba[$i + 1] - $bb[$i + 1]), [math]::Abs($ba[$i + 2] - $bb[$i + 2])))
  if ($d -gt $max) { $max = $d }
  if ($d -gt $Seuil) { $diff++ }
}
$total = $ia.Width * $ia.Height
Write-Output ("{0} pixel(s) differents sur {1} ({2:N3} %), ecart maximal {3}" -f $diff, $total, (100.0 * $diff / $total), $max)
