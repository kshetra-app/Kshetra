/**
 * tests/fixtures/network-denial-preload.cjs
 *
 * Process-Wide Network Denial Preload Harness
 * Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 * CTO Directive 142 Section 3.3 / CTO Directive 145 Workstream D Item 11
 *
 * Traps outgoing network calls across all relevant Node.js network primitives:
 *  1. net.Socket.prototype.connect, net.connect, net.createConnection
 *  2. tls.connect
 *  3. http.request, http.get
 *  4. https.request, https.get
 *  5. http2.connect
 *  6. dgram.createSocket, dgram.Socket.prototype.send, dgram.Socket.prototype.bind
 *  7. dns.lookup, dns.resolve, dns.resolve4, dns.resolve6, and dns.promises.*
 *  8. globalThis.fetch
 *  9. globalThis.WebSocket (Node 21+)
 *
 * Any attempted outgoing connection immediately throws PROCESS_NETWORK_DENIED.
 */

const net = require('node:net');
const tls = require('node:tls');
const http = require('node:http');
const https = require('node:https');
let http2;
try {
  http2 = require('node:http2');
} catch (e) {
  // http2 may be unavailable in some restricted environments
}
const dgram = require('node:dgram');
const dns = require('node:dns');

let networkAttempts = 0;
const trappedPrimitives = [
  'net.Socket.prototype.connect',
  'net.connect',
  'net.createConnection',
  'tls.connect',
  'http.request',
  'http.get',
  'https.request',
  'https.get',
  'http2.connect',
  'dgram.createSocket',
  'dgram.Socket.prototype.send',
  'dns.lookup',
  'dns.resolve',
  'dns.resolve4',
  'dns.resolve6',
  'dns.promises.lookup',
  'dns.promises.resolve',
  'globalThis.fetch',
  'globalThis.WebSocket'
];

function deny(primitive) {
  networkAttempts++;
  const err = new Error(`PROCESS_NETWORK_DENIED: Attempted outgoing network access via ${primitive}`);
  err.code = 'PROCESS_NETWORK_DENIED';
  err.primitive = primitive;
  throw err;
}

// ─── 1. NET SOCKETS ──────────────────────────────────────────────────────────
net.Socket.prototype.connect = function(...args) {
  deny('net.Socket.prototype.connect');
  return this;
};
net.connect = function(...args) {
  deny('net.connect');
  return new net.Socket();
};
net.createConnection = function(...args) {
  deny('net.createConnection');
  return new net.Socket();
};

// ─── 2. TLS ──────────────────────────────────────────────────────────────────
tls.connect = function(...args) {
  deny('tls.connect');
};

// ─── 3. HTTP / HTTPS ─────────────────────────────────────────────────────────
http.request = function(...args) {
  deny('http.request');
};
http.get = function(...args) {
  deny('http.get');
};
https.request = function(...args) {
  deny('https.request');
};
https.get = function(...args) {
  deny('https.get');
};

// ─── 4. HTTP/2 ───────────────────────────────────────────────────────────────
if (http2 && typeof http2.connect === 'function') {
  http2.connect = function(...args) {
    deny('http2.connect');
  };
}

// ─── 5. DGRAM (UDP) ──────────────────────────────────────────────────────────
const originalCreateSocket = dgram.createSocket;
dgram.createSocket = function(...args) {
  deny('dgram.createSocket');
};
if (dgram.Socket && dgram.Socket.prototype) {
  dgram.Socket.prototype.send = function(...args) {
    deny('dgram.Socket.prototype.send');
  };
  dgram.Socket.prototype.bind = function(...args) {
    deny('dgram.Socket.prototype.bind');
  };
}

// ─── 6. DNS (Callback & Promises) ────────────────────────────────────────────
dns.lookup = function(hostname, options, callback) {
  deny(`dns.lookup(${hostname})`);
};
dns.resolve = function(hostname, rrtype, callback) {
  deny(`dns.resolve(${hostname})`);
};
dns.resolve4 = function(hostname, options, callback) {
  deny(`dns.resolve4(${hostname})`);
};
dns.resolve6 = function(hostname, options, callback) {
  deny(`dns.resolve6(${hostname})`);
};

if (dns.promises) {
  dns.promises.lookup = async function(hostname, options) {
    deny(`dns.promises.lookup(${hostname})`);
  };
  dns.promises.resolve = async function(hostname, rrtype) {
    deny(`dns.promises.resolve(${hostname})`);
  };
  dns.promises.resolve4 = async function(hostname, options) {
    deny(`dns.promises.resolve4(${hostname})`);
  };
  dns.promises.resolve6 = async function(hostname, options) {
    deny(`dns.promises.resolve6(${hostname})`);
  };
}

// ─── 7. GLOBAL FETCH ─────────────────────────────────────────────────────────
if (typeof globalThis.fetch === 'function') {
  globalThis.fetch = function(...args) {
    deny('globalThis.fetch');
  };
}

// ─── 8. WEBSOCKET ────────────────────────────────────────────────────────────
if (typeof globalThis.WebSocket === 'function') {
  globalThis.WebSocket = function(...args) {
    deny('globalThis.WebSocket');
  };
}

module.exports = {
  getNetworkAttempts: () => networkAttempts,
  getTrappedPrimitives: () => [...trappedPrimitives]
};
