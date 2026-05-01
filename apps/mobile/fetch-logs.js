const { execSync } = require('child_process');
const https = require('https');

const json = JSON.parse(execSync('npx eas build:list --limit 1 --json --platform android --non-interactive 2>nul', { encoding: 'utf-8' }));
const logUrl = json[0].logFiles.slice(-1)[0];

https.get(logUrl, (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => {
    const lines = body.split('\n');
    const msgs = [];
    lines.forEach((line) => {
      const m = line.match(/"msg":"(.*)"/);
      if (m) msgs.push(m[1]);
    });
    let capture = false;
    let count = 0;
    msgs.forEach((msg) => {
      if (/FAILURE|What went wrong|Execution failed|BUILD FAILED/.test(msg)) {
        capture = true; count = 0;
      }
      if (capture) {
        console.log(msg);
        count++;
        if (count > 20) capture = false;
      }
    });
  });
}).on('error', console.error);
