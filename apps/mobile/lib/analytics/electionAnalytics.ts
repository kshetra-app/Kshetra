/**
 * Election Analytics Engine
 *
 * Cross-state election analytics computed from seed data:
 * 1. Party strength — seats won, vote share proxy, district dominance
 * 2. Margin analysis — safe vs swing seats, closest contests
 * 3. Anti-incumbency indicators — defection rate, margin erosion
 * 4. Reservation breakdown — GEN/SC/ST distribution per party
 * 5. District-level heatmap data — party dominance per district
 */

import {
  getUnifiedConstituenciesForState,
  type UnifiedConstituency,
} from '../stateDataAdapter';

// ─── TYPES ───

export interface PartyStrength {
  party: string;
  seatsWon: number;
  seatPercent: number;
  avgMargin: number;
  medianMargin: number;
  safeSeats: number;       // margin > 20000
  comfortableSeats: number; // margin 10000-20000
  marginalSeats: number;   // margin < 10000
  closeSeats: number;      // margin < 5000
}

export interface SwingSeat {
  acNo: number;
  name: string;
  district: string;
  winnerParty: string;
  runnerUp: string;
  margin: number;
  marginPercent: number;
  type: 'GEN' | 'SC' | 'ST';
}

export interface DistrictHeatmap {
  districtName: string;
  totalSeats: number;
  partyBreakdown: Array<{ party: string; seats: number; percent: number }>;
  dominantParty: string;
  dominancePercent: number;
  avgMargin: number;
  competitiveIndex: number; // 0-100, higher = more competitive
}

export interface ReservationAnalysis {
  total: number;
  gen: { count: number; parties: Record<string, number> };
  sc: { count: number; parties: Record<string, number> };
  st: { count: number; parties: Record<string, number> };
}

export interface AntiIncumbencyMetrics {
  defectionCount: number;
  defectionRate: number;
  defectedFrom: Record<string, number>;
  defectedTo: Record<string, number>;
  closestContests: SwingSeat[];
  vulnerableSeats: SwingSeat[];  // margin < 5% of winner votes
}

export interface StateAnalytics {
  stateCode: string;
  totalSeats: number;
  electionYear: number;
  partyStrength: PartyStrength[];
  swingSeats: SwingSeat[];
  districtHeatmap: DistrictHeatmap[];
  reservation: ReservationAnalysis;
  antiIncumbency: AntiIncumbencyMetrics;
  insights: string[];
}

export interface NationalComparison {
  states: Array<{
    stateCode: string;
    totalSeats: number;
    topParty: string;
    topPartySeats: number;
    avgMargin: number;
    swingSeatPercent: number;
    competitiveIndex: number;
  }>;
  dominantParties: Array<{ party: string; totalSeats: number; statesPresent: number }>;
}

// ─── THRESHOLDS ───

const SAFE_MARGIN = 20000;
const COMFORTABLE_MARGIN = 10000;
const MARGINAL_MARGIN = 10000;
const CLOSE_MARGIN = 5000;
const SWING_MARGIN = 8000;

// ─── CORE ANALYTICS ───

/**
 * Compute full analytics for a state.
 */
export function analyzeState(stateCode: string): StateAnalytics | null {
  const constituencies = getUnifiedConstituenciesForState(stateCode);
  if (constituencies.length === 0) return null;

  const partyStrength = computePartyStrength(constituencies);
  const swingSeats = identifySwingSeats(constituencies);
  const districtHeatmap = computeDistrictHeatmap(constituencies);
  const reservation = computeReservationAnalysis(constituencies);
  const antiIncumbency = computeAntiIncumbency(constituencies);
  const insights = generateInsights(stateCode, constituencies, partyStrength, swingSeats, districtHeatmap);

  return {
    stateCode,
    totalSeats: constituencies.length,
    electionYear: constituencies[0]?.electionYear ?? 0,
    partyStrength,
    swingSeats,
    districtHeatmap,
    reservation,
    antiIncumbency,
    insights,
  };
}

/**
 * Compare analytics across multiple states.
 */
