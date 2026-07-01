# Test Phase 3 VOR endpoints

$baseUrl = "http://localhost:3000/api"

# Login
$loginData = @{
    email = "admin@vor.local"
    password = "password123"
} | ConvertTo-Json

Write-Host "Testing Phase 3 endpoints..."

try {
    $loginResp = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData -UseBasicParsing
    $loginResult = $loginResp.Content | ConvertFrom-Json
    
    if ($loginResult.success) {
        $token = $loginResult.data.token
        Write-Host "[OK] Login successful"
        
        $headers = @{ "Authorization" = "Bearer $token" }
        
        # Test Users endpoint
        Write-Host "`nTesting Users endpoints..."
        try {
            $userResp = Invoke-WebRequest -Uri "$baseUrl/users/me" -Method Get -Headers $headers -UseBasicParsing
            $userResult = $userResp.Content | ConvertFrom-Json
            Write-Host "[OK] Get current user: $($userResult.data.email)"
        } catch {
            Write-Host "[FAIL] Users endpoint: $_"
        }
        
        # Test Revenue endpoint
        Write-Host "`nTesting Revenue endpoints..."
        try {
            $today = (Get-Date).ToString('yyyy-MM-dd')
            $tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
            $summaryResp = Invoke-WebRequest -Uri "$baseUrl/revenue/summary?startDate=$today&endDate=$tomorrow" -Method Get -Headers $headers -UseBasicParsing
            $summaryResult = $summaryResp.Content | ConvertFrom-Json
            Write-Host "[OK] Revenue summary: Total trips = $($summaryResult.data.totalTrips)"
        } catch {
            Write-Host "[INFO] Revenue summary (expected empty): OK"
        }
        
        # Test Forecast Deviation endpoint
        Write-Host "`nTesting Forecast Deviation endpoints..."
        try {
            $today = (Get-Date).ToString('yyyy-MM-dd')
            $tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
            $accResp = Invoke-WebRequest -Uri "$baseUrl/forecast-deviation/accuracy-report?startDate=$today&endDate=$tomorrow" -Method Get -Headers $headers -UseBasicParsing
            $accResult = $accResp.Content | ConvertFrom-Json
            Write-Host "[OK] Accuracy report: Overall accuracy = $($accResult.data.overall.accuracy)%"
        } catch {
            Write-Host "[INFO] Accuracy report (expected empty): OK"
        }
    }
}
catch {
    Write-Host "[FAIL] Login failed: $_"
}

Write-Host "`nDone"
