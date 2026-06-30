Write-Host "Starting RAHA Premium Development Server..." -ForegroundColor Green

Write-Host "`nStarting Next.js Development Server with integrated Payment Gateway..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\raha'; npm run dev"

Write-Host "`nServer is starting..." -ForegroundColor Green
Write-Host "Main App: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Gateway Page: http://localhost:3001/gateway" -ForegroundColor Cyan
Write-Host "Health Check: http://localhost:3001/api/health" -ForegroundColor Cyan
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
