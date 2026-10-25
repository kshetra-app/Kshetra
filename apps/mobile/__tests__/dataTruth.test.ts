import { displayFactValue, isFactProvenanceValid, type ProvenancedFact } from '../lib/dataTruth';
describe('mobile data-truth rendering', () => {
  const official: ProvenancedFact<number> = {
    value: 0,
    provenance: {
      source: { id: 'eci', name: 'Election Commission of India', url: 'https://results.eci.gov.in' },
      retrievedAt: '2026-10-25T10:00:00Z', effectiveFrom: '2024-06-04', effectiveTo: null,
      version: 'eci-results-2024-v1', status: 'OFFICIAL', valueStatus: 'OFFICIAL',
      transformationHistory: [{ name: 'eci-import', version: '1.0.0', performedAt: '2026-10-25T10:00:00Z' }],
    },
  };
  it('renders a real zero but not unknown values as zero', () => {
    expect(displayFactValue(0)).toBe('0');
    expect(displayFactValue(null)).toBe('Not available');
    expect(displayFactValue(undefined)).toBe('Not available');
  });
  it('rejects DTOs missing provenance', () => expect(isFactProvenanceValid({ value: 10 } as ProvenancedFact<number>)).toBe(false));
  it('accepts a fully sourced fact', () => expect(isFactProvenanceValid(official)).toBe(true));
});
