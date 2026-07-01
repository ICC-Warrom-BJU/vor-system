# Test new VOR endpoints

$baseUrl = "http://localhost:3000/api"

# Login
$loginData = @{
    email = "admin@vor.local"
    password = "password123"
} | ConvertTo-Json

Write-Host "Testing new VOR endpoints..."

try {
    $loginResp = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData -UseBasicParsing
    $loginResult = $loginResp.Content | ConvertFrom-Json
    
    if ($loginResult.success) {
        $token = $loginResult.data.token
        Write-Host "[OK] Login successful"
        
        $headers = @{ "Authorization" = "Bearer $token" }
        
        # Test KPI endpoint
        Write-Host "`nTesting KPI endpoints..."
        $today = (Get-Date).ToString('yyyy-MM-dd')
        
        try {
            $kpiResp = Invoke-WebRequest -Uri "$baseUrl/kpi/daily?date=$today" -Method Get -Headers $headers -UseBasicParsing
            $kpiResult = $kpiResp.Content | ConvertFrom-Json
            Write-Host "[OK] Daily KPI endpoint: $($kpiResult.message)"
        } catch {
            Write-Host "[FAIL] KPI endpoint: $_"
        }
        
        # Test Master Status
        Write-Host "`nTesting Master Status endpoints..."
        try {
            $msResp = Invoke-WebRequest -Uri "$baseUrl/master-status" -Method Get -Headers $headers -UseBasicParsing
            $msResult = $msResp.Content | ConvertFrom-Json
            Write-Host "[OK] Master Status GET: Retrieved $($msResult.data.Count) records"
        } catch {
            Write-Host "[FAIL] Master Status: $_"
        }
    }
}
catch {
    Write-Host "[FAIL] Login failed: $_"
}

Write-Host "`nDone"
