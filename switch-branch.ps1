param(
    [Parameter(Mandatory)]
    [string]$Branch
)

Write-Host "Cambiando a rama: $Branch" -ForegroundColor Cyan
git checkout $Branch

Write-Host "Reiniciando frontend..." -ForegroundColor Yellow
docker restart pokmonbattlerooms-frontend-1

Write-Host "Esperando que arranque..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

Write-Host "Listo. Abre: http://localhost:3000" -ForegroundColor Green
