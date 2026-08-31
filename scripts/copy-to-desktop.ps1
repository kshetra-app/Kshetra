$src = 'C:\K\apps\mobile\android\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $src)) {
    Write-Error "Source APK not found at $src"
    exit 1
}

$destinations = @(
    'C:\Users\Laven\OneDrive\Desktop\kshetra-release.apk',
    'C:\Users\Laven\OneDrive\Desktop\kshetra.apk',
    'C:\Users\Laven\Desktop\kshetra-release.apk',
    'C:\Users\Laven\Desktop\kshetra.apk'
)

foreach ($dest in $destinations) {
    $parent = Split-Path $dest -Parent
    if (Test-Path $parent) {
        Copy-Item -Path $src -Destination $dest -Force
        $item = Get-Item $dest
        Write-Host ('Copied to: {0} ({1:N2} MB, {2})' -f $dest, ($item.Length / 1MB), $item.LastWriteTime)
    } else {
        Write-Host ('Skipping (dir does not exist): {0}' -f $parent)
    }
}
