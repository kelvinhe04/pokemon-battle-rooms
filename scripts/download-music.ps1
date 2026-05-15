# Descarga la música de Pokémon para el juego usando yt-dlp
# Instalar yt-dlp: winget install yt-dlp  (o  pip install yt-dlp)
#
# USO:
#   .\scripts\download-music.ps1 -BattleUrl "URL_DE_YOUTUBE" -VictoryUrl "URL_DE_YOUTUBE"
#
# EJEMPLO (tema de batalla Gen 1 - busca en YouTube "Pokemon Red Blue Trainer Battle"):
#   .\scripts\download-music.ps1 -BattleUrl "https://www.youtube.com/watch?v=XXXXXX"

param(
    [string]$BattleUrl  = "",
    [string]$VictoryUrl = ""
)

$musicDir = Join-Path $PSScriptRoot "..\apps\frontend\public\music"

function Download-Track($url, $outputName) {
    if (-not $url) { Write-Host "  [SKIP] No se proporcionó URL para $outputName"; return }
    $outputPath = Join-Path $musicDir "$outputName"
    if (Test-Path $outputPath) { Write-Host "  [OK] $outputName ya existe"; return }

    $ytdlp = (Get-Command yt-dlp -ErrorAction SilentlyContinue)
    if (-not $ytdlp) {
        Write-Error "yt-dlp no encontrado. Instala con: winget install yt-dlp"
        return
    }
    Write-Host "  Descargando $outputName desde $url ..."
    & yt-dlp -x --audio-format mp3 --audio-quality 5 -o "$outputPath" $url
}

Write-Host "=== Pokemon Battle Rooms - Descarga de música ==="
Download-Track $BattleUrl  "battle.mp3"
Download-Track $VictoryUrl "victory.mp3"
Write-Host ""
Write-Host "Música en: $musicDir"
Write-Host ""
Write-Host "DESCARGA MANUAL: copia battle.mp3 y victory.mp3 en:"
Write-Host "  apps/frontend/public/music/"