export function compareStates(stateCodes: string[]): NationalComparison {
  const stateResults: NationalComparison['states'] = [];
  const partyTotals = new Map<string, { seats: number; states: Set<string> }>();

  for (const code of stateCodes) {
    const analytics = analyzeState(code);
    if (!analytics) continue;

    const topParty = analytics.partyStrength[0];
    const allMargins = getUnifiedConstituenciesForState(code).map((c) => c.margin);
    const avgMargin = allMargins.length > 0
      ? Math.round(allMargins.reduce((s, m) => s + m, 0) / allMargins.length)
      : 0;
    const swingPct = analytics.totalSeats > 0
      ? Math.round((analytics.swingSeats.length / analytics.totalSeats) * 100)
      : 0;

    // Competitive index: average of district competitive indices
    const compIdx = analytics.districtHeatmap.length > 0
      ? Math.round(analytics.districtHeatmap.reduce((s, d) => s + d.competitiveIndex, 0) / analytics.districtHeatmap.length)
      : 0;

    stateResults.push({
      stateCode: code,
      totalSeats: analytics.totalSeats,
      topParty: topParty?.party ?? 'N/A',
      topPartySeats: topParty?.seatsWon ?? 0,
      avgMargin,
      swingSeatPercent: swingPct,
      competitiveIndex: compIdx,
    });

    // Aggregate party totals
    for (const ps of analytics.partyStrength) {
      const existing = partyTotals.get(ps.party) ?? { seats: 0, states: new Set<string>() };
      existing.seats += ps.seatsWon;
      existing.states.add(code);
      partyTotals.set(ps.party, existing);
    }
  }

  const dominantParties = Array.from(partyTotals.entries())
    .map(([party, data]) => ({ party, totalSeats: data.seats, statesPresent: data.states.size }))
    .sort((a, b) => b.totalSeats - a.totalSeats);

  return { states: stateResults, dominantParties };
}

// ─── PARTY STRENGTH ───

function computePartyStrength(constituencies: UnifiedConstituency[]): PartyStrength[] {
  const partyMap = new Map<string, UnifiedConstituency[]>();

  for (const c of constituencies) {
    const party = c.currentParty;
    const list = partyMap.get(party) ?? [];
    list.push(c);
    partyMap.set(party, list);
  }

  return Array.from(partyMap.entries())
    .map(([party, seats]) => {
      const margins = seats.map((s) => s.margin).sort((a, b) => a - b);
      const median = margins.length > 0 ? margins[Math.floor(margins.length / 2)] : 0;
      const avg = margins.length > 0 ? Math.round(margins.reduce((s, m) => s + m, 0) / margins.length) : 0;

      return {
        party,
        seatsWon: seats.length,
        seatPercent: constituencies.length > 0 ? Math.round((seats.length / constituencies.length) * 1000) / 10 : 0,
        avgMargin: avg,
        medianMargin: median,
        safeSeats: seats.filter((s) => s.margin >= SAFE_MARGIN).length,
        comfortableSeats: seats.filter((s) => s.margin >= COMFORTABLE_MARGIN && s.margin < SAFE_MARGIN).length,
        marginalSeats: seats.filter((s) => s.margin < MARGINAL_MARGIN).length,
        closeSeats: seats.filter((s) => s.margin < CLOSE_MARGIN).length,
      };
    })
    .sort((a, b) => b.seatsWon - a.seatsWon);
}

// ─── SWING SEATS ───

function identifySwingSeats(constituencies: UnifiedConstituency[]): SwingSeat[] {
  return constituencies
    .filter((c) => c.margin < SWING_MARGIN)
    .map((c) => ({
      acNo: c.acNo,
      name: c.name,
      district: c.district,
      winnerParty: c.currentParty,
      runnerUp: c.runnerUp,
      margin: c.margin,
      marginPercent: c.winnerVotes > 0 ? Math.round((c.margin / c.winnerVotes) * 1000) / 10 : 0,
      type: c.type,
    }))
    .sort((a, b) => a.margin - b.margin);
}

// ─── DISTRICT HEATMAP ───

function computeDistrictHeatmap(constituencies: UnifiedConstituency[]): DistrictHeatmap[] {
  const districtMap = new Map<string, UnifiedConstituency[]>();

  for (const c of constituencies) {
    const list = districtMap.get(c.district) ?? [];
    list.push(c);
    districtMap.set(c.district, list);
  }

  return Array.from(districtMap.entries())
    .map(([districtName, seats]) => {
      // Party breakdown
      const partyCount = new Map<string, number>();
      for (const s of seats) {
        partyCount.set(s.currentParty, (partyCount.get(s.currentParty) ?? 0) + 1);
      }

      const partyBreakdown = Array.from(partyCount.entries())
        .map(([party, count]) => ({
          party,
          seats: count,
          percent: seats.length > 0 ? Math.round((count / seats.length) * 100) : 0,
        }))
        .sort((a, b) => b.seats - a.seats);

      const dominant = partyBreakdown[0];
      const margins = seats.map((s) => s.margin);
      const avgMargin = margins.length > 0 ? Math.round(margins.reduce((s, m) => s + m, 0) / margins.length) : 0;

      // Competitive index: based on how many parties hold seats + margin distribution
      const partyDiversity = partyBreakdown.length;
      const swingRatio = seats.filter((s) => s.margin < SWING_MARGIN).length / Math.max(1, seats.length);
      const compIndex = Math.round(Math.min(100, (partyDiversity * 15) + (swingRatio * 50) + (dominant ? (100 - dominant.percent) * 0.3 : 0)));

      return {
        districtName,
        totalSeats: seats.length,
        partyBreakdown,
        dominantParty: dominant?.party ?? 'N/A',
        dominancePercent: dominant?.percent ?? 0,
        avgMargin,
        competitiveIndex: compIndex,
      };
    })
    .sort((a, b) => b.totalSeats - a.totalSeats);
}

