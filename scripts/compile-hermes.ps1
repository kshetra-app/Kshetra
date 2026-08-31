$hermesc = 'C:\K\node_modules\react-native\sdks\hermesc\win64-bin\hermesc.exe'
$bundle = 'C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle'
$hbc = 'C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.hbc'
$raw = 'C:\K\apps\mobile\android\app\src\main\assets\index.android.bundle.raw'

Write-Host "Running hermesc compiler..."
& $hermesc -emit-binary -out $hbc $bundle

if (Test-Path $hbc) {
    Write-Host "Hermes compilation succeeded. Replacing raw bundle."
    Move-Item $bundle $raw -Force
    Move-Item $hbc $bundle -Force

    $bytes = [System.IO.File]::ReadAllBytes($bundle)[0..3]
    $magic = ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join '-'
    Write-Host "Hermes bundle magic header: $magic"
    $fileInfo = Get-Item $bundle
    Write-Host "Bytecode bundle size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
} else {
    Write-Error "Failed to generate Hermes bytecode file $hbc"
}
