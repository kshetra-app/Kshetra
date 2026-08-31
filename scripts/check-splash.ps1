Add-Type -AssemblyName System.Drawing
$paths = @(
    'C:\K\apps\mobile\assets\splash-icon.png',
    'C:\K\apps\mobile\android\app\src\main\res\drawable-xxxhdpi\splashscreen_logo.png',
    'C:\K\apps\mobile\android\app\src\main\res\drawable-hdpi\splashscreen_logo.png'
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        $bmp = [System.Drawing.Bitmap]::FromFile($p)
        Write-Host ('File: {0} ({1}x{2})' -f $p, $bmp.Width, $bmp.Height)
        $centerPixel = $bmp.GetPixel([int]($bmp.Width/2), [int]($bmp.Height/2))
        Write-Host ('  Center pixel: ARGB({0},{1},{2},{3})' -f $centerPixel.A, $centerPixel.R, $centerPixel.G, $centerPixel.B)
        $bmp.Dispose()
    } else {
        Write-Host ('Not found: {0}' -f $p)
    }
}
