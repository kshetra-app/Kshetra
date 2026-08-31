$src = 'C:\K\apps\mobile\android\app\build\outputs\apk\release\app-release.apk'
$desktop1 = 'c:\Users\Laven\OneDrive\Desktop\kshetra-release.apk'
$desktop2 = 'c:\Users\Laven\OneDrive\Desktop\kshetra.apk'

Write-Host "Copying fresh APK to desktop..."
Copy-Item $src $desktop1 -Force
Copy-Item $src $desktop2 -Force

if (Test-Path 'c:\Users\Laven\Desktop') {
    Copy-Item $src 'c:\Users\Laven\Desktop\kshetra-release.apk' -Force -ErrorAction SilentlyContinue
    Copy-Item $src 'c:\Users\Laven\Desktop\kshetra.apk' -Force -ErrorAction SilentlyContinue
}

$apkInfo = Get-Item $desktop1
Write-Host "APK Location: $($apkInfo.FullName)"
Write-Host "APK Size: $([math]::Round($apkInfo.Length / 1MB, 2)) MB ($($apkInfo.Length) bytes)"
Write-Host "Built & Copied: $($apkInfo.LastWriteTime)"

# Verify Hermes bundle inside APK
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($desktop1)
$bundle = $zip.Entries | Where-Object { $_.Name -eq "index.android.bundle" }
if ($bundle) {
    Write-Host "Found embedded JS bundle in APK: $($bundle.FullName), Size: $([math]::Round($bundle.Length / 1MB, 2)) MB"
} else {
    Write-Warning "index.android.bundle not found inside APK"
}

# Verify launcher icons inside APK
$icons = $zip.Entries | Where-Object { $_.Name -match "ic_launcher" }
Write-Host "Launcher icon entries inside APK: $($icons.Count)"
$zip.Dispose()

Write-Host "SUCCESS: Fresh APK successfully generated and pasted on Desktop!"
