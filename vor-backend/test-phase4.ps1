# Phase 4 Test Script - Dashboard, Reporting & Export Endpoints
# Usage: powershell -ExecutionPolicy Bypass -File test-phase4.ps1

param(
    [string]$BaseUrl = "http://localhost:3000/api"
)

$results = @()
$testCount = 0
$passCount = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    $testCount++
    $uri = "$BaseUrl$Endpoint"
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $uri -Method GET -Headers $Headers
        } else {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -Headers $Headers -Body (ConvertTo-Json $Body) -ContentType "application/json"
        }
        
        $content = $response.Content | ConvertFrom-Json
        $passCount++
        $results += "[OK] $Name - Status: $($response.StatusCode)"
        return $content
    } catch {
        $results += "[FAIL] $Name - Error: $($_.Exception.Message)"
        return $null
    }
}

# Colors for output
$successColor = 'Green'
$failColor = 'Red'

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VOR Backend - Phase 4 Test Suite" -ForegroundColor Cyan
Write-Host "Dashboard, Reporting & Export Endpoints" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Login to get token
Write-Host "Step 1: Authentication" -ForegroundColor Yellow
$loginBody = @{
    email = "admin@vor.com"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Attempting login with: $loginBody" -ForegroundColor Gray

$loginResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$loginResult = $loginResponse.Content | ConvertFrom-Json

if ($loginResult -and $loginResult.data.token) {
    $token = $loginResult.data.token
    Write-Host "✓ Got auth token: $($token.Substring(0, 20))..." -ForegroundColor Green
} else {
    Write-Host "✗ Failed to get auth token. Response: $loginResponse.Content" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Test Dashboard Endpoints
Write-Host "`nStep 2: Dashboard Endpoints" -ForegroundColor Yellow

Test-Endpoint -Name "Get fleet overview (today)" -Method "GET" -Endpoint "/dashboard/fleet-overview" -Headers $headers
Test-Endpoint -Name "Get fleet overview (custom date)" -Method "GET" -Endpoint "/dashboard/fleet-overview?date=2026-06-04" -Headers $headers

$startDate = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
$endDate = (Get-Date).ToString("yyyy-MM-dd")

$url1 = "/dashboard/revenue?startDate=$startDate`&endDate=$endDate"
Test-Endpoint -Name "Get revenue dashboard" -Method "GET" -Endpoint $url1 -Headers $headers

$url2 = "/dashboard/kpi?startDate=$startDate`&endDate=$endDate"
Test-Endpoint -Name "Get KPI dashboard" -Method "GET" -Endpoint $url2 -Headers $headers

$url3 = "/dashboard/forecast-accuracy?startDate=$startDate`&endDate=$endDate"
Test-Endpoint -Name "Get forecast accuracy dashboard" -Method "GET" -Endpoint $url3 -Headers $headers

$url4 = "/dashboard/operational-metrics?startDate=$startDate`&endDate=$endDate"
Test-Endpoint -Name "Get operational metrics" -Method "GET" -Endpoint $url4 -Headers $headers

# Step 3: Test Reporting Endpoints
Write-Host "`nStep 3: Reporting Endpoints" -ForegroundColor Yellow

$url5 = "/reports/vehicle-performance?startDate=$startDate`&endDate=$endDate`&sortBy=profit"
Test-Endpoint -Name "Get vehicle performance - sorted by profit" -Method "GET" -Endpoint $url5 -Headers $headers

$url6 = "/reports/vehicle-performance?startDate=$startDate`&endDate=$endDate`&sortBy=kpa"
Test-Endpoint -Name "Get vehicle performance - sorted by KPA" -Method "GET" -Endpoint $url6 -Headers $headers

$url7 = "/reports/revenue-analysis?startDate=$startDate`&endDate=$endDate`&groupBy=day"
Test-Endpoint -Name "Get revenue analysis - group by day" -Method "GET" -Endpoint $url7 -Headers $headers

$url8 = "/reports/revenue-analysis?startDate=$startDate`&endDate=$endDate`&groupBy=week"
Test-Endpoint -Name "Get revenue analysis - group by week" -Method "GET" -Endpoint $url8 -Headers $headers

$url9 = "/reports/kpi-trend?startDate=$startDate`&endDate=$endDate"
Test-Endpoint -Name "Get KPI trend report" -Method "GET" -Endpoint $url9 -Headers $headers

$url10 = "/reports/compliance?startDate=$startDate`&endDate=$endDate"
Test-Endpoint -Name "Get compliance report" -Method "GET" -Endpoint $url10 -Headers $headers

# Step 4: Test Export Endpoints
Write-Host "`nStep 4: Export Endpoints - CSV and HTML" -ForegroundColor Yellow

$url11 = "/export/revenue?startDate=$startDate`&endDate=$endDate`&format=csv"
Test-Endpoint -Name "Export revenue report - CSV format" -Method "GET" -Endpoint $url11 -Headers $headers

$url12 = "/export/revenue?startDate=$startDate`&endDate=$endDate`&format=html"
Test-Endpoint -Name "Export revenue report - HTML format" -Method "GET" -Endpoint $url12 -Headers $headers

$url13 = "/export/kpi?startDate=$startDate`&endDate=$endDate`&format=csv"
Test-Endpoint -Name "Export KPI report - CSV format" -Method "GET" -Endpoint $url13 -Headers $headers

$url14 = "/export/kpi?startDate=$startDate`&endDate=$endDate`&format=html"
Test-Endpoint -Name "Export KPI report - HTML format" -Method "GET" -Endpoint $url14 -Headers $headers

$url15 = "/export/vehicle-performance?startDate=$startDate`&endDate=$endDate`&format=csv"
Test-Endpoint -Name "Export vehicle performance - CSV format" -Method "GET" -Endpoint $url15 -Headers $headers

$url16 = "/export/vehicle-performance?startDate=$startDate`&endDate=$endDate`&format=html"
Test-Endpoint -Name "Export vehicle performance - HTML format" -Method "GET" -Endpoint $url16 -Headers $headers

$url17 = "/export/forecast-accuracy?startDate=$startDate`&endDate=$endDate`&format=csv"
Test-Endpoint -Name "Export forecast accuracy - CSV format" -Method "GET" -Endpoint $url17 -Headers $headers

$url18 = "/export/forecast-accuracy?startDate=$startDate`&endDate=$endDate`&format=html"
Test-Endpoint -Name "Export forecast accuracy - HTML format" -Method "GET" -Endpoint $url18 -Headers $headers

# Display results
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

foreach ($result in $results) {
    if ($result -like "[OK]*") {
        Write-Host $result -ForegroundColor Green
    } else {
        Write-Host $result -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Total: $testCount | Passed: $passCount | Failed: $($testCount - $passCount)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($passCount -eq $testCount) {
    Write-Host "✓ All Phase 4 tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Some tests failed. Check output above." -ForegroundColor Red
    exit 1
}
