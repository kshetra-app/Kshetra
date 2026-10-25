import React from 'react';
import { render } from '@testing-library/react-native';
import FactValue from '../components/FactValue';
import type { ProvenancedFact } from '../lib/dataTruth';

describe('FactValue', () => {
  const provenance = {
    source: { id: 'eci', name: 'Election Commission of India', url: 'https://results.eci.gov.in' },
    retrievedAt: '2026-10-25T10:00:00Z',
    effectiveFrom: '2024-06-04',
    effectiveTo: null,
    version: 'eci-results-2024-v1',
    status: 'OFFICIAL' as const,
    valueStatus: 'OFFICIAL' as const,
    transformationHistory: [{ name: 'eci-results-import', version: '1.0.0', performedAt: '2026-10-25T10:00:00Z' }],
  };
  it('displays a genuine zero as zero', () => {
    const fact: ProvenancedFact<number> = { value: 0, provenance };
    const { getByText } = render(<FactValue label="Votes" fact={fact} />);
    expect(getByText('0')).toBeTruthy();
  });
  it('displays null as not available', () => {
    const fact: ProvenancedFact<number> = {
      value: null,
      provenance: { ...provenance, status: 'UNKNOWN', valueStatus: 'UNKNOWN', missingReason: 'NOT_PROVIDED' },
    };
    const { getByText } = render(<FactValue label="Votes" fact={fact} />);
    expect(getByText('Not available')).toBeTruthy();
  });
});
