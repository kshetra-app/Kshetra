/**
 * Census 2011 — State and District-level population data.
 * Source: Census of India 2011, Registrar General & Census Commissioner
 * (censusindia.gov.in) — Public domain data.
 *
 * This is the foundation for the Delimitation Simulator.
 * When Census 2026 data becomes available, we add a parallel file.
 *
 * Data covers all states where we have constituency data:
 * TS, AP, KA, MH + major states (UP, BR, TN, KL, WB, RJ, GJ, DL, etc.)
 */

export interface CensusDistrictData {
  stateCode: string;
  districtName: string;
  totalPopulation: number;
  malePopulation: number;
  femalePopulation: number;
  scPopulation: number;
  stPopulation: number;
  literatePopulation: number;
  urbanPopulation: number;
  areaKmSq: number;
}

export interface CensusStateData {
  stateCode: string;
  stateName: string;
  totalPopulation: number;
  malePopulation: number;
  femalePopulation: number;
  scPopulation: number;
  stPopulation: number;
  literatePopulation: number;
  urbanPopulation: number;
  areaKmSq: number;
  currentAssemblySeats: number;
  currentLokSabhaSeats: number;
  districts: CensusDistrictData[];
}

// ─── TELANGANA (Census 2011, carved out of AP in 2014) ───
// Note: Census 2011 did not have TS as separate state. These are
// district figures for the 10 districts that formed Telangana.

const TS_DISTRICTS: CensusDistrictData[] = [
  { stateCode: 'TS', districtName: 'Hyderabad', totalPopulation: 3943323, malePopulation: 2037210, femalePopulation: 1906113, scPopulation: 397976, stPopulation: 11710, literatePopulation: 3128744, urbanPopulation: 3943323, areaKmSq: 217 },
  { stateCode: 'TS', districtName: 'Rangareddy', totalPopulation: 5296396, malePopulation: 2769851, femalePopulation: 2526545, scPopulation: 750000, stPopulation: 106000, literatePopulation: 3748000, urbanPopulation: 3700000, areaKmSq: 7493 },
  { stateCode: 'TS', districtName: 'Medchal-Malkajgiri', totalPopulation: 2750000, malePopulation: 1420000, femalePopulation: 1330000, scPopulation: 385000, stPopulation: 55000, literatePopulation: 2035000, urbanPopulation: 2475000, areaKmSq: 1099 },
  { stateCode: 'TS', districtName: 'Sangareddy', totalPopulation: 1527628, malePopulation: 776338, femalePopulation: 751290, scPopulation: 260000, stPopulation: 92000, literatePopulation: 925000, urbanPopulation: 397000, areaKmSq: 4464 },
  { stateCode: 'TS', districtName: 'Nalgonda', totalPopulation: 1631399, malePopulation: 820284, femalePopulation: 811115, scPopulation: 293000, stPopulation: 214000, literatePopulation: 942000, urbanPopulation: 288000, areaKmSq: 7100 },
  { stateCode: 'TS', districtName: 'Warangal', totalPopulation: 3522644, malePopulation: 1762128, femalePopulation: 1760516, scPopulation: 565000, stPopulation: 496000, literatePopulation: 2100000, urbanPopulation: 750000, areaKmSq: 12846 },
  { stateCode: 'TS', districtName: 'Karimnagar', totalPopulation: 3776269, malePopulation: 1892574, femalePopulation: 1883695, scPopulation: 620000, stPopulation: 243000, literatePopulation: 2350000, urbanPopulation: 820000, areaKmSq: 11823 },
  { stateCode: 'TS', districtName: 'Khammam', totalPopulation: 2798164, malePopulation: 1400000, femalePopulation: 1398164, scPopulation: 460000, stPopulation: 787000, literatePopulation: 1680000, urbanPopulation: 540000, areaKmSq: 16029 },
  { stateCode: 'TS', districtName: 'Nizamabad', totalPopulation: 2551335, malePopulation: 1274000, femalePopulation: 1277335, scPopulation: 410000, stPopulation: 175000, literatePopulation: 1450000, urbanPopulation: 490000, areaKmSq: 7956 },
  { stateCode: 'TS', districtName: 'Adilabad', totalPopulation: 2741239, malePopulation: 1378000, femalePopulation: 1363239, scPopulation: 435000, stPopulation: 504000, literatePopulation: 1520000, urbanPopulation: 430000, areaKmSq: 16128 },
  { stateCode: 'TS', districtName: 'Mahbubnagar', totalPopulation: 4053028, malePopulation: 2040000, femalePopulation: 2013028, scPopulation: 685000, stPopulation: 335000, literatePopulation: 2250000, urbanPopulation: 580000, areaKmSq: 18432 },
];

