import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';

function checkTCPD(name, gzFile, yr) {
  const text = zlib.gunzipSync(readFileSync('scripts/' + gzFile)).toString('utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const H = lines[0].split(',');
  const cnoIdx = H.indexOf('Constituency_No');
  const cnameIdx = H.indexOf('Constituency_Name');
  const distIdx = H.indexOf('District_Name');
  const typeIdx = H.indexOf('Constituency_Type');
  const yrIdx = H.indexOf('Year');

  const yLines = lines.slice(1).filter(l => l.split(',')[yrIdx] === String(yr));
  const set = new Set(yLines.map(l => +l.split(',')[cnoIdx]));
  console.log(name, yr, 'seats in TCPD:', set.size, 'min:', Math.min(...set), 'max:', Math.max(...set));
}

checkTCPD('Rajasthan', 'Rajasthan_AE.csv.gz', 2018);
checkTCPD('Madhya Pradesh', 'Madhya_Pradesh_AE.csv.gz', 2018);
checkTCPD('Chhattisgarh', 'Chhattisgarh_AE.csv.gz', 2018);
checkTCPD('Odisha', 'Odisha_AE.csv.gz', 2019);
checkTCPD('Assam', 'Assam_AE.csv.gz', 2021);
