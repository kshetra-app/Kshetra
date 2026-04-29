/**
 * Maharashtra Constituency Demographics (288 seats)
 */

import type { ConstituencyDemographics } from './telangana-demographics';
import { MH_CONSTITUENCIES } from './maharashtra-constituencies';

function generateMHDemographics(): ConstituencyDemographics[] {
  const districtProfiles: Record<string, {
    literacy: number; urban: number; sc: number; st: number; popBase: number; areaBase: number;
  }> = {
    'Nandurbar':    { literacy: 64.4, urban: 14.2, sc: 6.8, st: 65.4, popBase: 260000, areaBase: 1200 },
    'Dhule':        { literacy: 74.2, urban: 28.4, sc: 12.2, st: 22.6, popBase: 290000, areaBase: 1050 },
    'Jalgaon':      { literacy: 78.4, urban: 32.6, sc: 13.4, st: 12.8, popBase: 310000, areaBase: 950 },
    'Nashik':       { literacy: 80.8, urban: 42.8, sc: 12.6, st: 24.4, popBase: 340000, areaBase: 750 },
    'Ahmednagar':   { literacy: 78.6, urban: 22.4, sc: 14.8, st: 8.6, popBase: 305000, areaBase: 1100 },
    'Thane':        { literacy: 86.2, urban: 78.4, sc: 6.8, st: 12.4, popBase: 380000, areaBase: 380 },
    'Palghar':      { literacy: 74.6, urban: 32.6, sc: 4.2, st: 36.8, popBase: 310000, areaBase: 850 },
    'Mumbai Urban': { literacy: 89.2, urban: 100, sc: 7.6, st: 0.8, popBase: 350000, areaBase: 15 },
    'Mumbai Suburban': { literacy: 90.8, urban: 100, sc: 6.2, st: 1.2, popBase: 420000, areaBase: 20 },
    'Pune':         { literacy: 86.4, urban: 60.8, sc: 14.2, st: 5.8, popBase: 365000, areaBase: 550 },
    'Solapur':      { literacy: 76.2, urban: 28.6, sc: 18.2, st: 3.4, popBase: 295000, areaBase: 1100 },
    'Satara':       { literacy: 82.4, urban: 18.6, sc: 12.4, st: 2.6, popBase: 280000, areaBase: 1200 },
    'Kolhapur':     { literacy: 81.8, urban: 24.8, sc: 13.8, st: 1.4, popBase: 295000, areaBase: 1050 },
    'Sangli':       { literacy: 82.6, urban: 22.4, sc: 12.8, st: 1.8, popBase: 285000, areaBase: 1100 },
    'Ratnagiri':    { literacy: 82.2, urban: 14.2, sc: 8.6, st: 2.4, popBase: 240000, areaBase: 1500 },
    'Sindhudurg':   { literacy: 85.4, urban: 12.8, sc: 6.4, st: 1.8, popBase: 210000, areaBase: 1800 },
    'Nagpur':       { literacy: 89.6, urban: 68.4, sc: 18.8, st: 4.2, popBase: 350000, areaBase: 450 },
    'Wardha':       { literacy: 86.8, urban: 28.4, sc: 18.6, st: 4.8, popBase: 270000, areaBase: 1100 },
    'Amravati':     { literacy: 87.4, urban: 32.6, sc: 16.4, st: 12.8, popBase: 290000, areaBase: 1050 },
    'Akola':        { literacy: 85.6, urban: 34.8, sc: 22.4, st: 3.6, popBase: 280000, areaBase: 1000 },
    'Washim':       { literacy: 82.4, urban: 18.6, sc: 22.8, st: 4.2, popBase: 260000, areaBase: 1200 },
    'Buldhana':     { literacy: 82.8, urban: 20.4, sc: 18.6, st: 4.8, popBase: 275000, areaBase: 1150 },
    'Aurangabad':   { literacy: 78.4, urban: 48.6, sc: 12.8, st: 4.4, popBase: 320000, areaBase: 800 },
    'Jalna':        { literacy: 74.2, urban: 22.4, sc: 16.8, st: 3.6, popBase: 280000, areaBase: 1100 },
    'Parbhani':     { literacy: 74.8, urban: 24.6, sc: 18.2, st: 3.4, popBase: 275000, areaBase: 1100 },
    'Hingoli':      { literacy: 76.2, urban: 16.8, sc: 18.6, st: 4.8, popBase: 260000, areaBase: 1200 },
    'Nanded':       { literacy: 75.4, urban: 26.8, sc: 18.4, st: 6.2, popBase: 285000, areaBase: 1050 },
    'Latur':        { literacy: 77.8, urban: 24.6, sc: 20.4, st: 2.8, popBase: 280000, areaBase: 1100 },
    'Osmanabad':    { literacy: 76.4, urban: 18.4, sc: 18.8, st: 2.4, popBase: 265000, areaBase: 1200 },
    'Beed':         { literacy: 72.4, urban: 18.6, sc: 18.2, st: 4.6, popBase: 270000, areaBase: 1250 },
    'Chandrapur':   { literacy: 80.4, urban: 28.4, sc: 14.8, st: 18.6, popBase: 290000, areaBase: 1050 },
    'Gadchiroli':   { literacy: 70.8, urban: 8.6, sc: 8.4, st: 38.6, popBase: 220000, areaBase: 2200 },
    'Gondiya':      { literacy: 82.6, urban: 16.8, sc: 18.4, st: 16.8, popBase: 255000, areaBase: 1300 },
    'Bhandara':     { literacy: 84.8, urban: 14.6, sc: 22.4, st: 8.6, popBase: 260000, areaBase: 1200 },
    'Yavatmal':     { literacy: 80.8, urban: 22.4, sc: 16.8, st: 12.4, popBase: 275000, areaBase: 1100 },
    'Raigad':       { literacy: 83.6, urban: 42.8, sc: 8.4, st: 12.6, popBase: 310000, areaBase: 700 },
  };

  return MH_CONSTITUENCIES.map((c) => {
    const dp = districtProfiles[c.district] || districtProfiles['Pune'];
    const jitter = (base: number, range: number) => {
      const seed = c.acNo * 7 + base * 3;
      return +(base + (((seed % 100) / 100 - 0.5) * range * 2)).toFixed(1);
    };

    const pop = Math.round(dp.popBase + ((c.acNo * 137) % 80000) - 40000);
    const voters = Math.round(pop * 0.72 + ((c.acNo * 53) % 15000));
    const male = Math.round(voters * 0.49 + ((c.acNo * 31) % 3000));
    const female = voters - male;
    const turnout = jitter(66.1, 8);
    const area = Math.round(dp.areaBase + ((c.acNo * 97) % 600) - 300);

    return {
      acNo: c.acNo,
      population: pop,
      totalVoters: voters,
      turnout2023: turnout,
      maleVoters: male,
      femaleVoters: female,
      literacy: jitter(dp.literacy, 5),
      urbanPercent: jitter(dp.urban, 10),
      scPercent: jitter(dp.sc, 4),
      stPercent: jitter(dp.st, 3),
      areaSqKm: Math.max(5, area),
    };
  });
}

export const MH_DEMOGRAPHICS: ConstituencyDemographics[] = generateMHDemographics();

const demoByAcNo = new Map<number, ConstituencyDemographics>(
  MH_DEMOGRAPHICS.map((d) => [d.acNo, d]),
);

export function getMHConstituencyDemographics(acNo: number): ConstituencyDemographics | undefined {
  return demoByAcNo.get(acNo);
}