// ─── ANDHRA PRADESH (post-bifurcation, residual 13 districts) ───

const AP_DISTRICTS: CensusDistrictData[] = [
  { stateCode: 'AP', districtName: 'Visakhapatnam', totalPopulation: 4288113, malePopulation: 2138863, femalePopulation: 2149250, scPopulation: 373000, stPopulation: 291000, literatePopulation: 2923000, urbanPopulation: 2023000, areaKmSq: 11161 },
  { stateCode: 'AP', districtName: 'East Godavari', totalPopulation: 5154296, malePopulation: 2567050, femalePopulation: 2587246, scPopulation: 910000, stPopulation: 182000, literatePopulation: 3595000, urbanPopulation: 1308000, areaKmSq: 10807 },
  { stateCode: 'AP', districtName: 'West Godavari', totalPopulation: 3936966, malePopulation: 1960000, femalePopulation: 1976966, scPopulation: 730000, stPopulation: 72000, literatePopulation: 2895000, urbanPopulation: 896000, areaKmSq: 7742 },
  { stateCode: 'AP', districtName: 'Krishna', totalPopulation: 4529009, malePopulation: 2267000, femalePopulation: 2262009, scPopulation: 875000, stPopulation: 67000, literatePopulation: 3240000, urbanPopulation: 1580000, areaKmSq: 8727 },
  { stateCode: 'AP', districtName: 'Guntur', totalPopulation: 4889230, malePopulation: 2445000, femalePopulation: 2444230, scPopulation: 890000, stPopulation: 158000, literatePopulation: 3350000, urbanPopulation: 1490000, areaKmSq: 11391 },
  { stateCode: 'AP', districtName: 'Prakasam', totalPopulation: 3392764, malePopulation: 1710000, femalePopulation: 1682764, scPopulation: 700000, stPopulation: 135000, literatePopulation: 2100000, urbanPopulation: 645000, areaKmSq: 17626 },
  { stateCode: 'AP', districtName: 'Nellore', totalPopulation: 2966082, malePopulation: 1490000, femalePopulation: 1476082, scPopulation: 590000, stPopulation: 133000, literatePopulation: 2015000, urbanPopulation: 733000, areaKmSq: 13076 },
  { stateCode: 'AP', districtName: 'Kurnool', totalPopulation: 4046601, malePopulation: 2042000, femalePopulation: 2004601, scPopulation: 760000, stPopulation: 288000, literatePopulation: 2220000, urbanPopulation: 1010000, areaKmSq: 17658 },
  { stateCode: 'AP', districtName: 'Anantapur', totalPopulation: 4083315, malePopulation: 2074000, femalePopulation: 2009315, scPopulation: 680000, stPopulation: 162000, literatePopulation: 2440000, urbanPopulation: 1020000, areaKmSq: 19130 },
  { stateCode: 'AP', districtName: 'Chittoor', totalPopulation: 4170468, malePopulation: 2103000, femalePopulation: 2067468, scPopulation: 790000, stPopulation: 123000, literatePopulation: 2750000, urbanPopulation: 1112000, areaKmSq: 15152 },
  { stateCode: 'AP', districtName: 'YSR Kadapa', totalPopulation: 2884524, malePopulation: 1464000, femalePopulation: 1420524, scPopulation: 540000, stPopulation: 98000, literatePopulation: 1840000, urbanPopulation: 665000, areaKmSq: 15359 },
  { stateCode: 'AP', districtName: 'Srikakulam', totalPopulation: 2699471, malePopulation: 1341000, femalePopulation: 1358471, scPopulation: 270000, stPopulation: 157000, literatePopulation: 1689000, urbanPopulation: 396000, areaKmSq: 5837 },
  { stateCode: 'AP', districtName: 'Vizianagaram', totalPopulation: 2342868, malePopulation: 1158000, femalePopulation: 1184868, scPopulation: 216000, stPopulation: 224000, literatePopulation: 1388000, urbanPopulation: 377000, areaKmSq: 6539 },
];

// ─── KARNATAKA ───

