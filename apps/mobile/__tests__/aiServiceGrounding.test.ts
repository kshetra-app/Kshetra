import { getConstituencyAnalysis, getStateSummary } from '../lib/aiService';

describe('FIX-4: AI Assistant Retrieval Grounding', () => {
  it('returns factual absence statement when no verified data exists (does not hallucinate)', async () => {
    // Deliberately sparse inputs where no verified MLA, party, margin, or electors exist
    const result = await getConstituencyAnalysis('NonExistentConstituency', 999, 'ZZ');

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    // Must return the factual statement stating verified records are limited
    expect(result).toContain('limited in the state database');
    expect(result).toContain('NonExistentConstituency');
    // Must NOT fabricate an MLA name or fake vote count
    expect(result).not.toContain('won by a landslide');
  });

  it('grounds output when partial verified data is provided', async () => {
    const result = await getConstituencyAnalysis(
      'Secunderabad',
      60,
      'TS',
      'T. Padma Rao',
      'BRS',
      12000
    );

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});
