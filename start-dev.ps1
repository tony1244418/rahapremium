Write-Host "Starting RAHA Premium Development Servers..." -ForegroundColor Green

Write-Host "`nStarting PHP Gateway Server on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\mrtonytz\Desktop\rahapremium\rahapremium-main\GATEWAY'; php -S localhost:8000"

Write-Host "`nStarting Next.js Development Server on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\mrtonytz\Desktop\rahapremium\rahapremium-main'; npm run dev"

Write-Host "`nBoth servers are starting..." -ForegroundColor Green
Write-Host "PHP Gateway: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Next.js App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