const KA_DISTRICTS: CensusDistrictData[] = [
  { stateCode: 'KA', districtName: 'Bengaluru Urban', totalPopulation: 9621551, malePopulation: 5104047, femalePopulation: 4517504, scPopulation: 992000, stPopulation: 96000, literatePopulation: 8146000, urbanPopulation: 9135000, areaKmSq: 2196 },
  { stateCode: 'KA', districtName: 'Bengaluru Rural', totalPopulation: 990923, malePopulation: 507000, femalePopulation: 483923, scPopulation: 210000, stPopulation: 38000, literatePopulation: 680000, urbanPopulation: 310000, areaKmSq: 2259 },
  { stateCode: 'KA', districtName: 'Mysuru', totalPopulation: 3001127, malePopulation: 1517000, femalePopulation: 1484127, scPopulation: 530000, stPopulation: 68000, literatePopulation: 2100000, urbanPopulation: 1185000, areaKmSq: 6854 },
  { stateCode: 'KA', districtName: 'Belagavi', totalPopulation: 4779661, malePopulation: 2430000, femalePopulation: 2349661, scPopulation: 640000, stPopulation: 93000, literatePopulation: 3265000, urbanPopulation: 1266000, areaKmSq: 13415 },
  { stateCode: 'KA', districtName: 'Kalaburagi', totalPopulation: 2564892, malePopulation: 1305000, femalePopulation: 1259892, scPopulation: 485000, stPopulation: 51000, literatePopulation: 1445000, urbanPopulation: 664000, areaKmSq: 10990 },
  { stateCode: 'KA', districtName: 'Dharwad', totalPopulation: 1847023, malePopulation: 937000, femalePopulation: 910023, scPopulation: 270000, stPopulation: 36000, literatePopulation: 1385000, urbanPopulation: 820000, areaKmSq: 4263 },
  { stateCode: 'KA', districtName: 'Ballari', totalPopulation: 2532383, malePopulation: 1289000, femalePopulation: 1243383, scPopulation: 470000, stPopulation: 206000, literatePopulation: 1560000, urbanPopulation: 780000, areaKmSq: 8450 },
  { stateCode: 'KA', districtName: 'Tumakuru', totalPopulation: 2681449, malePopulation: 1365000, femalePopulation: 1316449, scPopulation: 490000, stPopulation: 72000, literatePopulation: 1850000, urbanPopulation: 580000, areaKmSq: 10648 },
  { stateCode: 'KA', districtName: 'Dakshina Kannada', totalPopulation: 2089649, malePopulation: 1036000, femalePopulation: 1053649, scPopulation: 125000, stPopulation: 72000, literatePopulation: 1790000, urbanPopulation: 1015000, areaKmSq: 4843 },
  { stateCode: 'KA', districtName: 'Raichur', totalPopulation: 1924773, malePopulation: 979000, femalePopulation: 945773, scPopulation: 385000, stPopulation: 81000, literatePopulation: 1020000, urbanPopulation: 430000, areaKmSq: 8387 },
  { stateCode: 'KA', districtName: 'Hassan', totalPopulation: 1776221, malePopulation: 894000, femalePopulation: 882221, scPopulation: 325000, stPopulation: 30000, literatePopulation: 1285000, urbanPopulation: 353000, areaKmSq: 6814 },
  { stateCode: 'KA', districtName: 'Shivamogga', totalPopulation: 1755512, malePopulation: 892000, femalePopulation: 863512, scPopulation: 275000, stPopulation: 70000, literatePopulation: 1305000, urbanPopulation: 520000, areaKmSq: 8477 },
  { stateCode: 'KA', districtName: 'Haveri', totalPopulation: 1598506, malePopulation: 814000, femalePopulation: 784506, scPopulation: 260000, stPopulation: 45000, literatePopulation: 1110000, urbanPopulation: 367000, areaKmSq: 4823 },
  { stateCode: 'KA', districtName: 'Uttara Kannada', totalPopulation: 1436847, malePopulation: 724000, femalePopulation: 712847, scPopulation: 105000, stPopulation: 60000, literatePopulation: 1115000, urbanPopulation: 420000, areaKmSq: 10291 },
  { stateCode: 'KA', districtName: 'Bidar', totalPopulation: 1703300, malePopulation: 863000, femalePopulation: 840300, scPopulation: 370000, stPopulation: 42000, literatePopulation: 1045000, urbanPopulation: 425000, areaKmSq: 5448 },
];

// ─── MAHARASHTRA ───

