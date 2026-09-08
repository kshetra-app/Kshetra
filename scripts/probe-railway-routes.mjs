import https from 'https';

const routes = [
  '/',
  '/health',
  '/api/health',
  '/api/v1/states',
  '/api/v1/states/TS',
  '/api/v1/states/TS/constituencies',
  '/api/v1/config/flags',
  '/api/v1/news/feed',
  '/api/v1/moderation/actions',
  '/api/v1/moderation/queue',
  '/api/v1/campaign/pricing',
  '/api/v1/pages/demo/entitlement',
  '/api/v1/dm/threads',
  '/api/v1/ads/catalog'
];

async function check(p) {
  return new Promise((resolve) => {
    https.get('https://kshetra-api-production-9f06.up.railway.app' + p, (r) => {
      let data = '';
      r.on('data', chunk => data += chunk);
      r.on('end', () => resolve({ path: p, status: r.statusCode, snippet: data.slice(0, 100) }));
    }).on('error', (e) => resolve({ path: p, error: e.message }));
  });
}

for (const r of routes) {
  const res = await check(r);
  console.log(`${res.path.padEnd(35)} -> Status: ${res.status}`);
}
