import type {
  PublicStateOverviewDTO,
  PublicConstituencyProfileDTO,
  PublicRepresentativeProfileDTO,
} from '@kshetra/shared';
import { isSupabaseAvailable, supabase } from '../lib/supabase';

const PUBLIC_WEB_ORIGIN = 'https://poligram.in';

export class PublicWebDataUnavailableError extends Error {
  readonly code = 'PUBLIC_DATA_UNAVAILABLE';

  constructor() {
    super('Public data is temporarily unavailable.');
    this.name = 'PublicWebDataUnavailableError';
  }
}

function requireDatabase(): void {
  if (!isSupabaseAvailable()) throw new PublicWebDataUnavailableError();
}

function raiseQueryFailure(error: unknown): never {
  // Keep provider/database details in server logs, not in public API responses.
  const detail = error instanceof Error ? error.message : String(error);
  throw Object.assign(new PublicWebDataUnavailableError(), { cause: detail });
}

function nullablePositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function nullablePercent(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100
    ? value
    : null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function unavailable(value: unknown): string {
  return value === null || value === undefined || value === '' ? 'Not available' : String(value);
}

async function countRows(table: string, column: string, value: string): Promise<number | null> {
  try {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq(column, value);
    if (error || typeof count !== 'number') return null;
    return count;
  } catch {
    return null;
  }
}

async function currentRepresentative(constituencyId: string): Promise<PublicConstituencyProfileDTO['currentRepresentative']> {
  try {
    const { data: tenureRows, error: tenureError } = await supabase
      .from('elected_tenures')
      .select('id, person_id, current_party, term_start')
      .eq('jurisdiction_type', 'assembly_constituency')
      .eq('jurisdiction_id', constituencyId)
      .eq('office_type', 'mla')
      .eq('is_current', true)
      .order('term_start', { ascending: false })
      .limit(2);
    if (tenureError || !tenureRows || tenureRows.length !== 1) return null;

    const tenure = tenureRows[0];
    const { data: person, error: personError } = await supabase
      .from('canonical_persons')
      .select('id, canonical_name')
      .eq('id', tenure.person_id)
      .maybeSingle();
    if (personError || !person?.canonical_name) return null;

    let party: string | null = null;
    if (tenure.current_party) {
      const { data: organization, error: organizationError } = await supabase
        .from('political_organizations')
        .select('name, short_name')
        .eq('id', tenure.current_party)
        .maybeSingle();
      if (!organizationError) party = organization?.short_name || organization?.name || null;
    }

    return {
      id: String(person.id),
      name: String(person.canonical_name),
      party,
      termStart: typeof tenure.term_start === 'string' ? tenure.term_start : null,
    };
  } catch {
    return null;
  }
}

async function recentElectorate(constituencyId: string): Promise<PublicConstituencyProfileDTO['electorateSummary']> {
  const empty = { totalElectors: null, maleElectors: null, femaleElectors: null, turnoutPercentage: null };
  try {
    const { data: contests, error: contestsError } = await supabase
      .from('election_contests')
      .select('election_id, total_electors, turnout_percentage, status')
      .eq('constituency_id', constituencyId)
      .eq('status', 'completed');
    if (contestsError || !contests?.length) return empty;

    const electionIds = [...new Set(contests.map((contest: any) => contest.election_id).filter(Boolean))];
    if (electionIds.length === 0) return empty;
    const { data: events, error: eventsError } = await supabase
      .from('election_events')
      .select('id, election_year, election_type, status')
      .in('id', electionIds)
      .eq('election_type', 'assembly')
      .eq('status', 'completed');
    if (eventsError || !events?.length) return empty;

    const latestEvent = [...events].sort((a: any, b: any) => (b.election_year || 0) - (a.election_year || 0))[0];
    const contest = contests.find((item: any) => item.election_id === latestEvent.id);
    if (!contest) return empty;
    return {
      totalElectors: nullablePositiveNumber(contest.total_electors),
      maleElectors: null,
      femaleElectors: null,
      turnoutPercentage: nullablePercent(contest.turnout_percentage),
    };
  } catch {
    return empty;
  }
}

async function civicIssueSummary(constituencyId: string): Promise<PublicConstituencyProfileDTO['civicSummary']> {
  try {
    const { data, error } = await supabase
      .from('civic_issues')
      .select('status')
      .eq('constituency_id', constituencyId);
    if (error || !Array.isArray(data)) return { openIssuesCount: null, resolvedIssuesCount: null, cdiScore: null };

    const openStatuses = new Set(['open', 'acknowledged', 'in_progress', 'reopened']);
    const resolvedStatuses = new Set(['resolved', 'closed']);
    return {
      openIssuesCount: data.filter((row: any) => openStatuses.has(row.status)).length,
      resolvedIssuesCount: data.filter((row: any) => resolvedStatuses.has(row.status)).length,
      cdiScore: null,
    };
  } catch {
    return { openIssuesCount: null, resolvedIssuesCount: null, cdiScore: null };
  }
}

export class PublicWebService {
  static async getStateOverview(stateCode: string): Promise<PublicStateOverviewDTO | null> {
    requireDatabase();
    const code = stateCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return null;

    let data: any;
    try {
      const result = await supabase
        .from('states')
        .select('code, name, ruling_party')
        .eq('code', code)
        .maybeSingle();
      if (result.error) raiseQueryFailure(result.error);
      data = result.data;
    } catch (error) {
      if (error instanceof PublicWebDataUnavailableError) throw error;
      raiseQueryFailure(error);
    }
    if (!data?.code || !data?.name) return null;

    const [assemblyCount, parliamentaryCount, districtCount] = await Promise.all([
      countRows('constituencies', 'state_code', code),
      countRows('parliamentary_constituencies', 'state_code', code),
      countRows('districts', 'state_code', code),
    ]);

    return {
      stateCode: code,
      name: String(data.name),
      capital: null,
      totalAssemblyConstituencies: assemblyCount,
      totalParliamentaryConstituencies: parliamentaryCount,
      rulingParty: typeof data.ruling_party === 'string' && data.ruling_party.trim() ? data.ruling_party : null,
      districtsCount: districtCount,
      delimitationSeatChange: null,
      sourceVerificationStatus: 'not_verified',
      canonicalUrl: `${PUBLIC_WEB_ORIGIN}/public/states/${code}`,
    };
  }

  static async getConstituencyProfile(acId: string): Promise<PublicConstituencyProfileDTO | null> {
    requireDatabase();
    const normalized = acId.trim().toUpperCase();
    const match = /^([A-Z]{2})-AC-0*(\d{1,3})$/.exec(normalized);
    if (!match) return null;
    const stateCode = match[1];
    const acNo = Number(match[2]);
    if (!Number.isSafeInteger(acNo) || acNo < 1 || acNo > 500) return null;

    const { data: row, error } = await supabase
      .from('constituencies')
      .select('id, ac_no, name, state_code, district, reservation_status')
      .eq('state_code', stateCode)
      .eq('ac_no', acNo)
      .maybeSingle();
    if (error) raiseQueryFailure(error);
    if (!row?.id || !row?.name) return null;

    const [representative, electorate, civicSummary] = await Promise.all([
      currentRepresentative(String(row.id)),
      recentElectorate(String(row.id)),
      civicIssueSummary(String(row.id)),
    ]);
    const category = row.reservation_status;
    const reservedCategory = category === 'GEN' || category === 'SC' || category === 'ST' ? category : null;
    const canonicalId = String(row.id);

    return {
      acId: canonicalId,
      acNo: Number(row.ac_no),
      name: String(row.name),
      stateCode: String(row.state_code || stateCode),
      districtId: null,
      districtName: typeof row.district === 'string' && row.district.trim() ? row.district : null,
      reservedCategory,
      currentRepresentative: representative,
      electorateSummary: electorate,
      delimitationImpact: null,
      civicSummary,
      sourceVerificationStatus: 'not_verified',
      canonicalUrl: `${PUBLIC_WEB_ORIGIN}/public/constituency/${encodeURIComponent(canonicalId)}`,
    };
  }

  static async getDistrictProfile(districtId: string): Promise<Record<string, unknown> | null> {
    requireDatabase();
    const key = districtId.trim();
    if (!/^[A-Za-z0-9-]{1,80}$/.test(key)) return null;
    const query = /^[0-9a-f-]{36}$/i.test(key)
      ? supabase.from('districts').select('id, code, state_code, name, headquarters').eq('id', key)
      : supabase.from('districts').select('id, code, state_code, name, headquarters').eq('code', key.toUpperCase());
    const { data, error } = await query.maybeSingle();
    if (error) raiseQueryFailure(error);
    if (!data?.id || !data?.name) return null;
    return {
      districtId: String(data.code || data.id),
      name: String(data.name),
      stateCode: typeof data.state_code === 'string' ? data.state_code : null,
      headquarters: typeof data.headquarters === 'string' ? data.headquarters : null,
      totalConstituencies: await countRows('constituencies', 'district_id', String(data.id)),
      sourceVerificationStatus: 'not_verified',
      canonicalUrl: `${PUBLIC_WEB_ORIGIN}/public/districts/${encodeURIComponent(String(data.code || data.id))}`,
    };
  }

  static async getRepresentativeProfile(repId: string): Promise<PublicRepresentativeProfileDTO | null> {
    requireDatabase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(repId)) return null;

    const { data: person, error } = await supabase
      .from('canonical_persons')
      .select('id, canonical_name')
      .eq('id', repId)
      .maybeSingle();
    if (error) raiseQueryFailure(error);
    if (!person?.id || !person?.canonical_name) return null;

    let stateCode: string | null = null;
    let constituencyId: string | null = null;
    let constituencyName: string | null = null;
    let party: string | null = null;
    let termStart: string | null = null;
    try {
      const { data: tenures, error: tenureError } = await supabase
        .from('elected_tenures')
        .select('jurisdiction_type, jurisdiction_id, current_party, term_start')
        .eq('person_id', repId)
        .eq('is_current', true)
        .order('term_start', { ascending: false })
        .limit(2);
      if (!tenureError && tenures?.length === 1) {
        const tenure = tenures[0];
        termStart = typeof tenure.term_start === 'string' ? tenure.term_start : null;
        if (typeof tenure.current_party === 'string') {
          const { data: organization } = await supabase
            .from('political_organizations')
            .select('name, short_name')
            .eq('id', tenure.current_party)
            .maybeSingle();
          party = organization?.short_name || organization?.name || null;
        }
        if (tenure.jurisdiction_type === 'assembly_constituency' && typeof tenure.jurisdiction_id === 'string') {
          const { data: constituency } = await supabase
            .from('constituencies')
            .select('id, name, state_code')
            .eq('id', tenure.jurisdiction_id)
            .maybeSingle();
          if (constituency) {
            constituencyId = String(constituency.id);
            constituencyName = typeof constituency.name === 'string' ? constituency.name : null;
            stateCode = typeof constituency.state_code === 'string' ? constituency.state_code : null;
          }
        }
      }
    } catch {
      // Identity remains valid even when optional office data has not been loaded.
    }

    return {
      id: String(person.id),
      name: String(person.canonical_name),
      stateCode,
      constituencyId,
      constituencyName,
      party,
      termStart,
      questionsAsked: null,
      debatesParticipated: null,
      declaredAssetsINR: null,
      criminalCasesCount: null,
      sourceVerificationStatus: 'not_verified',
      canonicalUrl: `${PUBLIC_WEB_ORIGIN}/public/representatives/${encodeURIComponent(String(person.id))}`,
    };
  }

  static async getElectionProfile(electionId: string): Promise<Record<string, unknown> | null> {
    requireDatabase();
    const key = electionId.trim();
    if (!/^[A-Za-z0-9-]{1,100}$/.test(key)) return null;
    const query = /^[0-9a-f-]{36}$/i.test(key)
      ? supabase.from('election_events').select('id, election_code, title, state_code, election_year, election_type, status, total_constituencies, total_electors, total_votes_polled, turnout_percentage').eq('id', key)
      : supabase.from('election_events').select('id, election_code, title, state_code, election_year, election_type, status, total_constituencies, total_electors, total_votes_polled, turnout_percentage').eq('election_code', key);
    const { data, error } = await query.maybeSingle();
    if (error) raiseQueryFailure(error);
    if (!data?.id || !data?.title) return null;
    return {
      id: String(data.id),
      electionCode: typeof data.election_code === 'string' ? data.election_code : null,
      title: String(data.title),
      stateCode: typeof data.state_code === 'string' ? data.state_code : null,
      year: typeof data.election_year === 'number' ? data.election_year : null,
      electionType: typeof data.election_type === 'string' ? data.election_type : null,
      status: typeof data.status === 'string' ? data.status : null,
      totalConstituencies: nullablePositiveNumber(data.total_constituencies),
      totalElectors: nullablePositiveNumber(data.total_electors),
      totalVotesPolled: nullablePositiveNumber(data.total_votes_polled),
      turnoutPercentage: nullablePercent(typeof data.turnout_percentage === 'string' ? Number(data.turnout_percentage) : data.turnout_percentage),
      sourceVerificationStatus: 'not_verified',
      canonicalUrl: `${PUBLIC_WEB_ORIGIN}/public/elections/${encodeURIComponent(String(data.election_code || data.id))}`,
    };
  }

  static async getDelimitationDiff(_acId: string): Promise<null> {
    // The repository has scenarios and lineage claims but no verified public per-AC diff source.
    throw new PublicWebDataUnavailableError();
  }

  static renderConstituencyHtml(profile: PublicConstituencyProfileDTO): string {
    const title = `${profile.name} (${profile.acId}) — Assembly Constituency Profile`;
    const description = `Assembly constituency profile for ${profile.name}. Some measures may be unavailable until source verification is complete.`;
    const jsonLd = safeJsonLd({ '@context': 'https://schema.org', '@type': 'AdministrativeArea', name: profile.name, identifier: profile.acId, url: profile.canonicalUrl, description });
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(profile.canonicalUrl)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><script type="application/ld+json">${jsonLd}</script><style>${this.baseStyles()}</style></head><body><main><span class="badge">${escapeHtml(profile.stateCode)} Assembly Constituency ${profile.acNo}</span><h1>${escapeHtml(profile.name)}</h1><p class="muted">District: ${escapeHtml(unavailable(profile.districtName))} · Category: ${escapeHtml(unavailable(profile.reservedCategory))}</p><section class="grid"><article><h2>Current representative</h2><strong>${escapeHtml(unavailable(profile.currentRepresentative?.name))}</strong><p>Party: ${escapeHtml(unavailable(profile.currentRepresentative?.party))}</p></article><article><h2>Electoral record</h2><strong>Electors: ${escapeHtml(unavailable(profile.electorateSummary.totalElectors?.toLocaleString('en-IN')))}</strong><p>Turnout: ${escapeHtml(profile.electorateSummary.turnoutPercentage == null ? 'Not available' : `${profile.electorateSummary.turnoutPercentage}%`)}</p></article><article><h2>Civic issues</h2><strong>Open: ${escapeHtml(unavailable(profile.civicSummary.openIssuesCount))}</strong><p>Resolved: ${escapeHtml(unavailable(profile.civicSummary.resolvedIssuesCount))}</p></article></section><section class="card"><h2>Boundary changes</h2><p>No verified public delimitation record is linked to this constituency.</p></section><footer>Database snapshot · source verification pending</footer></main></body></html>`;
  }

  static renderStateHtml(state: PublicStateOverviewDTO): string {
    const title = `${state.name} (${state.stateCode}) — Electoral Overview`;
    const description = `Database-backed public overview of ${state.name}. Source verification is pending.`;
    const jsonLd = safeJsonLd({ '@context': 'https://schema.org', '@type': 'AdministrativeArea', name: state.name, identifier: state.stateCode, url: state.canonicalUrl, description });
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(state.canonicalUrl)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><script type="application/ld+json">${jsonLd}</script><style>${this.baseStyles()}</style></head><body><main><h1>${escapeHtml(state.name)} (${escapeHtml(state.stateCode)})</h1><p class="muted">Capital: ${escapeHtml(unavailable(state.capital))} · Government label: ${escapeHtml(unavailable(state.rulingParty))}</p><section class="grid"><article><h2>Assembly constituencies</h2><strong>${escapeHtml(unavailable(state.totalAssemblyConstituencies))}</strong></article><article><h2>Parliamentary constituencies</h2><strong>${escapeHtml(unavailable(state.totalParliamentaryConstituencies))}</strong></article><article><h2>Districts</h2><strong>${escapeHtml(unavailable(state.districtsCount))}</strong></article><article><h2>Delimitation seat change</h2><strong>${escapeHtml(unavailable(state.delimitationSeatChange))}</strong></article></section><footer>Database snapshot · source verification pending</footer></main></body></html>`;
  }

  static renderDistrictHtml(district: Record<string, unknown>): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>District: ${escapeHtml(district.name)}</title><style>${this.baseStyles()}</style></head><body><main><h1>District: ${escapeHtml(district.name)}</h1><p>State: ${escapeHtml(unavailable(district.stateCode))}</p><p>Headquarters: ${escapeHtml(unavailable(district.headquarters))}</p><p>Constituencies: ${escapeHtml(unavailable(district.totalConstituencies))}</p><footer>Database snapshot · source verification pending</footer></main></body></html>`;
  }

  static renderRepresentativeHtml(rep: PublicRepresentativeProfileDTO): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(rep.name)} — Representative Profile</title><style>${this.baseStyles()}</style></head><body><main><h1>${escapeHtml(rep.name)}</h1><p>Party: ${escapeHtml(unavailable(rep.party))}</p><p>Constituency: ${escapeHtml(unavailable(rep.constituencyName))}</p><p>Declared assets: ${escapeHtml(unavailable(rep.declaredAssetsINR))}</p><footer>Database snapshot · source verification pending</footer></main></body></html>`;
  }

  static renderElectionHtml(election: Record<string, unknown>): string {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(election.title)} — Election</title><style>${this.baseStyles()}</style></head><body><main><h1>${escapeHtml(election.title)}</h1><p>Year: ${escapeHtml(unavailable(election.year))}</p><p>State: ${escapeHtml(unavailable(election.stateCode))}</p><p>Turnout: ${escapeHtml(election.turnoutPercentage == null ? 'Not available' : `${election.turnoutPercentage}%`)}</p><p>Results and source verification status: ${escapeHtml(unavailable(election.sourceVerificationStatus))}</p><footer>Database snapshot · source verification pending</footer></main></body></html>`;
  }

  static async generateSitemapXml(): Promise<string> {
    requireDatabase();
    const { data, error } = await supabase.from('states').select('code').order('name');
    if (error) raiseQueryFailure(error);
    const urls = (data || []).filter((row: any) => /^[A-Z]{2}$/.test(String(row.code))).map((row: any) => `  <url><loc>${PUBLIC_WEB_ORIGIN}/public/states/${encodeURIComponent(row.code)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
    return this.xmlSitemap(urls);
  }

  static async generateGeographySitemapXml(): Promise<string> {
    requireDatabase();
    const { data, error } = await supabase.from('constituencies').select('id').order('state_code').order('ac_no');
    if (error) raiseQueryFailure(error);
    const urls = (data || []).filter((row: any) => typeof row.id === 'string' && row.id.length > 0).map((row: any) => `  <url><loc>${PUBLIC_WEB_ORIGIN}/public/constituency/${encodeURIComponent(row.id)}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`);
    return this.xmlSitemap(urls);
  }

  private static xmlSitemap(urls: string[]): string {
    const root = `  <url><loc>${PUBLIC_WEB_ORIGIN}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`;
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[root, ...urls].join('\n')}\n</urlset>`;
  }

  private static baseStyles(): string {
    return 'body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;padding:2rem;margin:0}main{max-width:850px;margin:auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:2rem}.muted,footer{color:#94a3b8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;margin:1.5rem 0}.grid article,.card{background:#0f172a;padding:1rem;border-radius:8px}.grid h2,.card h2{font-size:1rem}.grid strong{font-size:1.35rem}.badge{color:#7dd3fc}footer{margin-top:2rem;font-size:.85rem}';
  }
}

export const publicWebService = PublicWebService;
