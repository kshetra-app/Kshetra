import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const tlsDir = path.resolve('tests/fixtures/tls');
if (!fs.existsSync(tlsDir)) {
  fs.mkdirSync(tlsDir, { recursive: true });
}

const openssl = '"C:\\Program Files\\Git\\usr\\bin\\openssl.exe"';

const caKey = path.join(tlsDir, 'ca.key');
const caCrt = path.join(tlsDir, 'ca.crt');
const serverKey = path.join(tlsDir, 'server.key');
const serverCsr = path.join(tlsDir, 'server.csr');
const serverCrt = path.join(tlsDir, 'server.crt');
const extFile = path.join(tlsDir, 'extfile.cnf');

fs.writeFileSync(extFile, 'subjectAltName=DNS:valid.delimitation.gov.in\n', 'ascii');

// 1. Root CA
execSync(`${openssl} req -x509 -newkey rsa:2048 -nodes -keyout "${caKey}" -out "${caCrt}" -days 365 -subj "/CN=DelimitationTestRootCA"`, { stdio: 'pipe' });

// 2. Server CSR
execSync(`${openssl} req -newkey rsa:2048 -nodes -keyout "${serverKey}" -out "${serverCsr}" -subj "/CN=valid.delimitation.gov.in"`, { stdio: 'pipe' });

// 3. Sign
execSync(`${openssl} x509 -req -in "${serverCsr}" -CA "${caCrt}" -CAkey "${caKey}" -CAcreateserial -out "${serverCrt}" -days 365 -extfile "${extFile}"`, { stdio: 'pipe' });

console.log('TLS fixtures successfully generated in', tlsDir);