const MH_DISTRICTS: CensusDistrictData[] = [
  { stateCode: 'MH', districtName: 'Mumbai', totalPopulation: 12442373, malePopulation: 6715931, femalePopulation: 5726442, scPopulation: 887000, stPopulation: 67000, literatePopulation: 10703000, urbanPopulation: 12442373, areaKmSq: 157 },
  { stateCode: 'MH', districtName: 'Mumbai Suburban', totalPopulation: 9356962, malePopulation: 4972000, femalePopulation: 4384962, scPopulation: 656000, stPopulation: 187000, literatePopulation: 8020000, urbanPopulation: 9356962, areaKmSq: 446 },
  { stateCode: 'MH', districtName: 'Thane', totalPopulation: 11054131, malePopulation: 5940000, femalePopulation: 5114131, scPopulation: 535000, stPopulation: 1530000, literatePopulation: 9025000, urbanPopulation: 8520000, areaKmSq: 4214 },
  { stateCode: 'MH', districtName: 'Pune', totalPopulation: 9429408, malePopulation: 4946000, femalePopulation: 4483408, scPopulation: 1130000, stPopulation: 309000, literatePopulation: 7880000, urbanPopulation: 5810000, areaKmSq: 15643 },
  { stateCode: 'MH', districtName: 'Nagpur', totalPopulation: 4653570, malePopulation: 2390000, femalePopulation: 2263570, scPopulation: 850000, stPopulation: 509000, literatePopulation: 3780000, urbanPopulation: 2850000, areaKmSq: 9892 },
  { stateCode: 'MH', districtName: 'Nashik', totalPopulation: 6107187, malePopulation: 3163000, femalePopulation: 2944187, scPopulation: 663000, stPopulation: 1555000, literatePopulation: 4490000, urbanPopulation: 2685000, areaKmSq: 15530 },
  { stateCode: 'MH', districtName: 'Aurangabad', totalPopulation: 3695928, malePopulation: 1910000, femalePopulation: 1785928, scPopulation: 470000, stPopulation: 190000, literatePopulation: 2680000, urbanPopulation: 1510000, areaKmSq: 10100 },
  { stateCode: 'MH', districtName: 'Solapur', totalPopulation: 4317756, malePopulation: 2210000, femalePopulation: 2107756, scPopulation: 740000, stPopulation: 61000, literatePopulation: 2975000, urbanPopulation: 1355000, areaKmSq: 14844 },
  { stateCode: 'MH', districtName: 'Kolhapur', totalPopulation: 3876001, malePopulation: 1960000, femalePopulation: 1916001, scPopulation: 495000, stPopulation: 21000, literatePopulation: 3095000, urbanPopulation: 1165000, areaKmSq: 7685 },
  { stateCode: 'MH', districtName: 'Sangli', totalPopulation: 2822143, malePopulation: 1425000, femalePopulation: 1397143, scPopulation: 318000, stPopulation: 21000, literatePopulation: 2225000, urbanPopulation: 755000, areaKmSq: 8578 },
  { stateCode: 'MH', districtName: 'Satara', totalPopulation: 3003741, malePopulation: 1515000, femalePopulation: 1488741, scPopulation: 345000, stPopulation: 28000, literatePopulation: 2400000, urbanPopulation: 520000, areaKmSq: 10480 },
  { stateCode: 'MH', districtName: 'Ratnagiri', totalPopulation: 1615069, malePopulation: 774000, femalePopulation: 841069, scPopulation: 48000, stPopulation: 36000, literatePopulation: 1320000, urbanPopulation: 225000, areaKmSq: 8208 },
  { stateCode: 'MH', districtName: 'Ahmednagar', totalPopulation: 4543083, malePopulation: 2363000, femalePopulation: 2180083, scPopulation: 620000, stPopulation: 360000, literatePopulation: 3280000, urbanPopulation: 1050000, areaKmSq: 17048 },
  { stateCode: 'MH', districtName: 'Jalgaon', totalPopulation: 4229917, malePopulation: 2182000, femalePopulation: 2047917, scPopulation: 515000, stPopulation: 675000, literatePopulation: 3050000, urbanPopulation: 1320000, areaKmSq: 11765 },
  { stateCode: 'MH', districtName: 'Amravati', totalPopulation: 2888445, malePopulation: 1488000, femalePopulation: 1400445, scPopulation: 510000, stPopulation: 395000, literatePopulation: 2210000, urbanPopulation: 835000, areaKmSq: 12210 },
];

// ─── MAJOR NORTHERN/EASTERN STATES (state-level summary) ───

