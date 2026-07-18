# Regenerate Android launcher icons from a 1024x1024 source PNG.
#
# Avoids `expo prebuild --clean` (which wipes android/ and forces a full native
# rebuild). Uses .NET System.Drawing — no extra dependencies. Writes PNGs and
# removes the stale .webp launcher assets so aapt has a single source per name.
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/gen-android-icons.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = 'C:\K\Logo\kshetra_appicon_darkbg_1024.png'
$res = 'C:\K\apps\mobile\android\app\src\main\res'

# Legacy launcher icons are 48dp; adaptive foreground is 108dp.
$launcher = [ordered]@{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }
$foreground = [ordered]@{ 'mdpi' = 108; 'hdpi' = 162; 'xhdpi' = 216; 'xxhdpi' = 324; 'xxxhdpi' = 432 }

$source = [System.Drawing.Image]::FromFile($src)

function Save-Resized([System.Drawing.Image]$img, [int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $size, $size)
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "wrote $outPath ($size px)"
}

foreach ($d in $launcher.Keys) {
  $dir = Join-Path $res "mipmap-$d"
  # Remove stale webp so PNG is the sole resource for each name.
  foreach ($n in 'ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground') {
    $webp = Join-Path $dir "$n.webp"
    if (Test-Path $webp) { Remove-Item $webp -Force }
  }
  Save-Resized $source $launcher[$d]   (Join-Path $dir 'ic_launcher.png')
  Save-Resized $source $launcher[$d]   (Join-Path $dir 'ic_launcher_round.png')
  Save-Resized $source $foreground[$d] (Join-Path $dir 'ic_launcher_foreground.png')
}

$source.Dispose()
Write-Host 'DONE: launcher icons regenerated.'
