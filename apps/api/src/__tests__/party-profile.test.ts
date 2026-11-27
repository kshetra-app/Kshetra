import Fastify from 'fastify';
import { supabase } from '../lib/supabase';
import { partyRoutes } from '../routes/parties';

jest.mock('../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

test('returns cited facts from the registry without implying an approved Poligram Page', async () => {
  const sourceUrl = 'https://www.eci.gov.in/constitution-of-political-party';
  const facts = [{ kind: 'constitution', sourceUrl }];
  const lookup = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      error: null,
      data: {
        id: 'ORG-PARTY-JDU',
        name: 'Janata Dal (United)',
        short_name: 'JDU',
        page_id: null,
        profile_evidence: facts,
        provenance_records: { metadata: { sourceUrl } },
        organization_multilingual_names: [
          { language_code: 'hi', name_value: 'जनता दल (यूनाइटेड)', valid_from: '2003-10-30' },
          {
            language_code: 'hi',
            name_value: 'Old recorded name',
            valid_from: '1999-01-01',
            valid_to: '2003-10-29',
          },
        ],
      },
    }),
  };
  (supabase.from as jest.Mock).mockReturnValue(lookup);
  const app = Fastify();
  try {
    await app.register(partyRoutes);
    const result = await app.inject('/api/v1/parties/ORG-PARTY-JDU');
    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({
      id: 'ORG-PARTY-JDU',
      profileEvidence: facts,
      sourceUrl,
      page_id: null,
      verifiedAt: null,
      names: [{ language_code: 'hi', name_value: 'जनता दल (यूनाइटेड)' }],
    });
    expect(result.json()).not.toHaveProperty('profile_evidence');
    expect(supabase.from).toHaveBeenCalledWith('political_organizations');
    expect(lookup.eq).toHaveBeenCalledWith('id', 'ORG-PARTY-JDU');
    expect(lookup.eq).toHaveBeenCalledWith('org_type', 'political_party');
  } finally {
    await app.close();
  }
});
