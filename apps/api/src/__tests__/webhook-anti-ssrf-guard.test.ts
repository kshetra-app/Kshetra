import {
  isBlockedIpv4,
  isBlockedIpv6,
  isBlockedIp,
  validateAndPinEgressTarget,
} from '../modules/webhooks/antiSsrfGuard';

describe('Webhook anti-SSRF egress guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLocalOverride = process.env.ALLOW_LOCALHOST_TEST_ONLY;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalLocalOverride === undefined) delete process.env.ALLOW_LOCALHOST_TEST_ONLY;
    else process.env.ALLOW_LOCALHOST_TEST_ONLY = originalLocalOverride;
  });

  it.each([
    ['10.0.0.1', true],
    ['172.16.0.1', true],
    ['192.168.1.1', true],
    ['127.0.0.1', true],
    ['169.254.169.254', true],
    ['100.64.0.1', true],
    ['192.0.2.1', true],
    ['198.51.100.2', true],
    ['203.0.113.10', true],
    ['224.0.0.1', true],
    ['8.8.8.8', false],
    ['1.1.1.1', false],
  ])('classifies IPv4 %s as blocked=%s', (ip, blocked) => {
    expect(isBlockedIpv4(ip).blocked).toBe(blocked);
  });

  it.each([
    ['::1', true],
    ['::', true],
    ['fe80::1', true],
    ['fd00::1', true],
    ['fc00::1', true],
    ['ff02::1', true],
    ['2001:db8::1', true],
    ['100::1', true],
    ['::ffff:192.168.1.1', true],
    ['::ffff:8.8.8.8', false],
    ['2606:4700:4700::1111', false],
  ])('classifies IPv6 %s as blocked=%s', (ip, blocked) => {
    expect(isBlockedIpv6(ip).blocked).toBe(blocked);
  });

  it('blocks malformed IP literals', () => {
    expect(isBlockedIp('not-an-ip')).toEqual({ blocked: true, reason: 'INVALID_IP_FORMAT' });
  });

  it('rejects malformed URLs', async () => {
    await expect(validateAndPinEgressTarget('not a url')).rejects.toThrow('INVALID_WEBHOOK_URL');
  });

  it('rejects embedded username/password', async () => {
    await expect(validateAndPinEgressTarget('https://user:password@example.test/')).rejects.toThrow('USERINFO_PROHIBITED');
  });

  it('rejects plain HTTP outside the localhost test exception', async () => {
    await expect(validateAndPinEgressTarget('http://example.test/', {
      mockDnsResolver: async () => ['8.8.8.8'],
    })).rejects.toThrow('INVALID_PROTOCOL_HTTPS_REQUIRED');
  });

  it('rejects non-standard HTTPS ports', async () => {
    await expect(validateAndPinEgressTarget('https://example.test:8443/', {
      mockDnsResolver: async () => ['8.8.8.8'],
    })).rejects.toThrow('INVALID_PORT_FORBIDDEN');
  });

  it('rejects localhost override outside NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'development';
    await expect(validateAndPinEgressTarget('http://localhost:8080/', { allowLocalhostInTest: true }))
      .rejects.toThrow('FATAL_SSRF_CONFIGURATION_VIOLATION');
  });

  it('allows the explicitly enabled localhost fixture only in test mode', async () => {
    process.env.NODE_ENV = 'test';
    const result = await validateAndPinEgressTarget('http://localhost:8080/', { allowLocalhostInTest: true });
    expect(result.hostname).toBe('localhost');
    expect(result.pinnedIp).toBe('127.0.0.1');
    expect(result.resolvedIps).toEqual(['127.0.0.1']);
    result.agent.destroy();
  });

  it('rejects an empty DNS result', async () => {
    await expect(validateAndPinEgressTarget('https://example.test/', {
      mockDnsResolver: async () => [],
    })).rejects.toThrow('returned zero IP addresses');
  });

  it('rejects when DNS resolution throws', async () => {
    await expect(validateAndPinEgressTarget('https://example.test/', {
      mockDnsResolver: async () => { throw new Error('fixture DNS failure'); },
    })).rejects.toThrow('DNS_RESOLUTION_FAILED');
  });

  it('rejects a private IP returned by DNS', async () => {
    await expect(validateAndPinEgressTarget('https://example.test/', {
      mockDnsResolver: async () => ['10.1.2.3'],
    })).rejects.toThrow('BLOCKED_PRIVATE_IP_ADDRESS');
  });

  it('rejects mixed DNS answers if any answer is private', async () => {
    await expect(validateAndPinEgressTarget('https://example.test/', {
      mockDnsResolver: async () => ['8.8.8.8', '192.168.1.20'],
    })).rejects.toThrow('BLOCKED_PRIVATE_IP_ADDRESS');
  });

  it('pins the connection to the first validated public DNS result', async () => {
    process.env.NODE_ENV = 'test';
    const result = await validateAndPinEgressTarget('https://example.test/', {
      mockDnsResolver: async () => ['8.8.8.8', '1.1.1.1'],
    });
    expect(result.hostname).toBe('example.test');
    expect(result.pinnedIp).toBe('8.8.8.8');
    expect(result.resolvedIps).toEqual(['8.8.8.8', '1.1.1.1']);
    result.agent.destroy();
  });

  it('validates a public IPv4 literal without DNS', async () => {
    const result = await validateAndPinEgressTarget('https://8.8.8.8/');
    expect(result.resolvedIps).toEqual(['8.8.8.8']);
    expect(result.pinnedIp).toBe('8.8.8.8');
    result.agent.destroy();
  });

  it('rejects a private IP literal', async () => {
    await expect(validateAndPinEgressTarget('https://127.0.0.1/')).rejects.toThrow('BLOCKED_PRIVATE_IP_ADDRESS');
  });
});
