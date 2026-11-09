import { PublicWebDataUnavailableError, PublicWebService } from '../services/publicWebService';
import { isSupabaseConfigured, setSupabaseConfiguredForTesting, supabase } from '../lib/supabase';

function queryFor(result: any) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    in: jest.fn(() => query),
    maybeSingle: jest.fn(async () => result),
    then: (resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe('Public web data source', () => {
  const originalConfigured = isSupabaseConfigured;

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(originalConfigured);
  });

  it('fails closed when the public database source is not configured', async () => {
    setSupabaseConfiguredForTesting(false);
    await expect(PublicWebService.getStateOverview('TS')).rejects.toBeInstanceOf(PublicWebDataUnavailableError);
    await expect(PublicWebService.getConstituencyProfile('TS-AC-61')).rejects.toBeInstanceOf(PublicWebDataUnavailableError);
  });

  it('builds state counts from database rows and leaves unsupported fields explicitly unknown', async () => {
    setSupabaseConfiguredForTesting(true);
    const queries: Record<string, any> = {
      states: queryFor({ data: { code: 'TS', name: 'Telangana', ruling_party: null }, error: null }),
      constituencies: queryFor({ count: 119, error: null }),
      parliamentary_constituencies: queryFor({ count: 17, error: null }),
      districts: queryFor({ count: 33, error: null }),
    };
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => queries[table]) as any);

    const state = await PublicWebService.getStateOverview('ts');

    expect(state).toMatchObject({
      stateCode: 'TS',
      name: 'Telangana',
      capital: null,
      totalAssemblyConstituencies: 119,
      totalParliamentaryConstituencies: 17,
      rulingParty: null,
      districtsCount: 33,
      delimitationSeatChange: null,
      sourceVerificationStatus: 'not_verified',
    });
  });

  it('maps only present constituency, election, and civic records and preserves unknown metrics as null', async () => {
    setSupabaseConfiguredForTesting(true);
    const queries: Record<string, any> = {
      constituencies: queryFor({ data: {
        id: 'TS-AC-61', ac_no: 61, name: 'Jubilee Hills', state_code: 'TS', district: 'Hyderabad', reservation_status: 'GEN',
      }, error: null }),
      elected_tenures: queryFor({ data: [{ id: 'tenure-1', person_id: 'person-1', current_party: 'party-1', term_start: '2023-12-09' }], error: null }),
      canonical_persons: queryFor({ data: { id: 'person-1', canonical_name: 'Recorded Person' }, error: null }),
      political_organizations: queryFor({ data: { name: 'Recorded Party', short_name: 'RP' }, error: null }),
      election_contests: queryFor({ data: [{ election_id: 'election-1', total_electors: 102000, turnout_percentage: 0, status: 'completed' }], error: null }),
      election_events: queryFor({ data: [{ id: 'election-1', election_year: 2023, election_type: 'assembly', status: 'completed' }], error: null }),
      civic_issues: queryFor({ data: [{ status: 'open' }, { status: 'resolved' }], error: null }),
    };
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => queries[table]) as any);

    const profile = await PublicWebService.getConstituencyProfile('TS-AC-061');

    expect(profile).toMatchObject({
      acId: 'TS-AC-61',
      acNo: 61,
      name: 'Jubilee Hills',
      districtName: 'Hyderabad',
      reservedCategory: 'GEN',
      currentRepresentative: { name: 'Recorded Person', party: 'RP', termStart: '2023-12-09' },
      electorateSummary: { totalElectors: 102000, maleElectors: null, femaleElectors: null, turnoutPercentage: null },
      delimitationImpact: null,
      civicSummary: { openIssuesCount: 1, resolvedIssuesCount: 1, cdiScore: null },
      sourceVerificationStatus: 'not_verified',
    });
    expect(JSON.stringify(profile)).not.toContain('Mohammad Azharuddin');
    expect(JSON.stringify(profile)).not.toContain('384200');
  });

  it('renders unavailable figures as text and escapes untrusted database values', () => {
    const html = PublicWebService.renderStateHtml({
      stateCode: 'TS',
      name: '<script>alert(1)</script>',
      capital: null,
      totalAssemblyConstituencies: null,
      totalParliamentaryConstituencies: null,
      rulingParty: null,
      districtsCount: null,
      delimitationSeatChange: null,
      sourceVerificationStatus: 'not_verified',
      canonicalUrl: 'https://poligram.in/public/states/TS',
    });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Not available');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
