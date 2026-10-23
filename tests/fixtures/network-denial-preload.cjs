/**
 * tests/fixtures/network-denial-preload.cjs
 *
 * Process-Wide Network Denial Preload Harness
 * Task: W021.5 / CTO Directive 142 Section 3.3
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Traps outgoing calls through Node network primitives (net.Socket, tls, http, https, dns, globalThis.fetch).
 * Any attempted outgoing connection immediately throws PROCESS_NETWORK_DENIED.
 */

const net = require('node:net');
const tls = require('node:tls');
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns');

let networkAttempts = 0;

function deny(primitive) {
  networkAttempts++;
  const err = new Error(`PROCESS_NETWORK_DENIED: Attempted outgoing network access via ${primitive}`);
  err.code = 'PROCESS_NETWORK_DENIED';
  err.primitive = primitive;
  throw err;
}

// Trap Socket connect
const originalSocketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  deny('net.Socket.prototype.connect');
  return this;
};

// Trap TLS connect
const originalTlsConnect = tls.connect;
tls.connect = function(...args) {
  deny('tls.connect');
};

// Trap HTTP / HTTPS
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

// Trap DNS
dns.lookup = function(hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  deny(`dns.lookup(${hostname})`);
};
dns.resolve = function(hostname, rrtype, callback) {
  deny(`dns.resolve(${hostname})`);
};

// Trap globalThis.fetch
if (typeof globalThis.fetch === 'function') {
  globalThis.fetch = function(...args) {
    deny('globalThis.fetch');
  };
}

module.exports = {
  getNetworkAttempts: () => networkAttempts
};
