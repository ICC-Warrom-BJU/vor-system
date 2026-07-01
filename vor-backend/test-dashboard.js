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
    
    // Test fleet overview
    const fleetOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/dashboard/fleet-overview',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const fleetReq = http.request(fleetOptions, (fleetRes) => {
      let fleetBody = '';
      fleetRes.on('data', (chunk) => {
        fleetBody += chunk;
      });
      fleetRes.on('end', () => {
        console.log('Fleet Overview Response:', fleetBody);
        
        // Test revenue dashboard
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();
        
        const revenueOptions = {
          hostname: 'localhost',
          port: 3000,
          path: `/api/dashboard/revenue?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        const revenueReq = http.request(revenueOptions, (revenueRes) => {
          let revenueBody = '';
          revenueRes.on('data', (chunk) => {
            revenueBody += chunk;
          });
          revenueRes.on('end', () => {
            console.log('Revenue Dashboard Response:', revenueBody);
          });
        });

        revenueReq.on('error', (error) => {
          console.error('Error:', error.message);
        });

        revenueReq.end();
      });
    });

    fleetReq.on('error', (error) => {
      console.error('Error:', error.message);
    });

    fleetReq.end();
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
