const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG = {
  region: 'cn-east-3',
  deviceId: '6a213cd018855b39c520d0e5_d001',
  deviceSecret: '12c4255a04ced6767c87da6effae681a46d409914b80cf03162546116b7d91a8'
};

function getToken() {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const body = JSON.stringify({
      auth: {
        identity: { methods: ['device_sae'], device_sae: { device_id: CONFIG.deviceId, secret: CONFIG.deviceSecret } },
        scope: { project: { name: CONFIG.region } }
      }
    });

    const options = {
      hostname: `iam.${CONFIG.region}.myhuaweicloud.com`,
      path: '/v3/auth/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const token = res.headers['x-subject-token'];
        if (token) resolve(token);
        else reject(new Error('获取token失败'));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getDeviceShadow(token) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const options = {
      hostname: `iotda.${CONFIG.region}.myhuaweicloud.com`,
      path: `/v5/iot/${CONFIG.deviceId}/device-shadow`,
      method: 'GET',
      headers: { 'X-Auth-Token': token }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

app.get('/api/device', async (req, res) => {
  try {
    const token = await getToken();
    const data = await getDeviceShadow(token);
    const shadow = data.shadow?.[0];
    res.json({
      code: '0',
      data: {
        online: shadow?.device_info?.online || false,
        lastUpdate: shadow?.device_info?.last_updated_time,
        properties: shadow?.reported?.properties || {}
      }
    });
  } catch (error) {
    res.status(500).json({ code: '1', message: error.message });
  }
});

app.post('/api/light', (req, res) => {
  res.json({ code: '0', message: '命令已发送' });
});

app.get('/api/map/static', (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).send('Missing lat/lon');
  const amapKey = '249c3be3e76324b0a0a3a9a05993ac1f';
  res.redirect(`https://restapi.amap.com/v3/staticmap?location=${lon},${lat}&zoom=16&size=600*350&markers=mid,,A:${lon},${lat}&key=${amapKey}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
