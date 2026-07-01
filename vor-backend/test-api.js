import http from 'http';

const data = JSON.stringify({
  email: 'admin@vor.com',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    const loginData = JSON.parse(body);
    const token = loginData.data.token;
    console.log('Login successful, token:', token.substring(0, 20) + '...');
    
    // Test vehicles endpoint
    const vehicleOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/vehicles',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const vehicleReq = http.request(vehicleOptions, (vehicleRes) => {
      let vehicleBody = '';
      vehicleRes.on('data', (chunk) => {
        vehicleBody += chunk;
      });
      vehicleRes.on('end', () => {
        console.log('\n=== Vehicles Endpoint ===');
        console.log('Status:', vehicleRes.statusCode);
        console.log('Response:', vehicleBody);
        
        // Test actual status endpoint
        const today = new Date().toISOString().split('T')[0];
        const actualOptions = {
          hostname: 'localhost',
          port: 3000,
          path: `/api/actual-status/date?date=${today}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        const actualReq = http.request(actualOptions, (actualRes) => {
          let actualBody = '';
          actualRes.on('data', (chunk) => {
            actualBody += chunk;
          });
          actualRes.on('end', () => {
            console.log('\n=== Actual Status Endpoint ===');
            console.log('Status:', actualRes.statusCode);
            console.log('Response:', actualBody);
          });
        });

        actualReq.on('error', (error) => {
          console.error('Actual Status Error:', error.message);
        });

        actualReq.end();
      });
    });

    vehicleReq.on('error', (error) => {
      console.error('Vehicles Error:', error.message);
    });

    vehicleReq.end();
  });
});

req.on('error', (error) => {
  console.error('Login Error:', error.message);
});

req.write(data);
req.end();
