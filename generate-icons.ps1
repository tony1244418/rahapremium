# PWA Icon Generator PowerShell Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PWA Icon Generator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not found in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js or add it to your PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Checking for Sharp package..." -ForegroundColor Yellow

# Check if Sharp is installed
$sharpInstalled = npm list sharp 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Sharp package not found. Installing Sharp..." -ForegroundColor Yellow
    npm install sharp
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Failed to install Sharp" -ForegroundColor Red
        Write-Host "Please run manually: npm install sharp" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

Write-Host ""
Write-Host "Generating icons..." -ForegroundColor Yellow
Write-Host "Source: GATEWAY\logo.png" -ForegroundColor Gray
Write-Host "Output: public\" -ForegroundColor Gray
Write-Host ""

# Run the icon generator
node scripts/generate-icons.js GATEWAY/logo.png public

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Icons generated successfully." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Check the public folder for generated icons." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: Icon generation failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"








