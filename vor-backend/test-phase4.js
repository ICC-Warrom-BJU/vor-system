import http from 'http';

const BASE_URL = 'localhost';
const PORT = 3000;

let token = '';
let results = [];
let testCount = 0;
let passCount = 0;

function makeRequest(path, method, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(data && { 'Content-Length': Buffer.byteLength(data) })
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          resolve({ statusCode: res.statusCode, data: json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testEndpoint(name, path, method, body = null, headers = {}) {
  testCount++;
  try {
    const response = await makeRequest(path, method, body, headers);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      passCount++;
      results.push(`[OK] ${name} - Status: ${response.statusCode}`);
      console.log(`✓ ${name}`);
      return response.data;
    } else {
      results.push(`[FAIL] ${name} - Status: ${response.statusCode}`);
      console.log(`✗ ${name} - Status: ${response.statusCode}`);
      return null;
    }
  } catch (error) {
    results.push(`[FAIL] ${name} - Error: ${error.message}`);
    console.log(`✗ ${name} - Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('\n========================================');
  console.log('VOR Backend - Phase 4 Test Suite');
  console.log('Dashboard, Reporting & Export Endpoints');
  console.log('========================================\n');

  // Step 1: Login
  console.log('Step 1: Authentication');
  const loginResult = await testEndpoint('Login with admin account', '/auth/login', 'POST', {
    email: 'admin@vor.com',
    password: 'admin123'
  });

  if (loginResult && loginResult.data && loginResult.data.token) {
    token = loginResult.data.token;
    console.log(`✓ Got auth token: ${token.substring(0, 20)}...\n`);
  } else {
    console.log('✗ Failed to get auth token. Exiting...\n');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${token}`
  };

  // Step 2: Dashboard Endpoints
  console.log('Step 2: Dashboard Endpoints');
  await testEndpoint('Get fleet overview (today)', '/dashboard/fleet-overview', 'GET', null, headers);
  await testEndpoint('Get fleet overview (custom date)', '/dashboard/fleet-overview?date=2026-06-04', 'GET', null, headers);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  await testEndpoint('Get revenue dashboard', `/dashboard/revenue?startDate=${startDateStr}&endDate=${endDateStr}`, 'GET', null, headers);
  await testEndpoint('Get KPI dashboard', `/dashboard/kpi?startDate=${startDateStr}&endDate=${endDateStr}`, 'GET', null, headers);
  await testEndpoint('Get forecast accuracy dashboard', `/dashboard/forecast-accuracy?startDate=${startDateStr}&endDate=${endDateStr}`, 'GET', null, headers);
  await testEndpoint('Get operational metrics', `/dashboard/operational-metrics?startDate=${startDateStr}&endDate=${endDateStr}`, 'GET', null, headers);

  // Step 3: Reporting Endpoints
  console.log('\nStep 3: Reporting Endpoints');
  await testEndpoint('Get vehicle performance - sorted by profit', `/reports/vehicle-performance?startDate=${startDateStr}&endDate=${endDateStr}&sortBy=profit`, 'GET', null, headers);
  await testEndpoint('Get vehicle performance - sorted by KPA', `/reports/vehicle-performance?startDate=${startDateStr}&endDate=${endDateStr}&sortBy=kpa`, 'GET', null, headers);
  await testEndpoint('Get revenue analysis - group by day', `/reports/revenue-analysis?startDate=${startDateStr}&endDate=${endDateStr}&groupBy=day`, 'GET', null, headers);
  await testEndpoint('Get revenue analysis - group by week', `/reports/revenue-analysis?startDate=${startDateStr}&endDate=${endDateStr}&groupBy=week`, 'GET', null, headers);
  await testEndpoint('Get KPI trend report', `/reports/kpi-trend?startDate=${startDateStr}&endDate=${endDateStr}`, 'GET', null, headers);
  await testEndpoint('Get compliance report', `/reports/compliance?startDate=${startDateStr}&endDate=${endDateStr}`, 'GET', null, headers);

  // Step 4: Export Endpoints
  console.log('\nStep 4: Export Endpoints - CSV and HTML');
  await testEndpoint('Export revenue report - CSV format', `/export/revenue?startDate=${startDateStr}&endDate=${endDateStr}&format=csv`, 'GET', null, headers);
  await testEndpoint('Export revenue report - HTML format', `/export/revenue?startDate=${startDateStr}&endDate=${endDateStr}&format=html`, 'GET', null, headers);
  await testEndpoint('Export KPI report - CSV format', `/export/kpi?startDate=${startDateStr}&endDate=${endDateStr}&format=csv`, 'GET', null, headers);
  await testEndpoint('Export KPI report - HTML format', `/export/kpi?startDate=${startDateStr}&endDate=${endDateStr}&format=html`, 'GET', null, headers);
  await testEndpoint('Export vehicle performance - CSV format', `/export/vehicle-performance?startDate=${startDateStr}&endDate=${endDateStr}&format=csv`, 'GET', null, headers);
  await testEndpoint('Export vehicle performance - HTML format', `/export/vehicle-performance?startDate=${startDateStr}&endDate=${endDateStr}&format=html`, 'GET', null, headers);
  await testEndpoint('Export forecast accuracy - CSV format', `/export/forecast-accuracy?startDate=${startDateStr}&endDate=${endDateStr}&format=csv`, 'GET', null, headers);
  await testEndpoint('Export forecast accuracy - HTML format', `/export/forecast-accuracy?startDate=${startDateStr}&endDate=${endDateStr}&format=html`, 'GET', null, headers);

  // Display results
  console.log('\n========================================');
  console.log('Test Results Summary');
  console.log('========================================\n');

  results.forEach(result => {
    if (result.startsWith('[OK]')) {
      console.log(`\x1b[32m${result}\x1b[0m`);
    } else {
      console.log(`\x1b[31m${result}\x1b[0m`);
    }
  });

  console.log('\n========================================');
  console.log(`Total: ${testCount} | Passed: ${passCount} | Failed: ${testCount - passCount}`);
  console.log('========================================\n');

  if (passCount === testCount) {
    console.log('✓ All Phase 4 tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed. Check output above.');
    process.exit(1);
  }
}

main().catch(console.error);