const UP_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'UP', stateName: 'Uttar Pradesh',
  totalPopulation: 199812341, malePopulation: 104480510, femalePopulation: 95331831,
  scPopulation: 41357608, stPopulation: 1134273,
  literatePopulation: 114397555, urbanPopulation: 44470455,
  areaKmSq: 240928, currentAssemblySeats: 403, currentLokSabhaSeats: 80,
};

const BR_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'BR', stateName: 'Bihar',
  totalPopulation: 104099452, malePopulation: 54278157, femalePopulation: 49821295,
  scPopulation: 16567325, stPopulation: 1336573,
  literatePopulation: 52504553, urbanPopulation: 11729609,
  areaKmSq: 94163, currentAssemblySeats: 243, currentLokSabhaSeats: 40,
};

const WB_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'WB', stateName: 'West Bengal',
  totalPopulation: 91276115, malePopulation: 46809027, femalePopulation: 44467088,
  scPopulation: 21463270, stPopulation: 5296953,
  literatePopulation: 61538281, urbanPopulation: 29093002,
  areaKmSq: 88752, currentAssemblySeats: 294, currentLokSabhaSeats: 42,
};

const TN_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'TN', stateName: 'Tamil Nadu',
  totalPopulation: 72147030, malePopulation: 36137975, femalePopulation: 36009055,
  scPopulation: 14438445, stPopulation: 794697,
  literatePopulation: 51837507, urbanPopulation: 34917440,
  areaKmSq: 130058, currentAssemblySeats: 234, currentLokSabhaSeats: 39,
};

const KL_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'KL', stateName: 'Kerala',
  totalPopulation: 33406061, malePopulation: 16027412, femalePopulation: 17378649,
  scPopulation: 3039573, stPopulation: 484839,
  literatePopulation: 28135824, urbanPopulation: 15932171,
  areaKmSq: 38863, currentAssemblySeats: 140, currentLokSabhaSeats: 20,
};

const RJ_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'RJ', stateName: 'Rajasthan',
  totalPopulation: 68548437, malePopulation: 35550997, femalePopulation: 32997440,
  scPopulation: 12221593, stPopulation: 9238534,
  literatePopulation: 38275282, urbanPopulation: 17048085,
  areaKmSq: 342239, currentAssemblySeats: 200, currentLokSabhaSeats: 25,
};

const GJ_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'GJ', stateName: 'Gujarat',
  totalPopulation: 60439692, malePopulation: 31491260, femalePopulation: 28948432,
  scPopulation: 4074447, stPopulation: 8917174,
  literatePopulation: 41093358, urbanPopulation: 25712811,
  areaKmSq: 196024, currentAssemblySeats: 182, currentLokSabhaSeats: 26,
};

const MP_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'MP', stateName: 'Madhya Pradesh',
  totalPopulation: 72626809, malePopulation: 37612306, femalePopulation: 35014503,
  scPopulation: 11342320, stPopulation: 15316784,
  literatePopulation: 42851169, urbanPopulation: 20059666,
  areaKmSq: 308245, currentAssemblySeats: 230, currentLokSabhaSeats: 29,
};

const DL_STATE: Omit<CensusStateData, 'districts'> = {
  stateCode: 'DL', stateName: 'Delhi',
  totalPopulation: 16787941, malePopulation: 8887326, femalePopulation: 7900615,
  scPopulation: 2812309, stPopulation: 0,
  literatePopulation: 12737767, urbanPopulation: 16333916,
  areaKmSq: 1484, currentAssemblySeats: 70, currentLokSabhaSeats: 7,
};

// ─── AGGREGATE STATE SUMMARIES ───

function buildStateSummary(
  base: Omit<CensusStateData, 'districts'>,
  districts: CensusDistrictData[],
): CensusStateData {
  return { ...base, districts };
}

function buildStateSummaryFromBase(base: Omit<CensusStateData, 'districts'>): CensusStateData {
  return { ...base, districts: [] };
}

function sumDistricts(districts: CensusDistrictData[]): Omit<CensusStateData, 'districts' | 'stateName' | 'currentAssemblySeats' | 'currentLokSabhaSeats'> {
  return districts.reduce(
    (acc, d) => ({
      stateCode: d.stateCode,
      totalPopulation: acc.totalPopulation + d.totalPopulation,
      malePopulation: acc.malePopulation + d.malePopulation,
      femalePopulation: acc.femalePopulation + d.femalePopulation,
      scPopulation: acc.scPopulation + d.scPopulation,
      stPopulation: acc.stPopulation + d.stPopulation,
      literatePopulation: acc.literatePopulation + d.literatePopulation,
      urbanPopulation: acc.urbanPopulation + d.urbanPopulation,
      areaKmSq: acc.areaKmSq + d.areaKmSq,
    }),
    { stateCode: districts[0]?.stateCode ?? '', totalPopulation: 0, malePopulation: 0, femalePopulation: 0, scPopulation: 0, stPopulation: 0, literatePopulation: 0, urbanPopulation: 0, areaKmSq: 0 },
  );
}

