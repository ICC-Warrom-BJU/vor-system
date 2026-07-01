# Test VOR Backend Endpoints

$baseUrl = "http://localhost:3000/api"

# Test Health
Write-Host "Testing Health Endpoint..."
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method Get -UseBasicParsing
    Write-Host "[OK] Health working"
} catch {
    Write-Host "[FAIL] Health failed: $_"
}

# Test Register
Write-Host "`nTesting Register Endpoint..."
$token = $null
try {
    $registerData = @{
        name = "Admin Test"
        email = "admin@vor.local"
        password = "password123"
        role = "ADMIN"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/register" -Method Post -ContentType "application/json" -Body $registerData -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "[OK] Register Success - User ID: $($result.data.id)"
    }
    else {
        Write-Host "[FAIL] Register failed: $($result.message)"
    }
}
catch {
    Write-Host "[FAIL] Register error: $_"
}

# Test Login
Write-Host "`nTesting Login Endpoint..."
try {
    $loginData = @{
        email = "admin@vor.local"
        password = "password123"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginData -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "[OK] Login Success - Email: $($result.data.user.email)"
        $token = $result.data.token
    }
    else {
        Write-Host "[FAIL] Login failed: $($result.message)"
    }
}
catch {
    Write-Host "[FAIL] Login error: $_"
}

# Test Get Master Status
if ($token) {
    Write-Host "`nTesting Get Master Status..."
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        
        $response = Invoke-WebRequest -Uri "$baseUrl/master-status" -Method Get -Headers $headers -UseBasicParsing
        $result = $response.Content | ConvertFrom-Json
        Write-Host "[OK] Master Status - Retrieved $($result.data.Count) statuses"
    } catch {
        Write-Host "[FAIL] Master Status error: $_"
    }
}

Write-Host "`nDone"
