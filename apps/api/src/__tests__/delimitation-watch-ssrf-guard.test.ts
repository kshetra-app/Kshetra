import {
  SsrfSecurityError,
  createPinnedAgent,
  isBlockedIp,
  isBlockedIpv4,
  isBlockedIpv6,
  isPrivateOrRestrictedIp,
  parseAlternateIpv4,
  resolveAndValidateDns,
  validateAndPinSourceUrl,
  validateSourceUrl,
} from '../modules/delimitationWatch/ssrfGuard';

describe('Delimitation Watch SSRF guard', () => {
  describe('IPv4 blocked ranges', () => {
    it.each([
      ['0.1.2.3', true], ['10.1.2.3', true], ['100.64.0.1', true],
      ['127.0.0.1', true], ['169.254.169.254', true], ['172.31.255.1', true],
      ['192.0.0.1', true], ['192.0.2.1', true], ['192.88.99.1', true],
      ['192.168.1.1', true], ['198.18.0.1', true], ['198.51.100.1', true],
      ['203.0.113.1', true], ['224.0.0.1', true], ['240.0.0.1', true],
      ['255.255.255.255', true], ['8.8.8.8', false], ['1.1.1.1', false],
    ])('classifies %s as blocked=%s', (ip, blocked) => {
      expect(isBlockedIpv4(ip).blocked).toBe(blocked);
    });
  });

  describe('IPv6 blocked ranges', () => {
    it.each([
      ['::1', true], ['::', true], ['0:0:0:0:0:0:0:1', true],
      ['0:0:0:0:0:0:0:0', true], ['::ffff:127.0.0.1', true],
      ['::ffff:192.168.1.1', true], ['::ffff:8.8.8.8', false],
      ['::ffff:7f00:0001', true], ['fe80::1', true], ['fe90::1', true],
      ['fea0::1', true], ['feb0::1', true], ['fc00::1', true], ['fd00::1', true],
      ['ff02::1', true], ['2001:db8::1', true], ['2001:0db8::1', true],
      ['100::1', true], ['2606:4700:4700::1111', false],
    ])('classifies %s as blocked=%s', (ip, blocked) => {
      expect(isBlockedIpv6(ip).blocked).toBe(blocked);
    });

    it('blocks unparseable IPv4-mapped forms and AWS metadata literal', () => {
      expect(isBlockedIpv6('::ffff:not-an-ip').blocked).toBe(true);
      expect(isBlockedIpv6('fd00:ec2::254').blocked).toBe(true);
    });
  });

  describe('alternate IP representations', () => {
    it.each([
      ['2130706433', '127.0.0.1'],
      ['0x7f000001', '127.0.0.1'],
      ['017700000001', '127.0.0.1'],
      ['0x7f.0.0.1', '127.0.0.1'],
      ['0177.0.0.1', '127.0.0.1'],
      ['127.1', '127.0.0.1'],
      ['127.0.1', '127.0.0.1'],
      ['8.8.8.8', '8.8.8.8'],
    ])('normalizes %s to %s', (input, expected) => {
      expect(parseAlternateIpv4(input)).toBe(expected);
    });

    it.each(['[::1]', 'example.com', '0xZZ', '256.256.256.256', '1.2.3.999', '1.2.3.4.5'])(
      'does not normalize invalid or non-IPv4 input %s',
      (input) => expect(parseAlternateIpv4(input)).toBeNull(),
    );

    it('classifies alternate IP forms and ordinary hostnames', () => {
      expect(isBlockedIp('2130706433').blocked).toBe(true);
      expect(isBlockedIp('::ffff:192.168.1.2').blocked).toBe(true);
      expect(isBlockedIp('8.8.8.8').blocked).toBe(false);
      expect(isBlockedIp('example.com').blocked).toBe(false);
      expect(isPrivateOrRestrictedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('9.9.9.9')).toBe(false);
    });
  });

  describe('DNS validation and pinning', () => {
    it('accepts a public IP literal without DNS lookup', async () => {
      await expect(resolveAndValidateDns('8.8.8.8')).resolves.toEqual({
        resolvedIps: ['8.8.8.8'], pinnedIp: '8.8.8.8',
      });
    });

    it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '2130706433', '::1'])(
      'rejects prohibited literal %s',
      async (ip) => await expect(resolveAndValidateDns(ip)).rejects.toBeInstanceOf(SsrfSecurityError),
    );

    it('allows loopback literal only with explicit test override', async () => {
      await expect(resolveAndValidateDns('127.0.0.1', { allowLocalhostInTest: true }))
        .resolves.toEqual({ resolvedIps: ['127.0.0.1'], pinnedIp: '127.0.0.1' });
    });

    it('validates every DNS answer and fails closed for mixed public/private results', async () => {
      await expect(resolveAndValidateDns('mixed.example', {
        mockDnsResolver: async () => ['8.8.8.8', '192.168.0.9'],
      })).rejects.toThrow('SSRF Blocked');
    });

    it('rejects empty and failed DNS lookups', async () => {
      await expect(resolveAndValidateDns('empty.example', { mockDnsResolver: async () => [] }))
        .rejects.toThrow('returned zero IP addresses');
      await expect(resolveAndValidateDns('broken.example', {
        mockDnsResolver: async () => { throw new Error('fixture DNS failure'); },
      })).rejects.toThrow('fixture DNS failure');
    });

    it('pins the first address after validating all public DNS answers', async () => {
      await expect(resolveAndValidateDns('public.example', {
        mockDnsResolver: async (host) => {
          expect(host).toBe('public.example');
          return ['8.8.8.8', '1.1.1.1'];
        },
      })).resolves.toEqual({ resolvedIps: ['8.8.8.8', '1.1.1.1'], pinnedIp: '8.8.8.8' });
    });
  });

  describe('URL validation', () => {
    it.each([
      ['not a url', 'Invalid source URL'],
      ['file:///etc/passwd', 'Forbidden URL protocol'],
      ['https://user:secret@example.com/', 'credentials'],
      ['http://localhost/', 'Local and loopback'],
      ['http://host.local/', 'Local and loopback'],
      ['https://host.internal/', 'Local and loopback'],
      ['https://host.lan/', 'Local and loopback'],
      ['https://host.home/', 'Local and loopback'],
      ['https://127.0.0.1/', 'prohibited range'],
      ['https://2130706433/', 'prohibited range'],
    ])('rejects unsafe URL %s', async (url, message) => {
      await expect(validateAndPinSourceUrl(url)).rejects.toThrow(message);
    });

    it('pins an HTTPS destination with DNS and preserves explicit port', async () => {
      const result = await validateAndPinSourceUrl('https://example.test:8443/path', {
        mockDnsResolver: async () => ['8.8.8.8'],
        timeoutMs: 5000,
      });
      try {
        expect(result).toMatchObject({
          hostname: 'example.test', port: 8443, isHttps: true,
          resolvedIps: ['8.8.8.8'], pinnedIp: '8.8.8.8',
        });
        expect(result.parsedUrl.pathname).toBe('/path');
      } finally {
        result.agent.destroy();
      }
    });

    it('allows a public HTTP IP literal and defaults the port to 80', async () => {
      const result = await validateAndPinSourceUrl('http://8.8.8.8/status');
      try {
        expect(result).toMatchObject({ hostname: '8.8.8.8', port: 80, isHttps: false, pinnedIp: '8.8.8.8' });
      } finally {
        result.agent.destroy();
      }
    });

    it('allows local fixture URLs only when explicitly enabled', async () => {
      const result = await validateAndPinSourceUrl('http://localhost:8080/fixture', {
        allowLocalhostForTests: true,
        mockDnsResolver: async () => ['127.0.0.1'],
      });
      try {
        expect(result).toMatchObject({ hostname: 'localhost', port: 8080, pinnedIp: '127.0.0.1' });
      } finally {
        result.agent.destroy();
      }
    });

    it('rejects DNS answers containing restricted addresses', async () => {
      await expect(validateAndPinSourceUrl('https://mixed.example', {
        mockDnsResolver: async () => ['8.8.8.8', '169.254.169.254'],
      })).rejects.toThrow('SSRF Blocked');
    });
  });

  describe('legacy URL validation', () => {
    it('accepts safe HTTPS URLs and rejects credentials and unsafe protocols', () => {
      expect(validateSourceUrl('https://example.com/path').hostname).toBe('example.com');
      expect(() => validateSourceUrl('not a url')).toThrow('Invalid source URL');
      expect(() => validateSourceUrl('file:///tmp/x')).toThrow('Forbidden URL protocol');
      expect(() => validateSourceUrl('https://user:pass@example.com')).toThrow('credentials');
      expect(() => validateSourceUrl('https://127.0.0.1')).toThrow('prohibited');
      expect(() => validateSourceUrl('https://localhost')).toThrow('Local and loopback');
    });

    it('supports localhost fixture override but still rejects private non-loopback IPs', () => {
      expect(validateSourceUrl('http://127.0.0.1:3000', true).hostname).toBe('127.0.0.1');
      expect(validateSourceUrl('http://localhost:3000', true).hostname).toBe('localhost');
      expect(() => validateSourceUrl('https://10.0.0.1', true)).toThrow('prohibited');
    });
  });

  describe('pinned agents', () => {
    it('creates HTTP and HTTPS agents with explicit options', () => {
      const httpAgent = createPinnedAgent('example.test', '8.8.8.8', false, { timeoutMs: 2000 });
      const httpsAgent = createPinnedAgent('example.test', '8.8.8.8', true, { timeoutMs: 3000, allowInsecureInTest: true });
      try {
        expect(httpAgent).toBeDefined();
        expect(httpsAgent).toBeDefined();
        expect((httpsAgent as any).options.rejectUnauthorized).toBe(false);
      } finally {
        httpAgent.destroy();
        httpsAgent.destroy();
      }
    });
  });
});