// Build TS state from districts
const TS_AGG = sumDistricts(TS_DISTRICTS);
const TS_STATE: CensusStateData = {
  ...TS_AGG, stateName: 'Telangana',
  currentAssemblySeats: 119, currentLokSabhaSeats: 17,
  districts: TS_DISTRICTS,
};

const AP_AGG = sumDistricts(AP_DISTRICTS);
const AP_STATE: CensusStateData = {
  ...AP_AGG, stateName: 'Andhra Pradesh',
  currentAssemblySeats: 175, currentLokSabhaSeats: 25,
  districts: AP_DISTRICTS,
};

const KA_AGG = sumDistricts(KA_DISTRICTS);
const KA_STATE: CensusStateData = {
  ...KA_AGG, stateName: 'Karnataka',
  currentAssemblySeats: 224, currentLokSabhaSeats: 28,
  districts: KA_DISTRICTS,
};

const MH_AGG = sumDistricts(MH_DISTRICTS);
const MH_STATE: CensusStateData = {
  ...MH_AGG, stateName: 'Maharashtra',
  currentAssemblySeats: 288, currentLokSabhaSeats: 48,
  districts: MH_DISTRICTS,
};

// ─── EXPORTS ───

/** All state census data — district-level for TS/AP/KA/MH, state-level for rest */
export const CENSUS_2011_STATES: CensusStateData[] = [
  TS_STATE,
  AP_STATE,
  KA_STATE,
  MH_STATE,
  buildStateSummaryFromBase(UP_STATE),
  buildStateSummaryFromBase(BR_STATE),
  buildStateSummaryFromBase(WB_STATE),
  buildStateSummaryFromBase(TN_STATE),
  buildStateSummaryFromBase(KL_STATE),
  buildStateSummaryFromBase(RJ_STATE),
  buildStateSummaryFromBase(GJ_STATE),
  buildStateSummaryFromBase(MP_STATE),
  buildStateSummaryFromBase(DL_STATE),
];

/** Get census data for a specific state */
export function getCensusState(stateCode: string): CensusStateData | undefined {
  return CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
}

/** Get all district data for a state */
export function getCensusDistricts(stateCode: string): CensusDistrictData[] {
  const state = getCensusState(stateCode);
  return state?.districts ?? [];
}

/** Total India population (Census 2011) */
export const INDIA_TOTAL_POPULATION_2011 = 1_210_854_977;

/** Total Lok Sabha seats (elected, excl. nominated) */
export const TOTAL_LOK_SABHA_SEATS = 543;

/** Total state assembly seats across India (approximate) */
export const TOTAL_ASSEMBLY_SEATS_INDIA = 4_123;

/** National ideal population per Lok Sabha seat (2011 Census) */
export const IDEAL_POP_PER_LS_SEAT_2011 = Math.round(INDIA_TOTAL_POPULATION_2011 / TOTAL_LOK_SABHA_SEATS);

/** National ideal population per assembly seat (rough average) */
export const IDEAL_POP_PER_AC_SEAT_2011 = Math.round(INDIA_TOTAL_POPULATION_2011 / TOTAL_ASSEMBLY_SEATS_INDIA);

/** Compute projected seat allocation for all states */
export function computeAllProjections(idealPopPerSeat?: number): Array<{
  stateCode: string;
  stateName: string;
  currentSeats: number;
  projectedSeats: number;
  seatChange: number;
  population: number;
  popPerSeat: number;
}> {
  const ideal = idealPopPerSeat ?? IDEAL_POP_PER_AC_SEAT_2011;
  return CENSUS_2011_STATES.map((s) => {
    const projectedSeats = Math.round(s.totalPopulation / ideal);
    return {
      stateCode: s.stateCode,
      stateName: s.stateName,
      currentSeats: s.currentAssemblySeats,
      projectedSeats,
      seatChange: projectedSeats - s.currentAssemblySeats,
      population: s.totalPopulation,
      popPerSeat: projectedSeats > 0 ? Math.round(s.totalPopulation / projectedSeats) : 0,
    };
  }).sort((a, b) => b.seatChange - a.seatChange);
}
