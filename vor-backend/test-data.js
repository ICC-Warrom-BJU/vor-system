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
    
    // Test actual status
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
        console.log('Actual Status Response:', actualBody);
        
        // Test forecast status
        const forecastOptions = {
          hostname: 'localhost',
          port: 3000,
          path: `/api/forecast-status/date?date=${today}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        const forecastReq = http.request(forecastOptions, (forecastRes) => {
          let forecastBody = '';
          forecastRes.on('data', (chunk) => {
            forecastBody += chunk;
          });
          forecastRes.on('end', () => {
            console.log('Forecast Status Response:', forecastBody);
            
            // Test revenue data
            const revenueOptions = {
              hostname: 'localhost',
              port: 3000,
              path: `/api/revenue-data/date?date=${today}`,
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
                console.log('Revenue Data Response:', revenueBody);
              });
            });

            revenueReq.on('error', (error) => {
              console.error('Error:', error.message);
            });

            revenueReq.end();
          });
        });

        forecastReq.on('error', (error) => {
          console.error('Error:', error.message);
        });

        forecastReq.end();
      });
    });

    actualReq.on('error', (error) => {
      console.error('Error:', error.message);
    });

    actualReq.end();
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
