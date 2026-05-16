$ErrorActionPreference = "Stop"
$whisperDir = "$PSScriptRoot\whisper-server"

Write-Host "Creating whisper-server directory..."
if (-not (Test-Path $whisperDir)) {
    New-Item -ItemType Directory -Force -Path $whisperDir | Out-Null
}

Write-Host "Downloading whisper.cpp server (v1.6.2 for Windows x64)..."
$zipPath = "$whisperDir\whisper.zip"
Invoke-WebRequest -Uri "https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.4/whisper-bin-x64.zip" -OutFile $zipPath

Write-Host "Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $whisperDir -Force
Remove-Item $zipPath

Write-Host "Downloading ggml-base.en.bin model (approx 140MB)..."
$modelPath = "$whisperDir\ggml-base.en.bin"
Invoke-WebRequest -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" -OutFile $modelPath

Write-Host "`nSetup complete! You can start the server by running:"
Write-Host "cd whisper-server"
Write-Host ".\server.exe -m ggml-base.en.bin --port 8080"
