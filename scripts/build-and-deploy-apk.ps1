$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "  KSHETRA FULL FRESH RELEASE APK BUILD"
Write-Host "=========================================="

# 1. Thorough Cache Cleaning
Write-Host "`n[1/6] Thoroughly clearing all Metro, Expo, and Android caches..."
$metroPaths = @(
    "C:\K\apps\mobile\.expo",
    "C:\K\apps\mobile\.metro",
    "C:\K\node_modules\.cache",
    "$env:LOCALAPPDATA\Temp\metro-*",
    "$env:LOCALAPPDATA\Temp\haste-map-*"
)
foreach ($p in $metroPaths) {
    if (Test-Path $p) {
        Write-Host "Removing: $p"
        Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
    }
}

# Remove old bundle and old build outputs
if (Test-Path "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle*") {
    Remove-Item -Force "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle*"
}
if (Test-Path "C:\K\apps\mobile\android\app\build\outputs\apk") {
    cmd /c "rd /s /q C:\K\apps\mobile\android\app\build\outputs\apk"
}

# 2. Prebuild Shared Package
Write-Host "`n[2/6] Building @kshetra/shared..."
Set-Location "C:\K\packages\shared"
npm run build

# 3. Export Fresh JavaScript Bundle via Metro with --reset-cache
Write-Host "`n[3/6] Exporting fresh JS bundle with Metro (--reset-cache)..."
Set-Location "C:\K\apps\mobile"
npx expo export:embed --platform android --dev false --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/ --reset-cache

if (-not (Test-Path "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle")) {
    throw "Metro failed to generate android/app/src/main/assets/index.android.bundle"
}
$rawSize = (Get-Item "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle").Length
Write-Host "Fresh raw JS bundle size: $([math]::Round($rawSize / 1MB, 2)) MB"

# 4. Compile JS bundle to Hermes Bytecode
Write-Host "`n[4/6] Compiling JS bundle with hermesc.exe..."
$hermesc = "C:\K\node_modules\react-native\sdks\hermesc\win64-bin\hermesc.exe"
$bundle = "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle"
$hbc = "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.hbc"
$raw = "C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.raw"

& $hermesc -emit-binary -out $hbc $bundle

if (-not (Test-Path $hbc)) {
    throw "hermesc failed to compile bytecode file $hbc"
}
Move-Item $bundle $raw -Force
Move-Item $hbc $bundle -Force

# Verify Hermes magic header (C6-1F-BC-03)
$bytes = [System.IO.File]::ReadAllBytes($bundle)[0..3]
$magic = ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join '-'
Write-Host "Hermes Bytecode Magic: $magic"
if ($magic -ne "C6-1F-BC-03") {
    throw "Invalid Hermes magic bytes: $magic (expected C6-1F-BC-03)"
}
$hbcSize = (Get-Item $bundle).Length
Write-Host "Hermes Bytecode size: $([math]::Round($hbcSize / 1MB, 2)) MB (bytecode verified)"

# 5. Build Release APK with Gradle
Write-Host "`n[5/6] Building release APK with Gradle..."
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
Set-Location "C:\K\apps\mobile\android"
cmd /c "gradlew.bat assembleRelease --no-daemon"
if ($LASTEXITCODE -ne 0) {
    throw "gradlew.bat assembleRelease failed with exit code $LASTEXITCODE"
}

# 6. Deploy to Desktop and verify
Write-Host "`n[6/6] Deploying fresh APK to Desktop..."
$apkSrc = "C:\K\apps\mobile\android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $apkSrc)) {
    throw "APK output file not found at $apkSrc"
}

$destinations = @(
    "c:\Users\Laven\OneDrive\Desktop\kshetra-release.apk",
    "c:\Users\Laven\OneDrive\Desktop\kshetra.apk",
    "c:\Users\Laven\Desktop\kshetra-release.apk",
    "c:\Users\Laven\Desktop\kshetra.apk"
)

foreach ($dest in $destinations) {
    $dir = Split-Path $dest
    if (Test-Path $dir) {
        Copy-Item $apkSrc $dest -Force
        Write-Host "Copied to: $dest"
    }
}

# Verification
$finalApk = Get-Item "c:\Users\Laven\OneDrive\Desktop\kshetra-release.apk"
Write-Host "`n=========================================="
Write-Host "  BUILD AND DEPLOY SUCCESSFUL!"
Write-Host "=========================================="
Write-Host "APK Location: $($finalApk.FullName)"
Write-Host "APK Size: $([math]::Round($finalApk.Length / 1MB, 2)) MB ($($finalApk.Length) bytes)"
Write-Host "Last Modified: $($finalApk.LastWriteTime)"

# Verify embedded bundle
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($finalApk.FullName)
$entry = $zip.Entries | Where-Object { $_.Name -eq "index.android.bundle" }
if ($entry) {
    Write-Host "Verified inside APK: $($entry.FullName) ($([math]::Round($entry.Length / 1MB, 2)) MB)"
} else {
    Write-Warning "index.android.bundle missing inside APK!"
}
$zip.Dispose()
