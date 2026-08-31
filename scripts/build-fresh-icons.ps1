# Build and update app icons with Dark Reddish Maroon background (#540912)
Add-Type -AssemblyName System.Drawing

$repoRoot = 'c:\Users\Laven\OneDrive\Desktop\Kshetra'
$transparentLogoPath = Join-Path $repoRoot 'Logo\kshetra_appicon_transparent_512.png'
$resDir = Join-Path $repoRoot 'apps\mobile\android\app\src\main\res'
$assetsDir = Join-Path $repoRoot 'apps\mobile\assets'

# Dark Reddish Maroon color: #540912 (R: 84, G: 9, B: 18)
$maroonColor = [System.Drawing.Color]::FromArgb(255, 84, 9, 18)

Write-Host "Loading transparent emblem from: $transparentLogoPath"
$emblem = [System.Drawing.Image]::FromFile($transparentLogoPath)

# 1. Generate assets/icon.png (1024x1024 with dark reddish maroon background)
$icon1024 = New-Object System.Drawing.Bitmap 1024, 1024
$g1024 = [System.Drawing.Graphics]::FromImage($icon1024)
$g1024.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1024.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1024.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g1024.Clear($maroonColor)
# Draw emblem with 15% padding (size 720x720 at (152, 152))
$g1024.DrawImage($emblem, 152, 152, 720, 720)
$outIcon = Join-Path $assetsDir 'icon.png'
$icon1024.Save($outIcon, [System.Drawing.Imaging.ImageFormat]::Png)
$g1024.Dispose()
$icon1024.Dispose()
Write-Host "Generated: $outIcon"

# 2. Generate assets/adaptive-icon.png (1024x1024 with transparent background for adaptive foreground)
$adaptive1024 = New-Object System.Drawing.Bitmap 1024, 1024
$gAdapt = [System.Drawing.Graphics]::FromImage($adaptive1024)
$gAdapt.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gAdapt.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gAdapt.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gAdapt.Clear([System.Drawing.Color]::Transparent)
# Standard Android safe zone for adaptive icon foreground is ~66% (centered)
$gAdapt.DrawImage($emblem, 256, 256, 512, 512)
$outAdaptive = Join-Path $assetsDir 'adaptive-icon.png'
$adaptive1024.Save($outAdaptive, [System.Drawing.Imaging.ImageFormat]::Png)
$gAdapt.Dispose()
$adaptive1024.Dispose()
Write-Host "Generated: $outAdaptive"

# 3. Generate Android res/mipmap-* icons
$launcherSizes = [ordered]@{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }
$foregroundSizes = [ordered]@{ 'mdpi' = 108; 'hdpi' = 162; 'xhdpi' = 216; 'xxhdpi' = 324; 'xxxhdpi' = 432 }

foreach ($density in $launcherSizes.Keys) {
  $targetDir = Join-Path $resDir "mipmap-$density"
  if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  }

  $size = $launcherSizes[$density]
  $fgSize = $foregroundSizes[$density]

  # Clean any stale webp files
  foreach ($name in @('ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp')) {
    $stale = Join-Path $targetDir $name
    if (Test-Path $stale) { Remove-Item $stale -Force }
  }

  # --- ic_launcher.png (Full icon with dark reddish maroon background) ---
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($maroonColor)
  $emblemSize = [int]($size * 0.76)
  $offset = [int](($size - $emblemSize) / 2)
  $g.DrawImage($emblem, $offset, $offset, $emblemSize, $emblemSize)
  $bmp.Save((Join-Path $targetDir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()

  # --- ic_launcher_round.png (Circular icon with dark reddish maroon background) ---
  $bmpRound = New-Object System.Drawing.Bitmap $size, $size
  $gRound = [System.Drawing.Graphics]::FromImage($bmpRound)
  $gRound.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gRound.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gRound.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gRound.Clear([System.Drawing.Color]::Transparent)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(0, 0, $size, $size)
  $gRound.SetClip($path)
  $brush = New-Object System.Drawing.SolidBrush $maroonColor
  $gRound.FillEllipse($brush, 0, 0, $size, $size)
  $brush.Dispose()
  $gRound.DrawImage($emblem, $offset, $offset, $emblemSize, $emblemSize)
  $path.Dispose()
  $bmpRound.Save((Join-Path $targetDir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $gRound.Dispose(); $bmpRound.Dispose()

  # --- ic_launcher_foreground.png (Centered transparent emblem for adaptive icon) ---
  $bmpFg = New-Object System.Drawing.Bitmap $fgSize, $fgSize
  $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
  $gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gFg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gFg.Clear([System.Drawing.Color]::Transparent)
  # In 108dp adaptive foreground, the inner 72dp is the safe viewport (emblem occupies ~65% of viewport)
  $fgEmblemSize = [int]($fgSize * 0.50)
  $fgOffset = [int](($fgSize - $fgEmblemSize) / 2)
  $gFg.DrawImage($emblem, $fgOffset, $fgOffset, $fgEmblemSize, $fgEmblemSize)
  $bmpFg.Save((Join-Path $targetDir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $gFg.Dispose(); $bmpFg.Dispose()

  Write-Host "Updated mipmap-$density launcher assets."
}

$emblem.Dispose()
Write-Host "All Android launcher icons successfully updated with Dark Reddish Maroon (#540912)!"
