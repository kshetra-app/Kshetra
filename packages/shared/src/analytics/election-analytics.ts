/**
 * Shared election analytics — used by both mobile Intelligence tab and API analytics endpoint.
 * Computes party breakdown, district breakdown, reservation counts, and margin stats
 * from a generic array of constituency records.
 */

export interface ConstituencyRecord {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner: string;
  winnerVotes: number;
  runnerUp: string;
  margin: number;
}

export interface PartySummary {
  party: string;
  seats: number;
  percentage: number;
}

export interface DistrictSummary {
  name: string;
  totalSeats: number;
  dominantParty: string;
  parties: Record<string, number>;
}

export interface MarginExtremes {
  closest: { constituency: string; margin: number };
  biggest: { constituency: string; margin: number };
}

export interface ElectionAnalytics {
  totalConstituencies: number;
  totalDistricts: number;
  partySummary: PartySummary[];
  districts: DistrictSummary[];
  reservationCounts: { GEN: number; SC: number; ST: number };
  margins: MarginExtremes;
}

/**
 * Compute full election analytics from an array of constituency records.
 * Pure function — no side effects, no I/O.
 */
export function computeElectionAnalytics(
  records: ConstituencyRecord[],
): ElectionAnalytics {
  const total = records.length;
  const partySeats: Record<string, number> = {};
  const districtMap: Record<string, Record<string, number>> = {};
  const reservationCounts = { GEN: 0, SC: 0, ST: 0 };
  let closestMargin = Infinity;
  let closestAC = '';
  let biggestMargin = 0;
  let biggestAC = '';

  for (const c of records) {
    partySeats[c.winner] = (partySeats[c.winner] || 0) + 1;

    if (!districtMap[c.district]) districtMap[c.district] = {};
    districtMap[c.district][c.winner] =
      (districtMap[c.district][c.winner] || 0) + 1;

    reservationCounts[c.type]++;

    if (c.margin < closestMargin) {
      closestMargin = c.margin;
      closestAC = c.name;
    }
    if (c.margin > biggestMargin) {
      biggestMargin = c.margin;
      biggestAC = c.name;
    }
  }

  const partySummary: PartySummary[] = Object.entries(partySeats)
    .sort(([, a], [, b]) => b - a)
    .map(([party, seats]) => ({
      party,
      seats,
      percentage: total > 0 ? parseFloat(((seats / total) * 100).toFixed(1)) : 0,
    }));

  const districts: DistrictSummary[] = Object.entries(districtMap)
    .map(([name, parties]) => {
      const totalSeats = Object.values(parties).reduce((a, b) => a + b, 0);
      const dominant = Object.entries(parties).sort(([, a], [, b]) => b - a)[0];
      return {
        name,
        totalSeats,
        dominantParty: dominant[0],
        parties,
      };
    })
    .sort((a, b) => b.totalSeats - a.totalSeats);

  return {
    totalConstituencies: total,
    totalDistricts: districts.length,
    partySummary,
    districts,
    reservationCounts,
    margins: {
      closest: { constituency: closestAC, margin: closestMargin },
      biggest: { constituency: biggestAC, margin: biggestMargin },
    },
  };
}