// ─── RESERVATION ANALYSIS ───

function computeReservationAnalysis(constituencies: UnifiedConstituency[]): ReservationAnalysis {
  const gen = constituencies.filter((c) => c.type === 'GEN');
  const sc = constituencies.filter((c) => c.type === 'SC');
  const st = constituencies.filter((c) => c.type === 'ST');

  const countParties = (list: UnifiedConstituency[]): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const c of list) {
      map[c.currentParty] = (map[c.currentParty] ?? 0) + 1;
    }
    return map;
  };

  return {
    total: constituencies.length,
    gen: { count: gen.length, parties: countParties(gen) },
    sc: { count: sc.length, parties: countParties(sc) },
    st: { count: st.length, parties: countParties(st) },
  };
}

// ─── ANTI-INCUMBENCY ───

function computeAntiIncumbency(constituencies: UnifiedConstituency[]): AntiIncumbencyMetrics {
  const defected = constituencies.filter((c) => c.currentParty !== c.winnerParty);
  const defectedFrom: Record<string, number> = {};
  const defectedTo: Record<string, number> = {};

  for (const c of defected) {
    defectedFrom[c.winnerParty] = (defectedFrom[c.winnerParty] ?? 0) + 1;
    defectedTo[c.currentParty] = (defectedTo[c.currentParty] ?? 0) + 1;
  }

  const closestContests = constituencies
    .map((c) => ({
      acNo: c.acNo,
      name: c.name,
      district: c.district,
      winnerParty: c.currentParty,
      runnerUp: c.runnerUp,
      margin: c.margin,
      marginPercent: c.winnerVotes > 0 ? Math.round((c.margin / c.winnerVotes) * 1000) / 10 : 0,
      type: c.type,
    }))
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 10);

  // Vulnerable: margin < 5% of winner votes
  const vulnerable = constituencies
    .filter((c) => c.winnerVotes > 0 && (c.margin / c.winnerVotes) < 0.05)
    .map((c) => ({
      acNo: c.acNo,
      name: c.name,
      district: c.district,
      winnerParty: c.currentParty,
      runnerUp: c.runnerUp,
      margin: c.margin,
      marginPercent: c.winnerVotes > 0 ? Math.round((c.margin / c.winnerVotes) * 1000) / 10 : 0,
      type: c.type,
    }))
    .sort((a, b) => a.margin - b.margin);

  return {
    defectionCount: defected.length,
    defectionRate: constituencies.length > 0 ? Math.round((defected.length / constituencies.length) * 1000) / 10 : 0,
    defectedFrom,
    defectedTo,
    closestContests,
    vulnerableSeats: vulnerable,
  };
}

// ─── INSIGHT GENERATION ───

function generateInsights(
  stateCode: string,
  constituencies: UnifiedConstituency[],
  partyStrength: PartyStrength[],
  swingSeats: SwingSeat[],
  districtHeatmap: DistrictHeatmap[],
): string[] {
  const insights: string[] = [];
  const total = constituencies.length;
  const top = partyStrength[0];

  if (top) {
    const majority = Math.ceil(total / 2) + 1;
    if (top.seatsWon >= majority) {
      insights.push(`${top.party} has a clear majority with ${top.seatsWon}/${total} seats (${top.seatPercent}%)`);
    } else {
      insights.push(`No single party has majority. ${top.party} leads with ${top.seatsWon}/${total} seats`);
    }
  }

  // Swing seat insight
  if (swingSeats.length > 0) {
    const pct = Math.round((swingSeats.length / total) * 100);
    insights.push(`${swingSeats.length} seats (${pct}%) won by margins under ${(SWING_MARGIN / 1000).toFixed(0)}K — these could flip in the next election`);
  }

  // Close contest insight
  if (partyStrength.length >= 2) {
    const closeTotal = partyStrength.reduce((s, p) => s + p.closeSeats, 0);
    if (closeTotal > 5) {
      insights.push(`${closeTotal} razor-thin contests (margin < ${(CLOSE_MARGIN / 1000).toFixed(0)}K) — any vote swing could change outcomes`);
    }
  }

  // District dominance
  const monopolyDistricts = districtHeatmap.filter((d) => d.dominancePercent >= 80);
  if (monopolyDistricts.length > 0) {
    insights.push(`${monopolyDistricts.length} districts are near-monopolies (80%+ seats by one party)`);
  }

  // Competitive districts
  const competitive = districtHeatmap.filter((d) => d.competitiveIndex >= 60);
  if (competitive.length > 0) {
    insights.push(`${competitive.length} districts are highly competitive battlegrounds`);
  }

  // Defection insight
  const defected = constituencies.filter((c) => c.currentParty !== c.winnerParty);
  if (defected.length > 0) {
    insights.push(`${defected.length} MLAs have switched parties since the election — a ${Math.round((defected.length / total) * 100)}% defection rate`);
  }

  return insights;
}
