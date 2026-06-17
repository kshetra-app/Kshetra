import { getUnifiedConstituenciesForState } from '@/lib/stateDataAdapter';
import { getCensusDistricts } from '../../../data/census/india-district-population-2011';

/**
 * District-level seat density for the delimitation overlay.
 * Maps modern districts → census districts, computes pop-per-seat ratio,
 * assigns deviation % to each constituency district.
 *
 * Census 2011 used old district boundaries (e.g. 10 in Telangana),
 * while seed data uses current 33. This map resolves that.
 *
 * Extracted verbatim from app/(tabs)/index.tsx — behaviour unchanged.
 *
 * @param stateCode      Active state code.
 * @param hasProjection  Whether a delimitation projection exists for the state
 *                       (mirrors the original `!stateProjection` guard).
 */
export function computeDistrictDensityMap(
  stateCode: string,
  hasProjection: boolean,
): Map<string, number> {
  const censusDistricts = getCensusDistricts(stateCode);
  if (!censusDistricts.length || !hasProjection) return new Map<string, number>();

  const constituencies = getUnifiedConstituenciesForState(stateCode);
  const totalPop = censusDistricts.reduce((s, d) => s + d.totalPopulation, 0);
  const totalSeats = constituencies.length;
  const idealPopPerSeat = totalPop / totalSeats;

  // Census district pop lookup (lowercase key)
  const censusPop = new Map<string, number>();
  for (const d of censusDistricts) {
    censusPop.set(d.districtName.toLowerCase(), d.totalPopulation);
  }

  // Map modern district → census parent (for reorganised states)
  const DISTRICT_PARENT: Record<string, string> = {
    // ── Telangana (33 → 10 census districts) ──
    'Kumuram Bheem Asifabad': 'Adilabad', 'Mancherial': 'Adilabad', 'Nirmal': 'Adilabad',
    'Peddapalli': 'Karimnagar', 'Rajanna Sircilla': 'Karimnagar', 'Jagtial': 'Karimnagar',
    'Kamareddy': 'Nizamabad',
    'Hanamkonda': 'Warangal', 'Jangaon': 'Warangal', 'Jayashankar Bhupalpally': 'Warangal',
    'Mahabubabad': 'Warangal', 'Mulugu': 'Warangal',
    'Bhadradri Kothagudem': 'Khammam',
    'Suryapet': 'Nalgonda', 'Yadadri Bhuvanagiri': 'Nalgonda',
    'Vikarabad': 'Rangareddy',
    'Medak': 'Sangareddy', 'Siddipet': 'Sangareddy',
    'Nagarkurnool': 'Mahbubnagar', 'Wanaparthy': 'Mahbubnagar',
    'Narayanpet': 'Mahbubnagar', 'Jogulamba Gadwal': 'Mahbubnagar',
    'Mahabubnagar': 'Mahbubnagar',
  };

  // Group constituencies by their census parent district
  const seatsByCensusDistrict = new Map<string, { seats: number; children: string[] }>();
  for (const c of constituencies) {
    const parent = (DISTRICT_PARENT[c.district] ?? c.district).toLowerCase();
    const entry = seatsByCensusDistrict.get(parent) ?? { seats: 0, children: [] };
    entry.seats++;
    if (!entry.children.includes(c.district)) entry.children.push(c.district);
    seatsByCensusDistrict.set(parent, entry);
  }

  // Compute deviation for each census district, then fan out to children
  const densityMap = new Map<string, number>();
  for (const [censusKey, { seats, children }] of seatsByCensusDistrict) {
    const pop = censusPop.get(censusKey);
    if (!pop || seats === 0) continue;
    const popPerSeat = pop / seats;
    const deviation = ((popPerSeat - idealPopPerSeat) / idealPopPerSeat) * 100;
    for (const child of children) {
      densityMap.set(child, deviation);
    }
  }
  return densityMap;
}
