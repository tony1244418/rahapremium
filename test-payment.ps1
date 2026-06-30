Write-Host "Testing RAHA Premium Payment System..." -ForegroundColor Green

Write-Host "`n1. Testing Payment Gateway Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
    Write-Host "✅ Payment Gateway: $($healthResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Payment Gateway: Not running" -ForegroundColor Red
}

Write-Host "`n2. Testing Next.js App..." -ForegroundColor Yellow
try {
    $appResponse = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing
    Write-Host "✅ Next.js App: $($appResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Next.js App: Not running" -ForegroundColor Red
}

Write-Host "`n3. Testing Payment Initiation..." -ForegroundColor Yellow
try {
    $paymentBody = @{
        packageType = "FEDHA"
        phoneNumber = "0788123456"
    } | ConvertTo-Json

    $paymentResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/payment/initiate" -Method POST -Body $paymentBody -ContentType "application/json" -UseBasicParsing
    $paymentData = $paymentResponse.Content | ConvertFrom-Json
    
    if ($paymentData.success) {
        Write-Host "✅ Payment Initiation: Success" -ForegroundColor Green
        Write-Host "   Order ID: $($paymentData.orderId)" -ForegroundColor Cyan
        Write-Host "   Message: $($paymentData.message)" -ForegroundColor Cyan
        
        Write-Host "`n4. Testing Payment Status Check..." -ForegroundColor Yellow
        try {
            $statusResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/payment/status?order_id=$($paymentData.orderId)" -UseBasicParsing
            $statusData = $statusResponse.Content | ConvertFrom-Json
            Write-Host "✅ Status Check: $($statusData.status)" -ForegroundColor Green
            Write-Host "   Payment Status: $($statusData.payment_status)" -ForegroundColor Cyan
        } catch {
            Write-Host "❌ Status Check: Failed" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Payment Initiation: Failed - $($paymentData.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Payment Initiation: Error - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Payment System Test Complete!" -ForegroundColor Green
Write-Host "`nTo test the full flow:" -ForegroundColor Yellow
Write-Host "1. Go to http://localhost:3001/subscriptions" -ForegroundColor Cyan
Write-Host "2. Enter a phone number (06XXXXXXXX or 07XXXXXXXX)" -ForegroundColor Cyan
Write-Host "3. Click on any subscription package" -ForegroundColor Cyan
Write-Host "4. Complete payment on your phone via USSD" -ForegroundColor Cyan
Write-Host "5. Watch the status automatically update!" -ForegroundColor Cyan
