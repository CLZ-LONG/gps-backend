const https = require('https');

const CONFIG = {
  region: 'cn-east-3',
  deviceId: '6a213cd018855b39c520d0e5_d001',
  deviceSecret: '12c4255a04ced6767c87da6effae681a46d409914b80cf03162546116b7d91a8'
};

function getToken() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      auth: {
        identity: { method: 'device_sae' },
        credentials: {
          device_sae: {
            device_id: CONFIG.deviceId,
            secret: CONFIG.deviceSecret
          }
        }
      }
    });

    const options = {
      hostname: 'iam.cn-east-3.myhuaweicloud.com',
      path: '/v3/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const token = res.headers['x-subject-token'];
        resolve(token);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getDeviceShadow(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `iotda.${CONFIG.region}.myhuaweicloud.com`,
      path: `/v5/iot/${CONFIG.deviceId}/device-shadow`,
      method: 'GET',
      headers: {
        'X-Auth-Token': token
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const server = https.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/device') {
    try {
      const token = await getToken();
      const data = await getDeviceShadow(token);
      
      const shadow = data.shadow?.[0];
      const result = {
        code: '0',
        data: {
          online: shadow?.device_info?.online || false,
          lastUpdate: shadow?.device_info?.last_updated_time,
          properties: shadow?.reported?.properties || {}
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: '1', message: error.message }));
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
