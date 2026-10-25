import { assertDatasetProvenance, formatFactValue, validateProvenancedFact, type ProvenancedFact } from './dataProvenance';
const good: ProvenancedFact<number> = {
  value: 0,
  provenance: {
    source: { id: 'eci', name: 'Election Commission of India', url: 'https://results.eci.gov.in' },
    retrievedAt: '2026-10-25T10:00:00Z', effectiveFrom: '2024-06-04', effectiveTo: null,
    version: 'eci-results-2024-v1', status: 'OFFICIAL', valueStatus: 'OFFICIAL',
    transformationHistory: [{ name: 'eci-results-import', version: '1.0.0', performedAt: '2026-10-25T10:00:00Z' }],
  },
};
describe('data truth and provenance', () => {
  test('preserves a real zero and formats absent values as not available', () => {
    expect(formatFactValue(good.value)).toBe('0');
    expect(formatFactValue(null)).toBe('Not available');
    expect(formatFactValue(undefined)).toBe('Not available');
    expect(formatFactValue('')).toBe('Not available');
  });
  test('accepts complete official provenance', () => expect(validateProvenancedFact(good)).toEqual([]));
  test('rejects missing source/version and undocumented missing value', () => {
    const fact = { value: null, provenance: {
      source: null, retrievedAt: null, effectiveFrom: null, effectiveTo: null, version: '',
      status: 'UNKNOWN', valueStatus: 'UNKNOWN', transformationHistory: [],
    } } as ProvenancedFact<null>;
    const issues = validateProvenancedFact(fact);
    expect(issues).toContain('source: missing');
    expect(issues).toContain('version: missing');
    expect(issues).toContain('missing value: missingReason required');
  });
  test('requires labelled estimate/scenario transformations', () => {
    const fact = { ...good, provenance: { ...good.provenance, status: 'SCENARIO' as const, valueStatus: 'SCENARIO' as const, transformationHistory: [] } };
    expect(validateProvenancedFact(fact)).toContain('estimate/scenario: transformation history must be labelled');
  });
  test('rejects effective-date conflicts', () => {
    const fact = { ...good, provenance: { ...good.provenance, effectiveFrom: '2025-01-01', effectiveTo: '2024-12-31' } };
    expect(validateProvenancedFact(fact)).toContain('effective-date conflict: effectiveTo precedes effectiveFrom');
  });
  test('rejects values asserted as unknown/unverified', () => {
    const fact = { ...good, provenance: { ...good.provenance, status: 'UNKNOWN' as const, valueStatus: 'UNKNOWN' as const } };
    expect(validateProvenancedFact(fact)).toContain('value/status conflict: unknown or unverified facts must not assert a concrete value');
  });
  test('rejects invalid and duplicate dataset identifiers', () => {
    expect(() => assertDatasetProvenance([
      { id: 'TS-AC-1', stateCode: 'TS', acNo: 0, facts: { votes: good } },
      { id: 'TS-AC-1', stateCode: 'Telangana', acNo: 1, facts: { votes: good } },
    ])).toThrow(/duplicate id/);
  });
  test('allows explicit missing value with reason, without fabricated zero', () => {
    const absent: ProvenancedFact<null> = { value: null, provenance: {
      ...good.provenance, status: 'UNKNOWN', valueStatus: 'UNKNOWN', missingReason: 'NOT_PROVIDED',
    } };
    expect(validateProvenancedFact(absent)).not.toContain('missing value: missingReason required');
  });
});
