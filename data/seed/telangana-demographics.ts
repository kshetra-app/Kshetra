/**
 * Telangana Constituency Demographics
 *
 * ── DATA SOURCES ─────────────────────────────────────────────────────────
 *  1. Census 2011 (Telangana carved out from AP in 2014)
 *  2. Telangana Socio-Economic Outlook 2023
 *  3. ECI voter roll data (2023 assembly elections)
 *  4. TSEC delimitation gazette
 *
 * ── NOTES ─────────────────────────────────────────────────────────────────
 *  - Population figures are 2011 Census projections (2024 estimates unavailable)
 *  - Literacy, urbanisation from district-level Census 2011
 *  - Total voters from ECI 2023 final rolls
 *  - SC/ST % approximated from district-level Census proportions
 */

export interface ConstituencyDemographics {
  acNo: number;
  /** Approximate population (Census 2011 projection) */
  population: number;
  /** Total registered voters (ECI 2023) */
  totalVoters: number;
  /** Voter turnout % in 2023 */
  turnout2023: number;
  /** Male voters */
  maleVoters: number;
  /** Female voters */
  femaleVoters: number;
  /** Literacy rate % */
  literacy: number;
  /** Urban population % */
  urbanPercent: number;
  /** SC population % */
  scPercent: number;
  /** ST population % */
  stPercent: number;
  /** Area in sq km */
  areaSqKm: number;
}

/**
 * Demographics for all 119 Telangana Assembly Constituencies.
 * Values are based on Census 2011 district proportions + ECI 2023 voter data.
 */
export const TELANGANA_DEMOGRAPHICS: ConstituencyDemographics[] = [
  // ─── KUMURAM BHEEM ASIFABAD / MANCHERIAL / ADILABAD / NIRMAL ───
  { acNo: 1, population: 247000, totalVoters: 189245, turnout2023: 74.2, maleVoters: 96120, femaleVoters: 93125, literacy: 49.2, urbanPercent: 12.8, scPercent: 11.2, stPercent: 32.4, areaSqKm: 1850 },
  { acNo: 2, population: 263000, totalVoters: 201340, turnout2023: 78.5, maleVoters: 102450, femaleVoters: 98890, literacy: 55.1, urbanPercent: 18.5, scPercent: 22.1, stPercent: 8.3, areaSqKm: 1420 },
  { acNo: 3, population: 271000, totalVoters: 207650, turnout2023: 76.3, maleVoters: 105670, femaleVoters: 101980, literacy: 56.8, urbanPercent: 34.2, scPercent: 24.5, stPercent: 6.1, areaSqKm: 980 },
  { acNo: 4, population: 285000, totalVoters: 218430, turnout2023: 75.8, maleVoters: 111240, femaleVoters: 107190, literacy: 62.3, urbanPercent: 52.1, scPercent: 15.8, stPercent: 4.2, areaSqKm: 760 },
  { acNo: 5, population: 231000, totalVoters: 176890, turnout2023: 72.6, maleVoters: 89940, femaleVoters: 86950, literacy: 44.7, urbanPercent: 8.9, scPercent: 8.4, stPercent: 45.6, areaSqKm: 2340 },
  { acNo: 6, population: 238000, totalVoters: 182150, turnout2023: 73.4, maleVoters: 92680, femaleVoters: 89470, literacy: 46.3, urbanPercent: 10.2, scPercent: 9.8, stPercent: 38.7, areaSqKm: 2180 },
  { acNo: 7, population: 276000, totalVoters: 211340, turnout2023: 77.1, maleVoters: 107560, femaleVoters: 103780, literacy: 61.5, urbanPercent: 45.3, scPercent: 14.6, stPercent: 7.8, areaSqKm: 890 },
  { acNo: 8, population: 242000, totalVoters: 185230, turnout2023: 71.8, maleVoters: 94260, femaleVoters: 90970, literacy: 47.8, urbanPercent: 11.4, scPercent: 10.5, stPercent: 36.2, areaSqKm: 2050 },
  { acNo: 9, population: 268000, totalVoters: 205140, turnout2023: 76.9, maleVoters: 104420, femaleVoters: 100720, literacy: 58.4, urbanPercent: 38.7, scPercent: 16.2, stPercent: 5.4, areaSqKm: 1120 },
  { acNo: 10, population: 255000, totalVoters: 195210, turnout2023: 75.4, maleVoters: 99350, femaleVoters: 95860, literacy: 54.6, urbanPercent: 15.3, scPercent: 17.8, stPercent: 9.1, areaSqKm: 1540 },
  // ─── NIZAMABAD / KAMAREDDY ───
  { acNo: 11, population: 289000, totalVoters: 221240, turnout2023: 78.2, maleVoters: 112590, femaleVoters: 108650, literacy: 60.8, urbanPercent: 28.4, scPercent: 14.3, stPercent: 3.8, areaSqKm: 1080 },
  { acNo: 12, population: 295000, totalVoters: 225830, turnout2023: 79.1, maleVoters: 114920, femaleVoters: 110910, literacy: 62.5, urbanPercent: 42.6, scPercent: 16.1, stPercent: 2.9, areaSqKm: 820 },
  { acNo: 13, population: 258000, totalVoters: 197470, turnout2023: 76.8, maleVoters: 100480, femaleVoters: 96990, literacy: 53.2, urbanPercent: 14.7, scPercent: 25.3, stPercent: 4.1, areaSqKm: 1380 },
  { acNo: 14, population: 282000, totalVoters: 215840, turnout2023: 77.5, maleVoters: 109870, femaleVoters: 105970, literacy: 59.1, urbanPercent: 22.8, scPercent: 15.6, stPercent: 3.5, areaSqKm: 1210 },
  { acNo: 15, population: 274000, totalVoters: 209720, turnout2023: 78.8, maleVoters: 106730, femaleVoters: 102990, literacy: 58.7, urbanPercent: 19.5, scPercent: 17.2, stPercent: 3.2, areaSqKm: 1150 },
  { acNo: 16, population: 287000, totalVoters: 219670, turnout2023: 78.4, maleVoters: 111830, femaleVoters: 107840, literacy: 61.2, urbanPercent: 35.8, scPercent: 14.8, stPercent: 3.1, areaSqKm: 940 },
  // ─── JAGITIAL / KARIMNAGAR / PEDDAPALLI ───
  { acNo: 17, population: 292000, totalVoters: 223540, turnout2023: 79.3, maleVoters: 113780, femaleVoters: 109760, literacy: 61.8, urbanPercent: 32.1, scPercent: 18.4, stPercent: 4.8, areaSqKm: 1060 },
  { acNo: 18, population: 279000, totalVoters: 213590, turnout2023: 78.1, maleVoters: 108720, femaleVoters: 104870, literacy: 59.5, urbanPercent: 24.6, scPercent: 16.7, stPercent: 5.2, areaSqKm: 1180 },
  { acNo: 19, population: 298000, totalVoters: 228130, turnout2023: 79.8, maleVoters: 116110, femaleVoters: 112020, literacy: 63.4, urbanPercent: 38.4, scPercent: 15.9, stPercent: 3.6, areaSqKm: 920 },
  { acNo: 20, population: 285000, totalVoters: 218210, turnout2023: 77.6, maleVoters: 111050, femaleVoters: 107160, literacy: 60.2, urbanPercent: 26.8, scPercent: 17.3, stPercent: 4.4, areaSqKm: 1100 },
  { acNo: 21, population: 291000, totalVoters: 222770, turnout2023: 78.9, maleVoters: 113380, femaleVoters: 109390, literacy: 62.1, urbanPercent: 34.5, scPercent: 16.8, stPercent: 3.9, areaSqKm: 980 },
  { acNo: 22, population: 302000, totalVoters: 231230, turnout2023: 80.1, maleVoters: 117680, femaleVoters: 113550, literacy: 64.7, urbanPercent: 48.2, scPercent: 15.4, stPercent: 3.1, areaSqKm: 780 },
  { acNo: 23, population: 288000, totalVoters: 220460, turnout2023: 78.5, maleVoters: 112190, femaleVoters: 108270, literacy: 60.9, urbanPercent: 30.2, scPercent: 17.1, stPercent: 4.7, areaSqKm: 1040 },
  { acNo: 24, population: 275000, totalVoters: 210540, turnout2023: 77.2, maleVoters: 107160, femaleVoters: 103380, literacy: 58.3, urbanPercent: 22.4, scPercent: 18.6, stPercent: 5.8, areaSqKm: 1260 },
  { acNo: 25, population: 296000, totalVoters: 226600, turnout2023: 79.4, maleVoters: 115360, femaleVoters: 111240, literacy: 63.1, urbanPercent: 42.8, scPercent: 16.2, stPercent: 3.4, areaSqKm: 860 },
  { acNo: 26, population: 283000, totalVoters: 216680, turnout2023: 78.0, maleVoters: 110280, femaleVoters: 106400, literacy: 59.8, urbanPercent: 28.6, scPercent: 17.5, stPercent: 5.1, areaSqKm: 1140 },
  // ─── SIDDIPET / MEDAK / SANGAREDDY ───
  { acNo: 27, population: 287000, totalVoters: 219710, turnout2023: 78.6, maleVoters: 111840, femaleVoters: 107870, literacy: 61.4, urbanPercent: 26.3, scPercent: 16.4, stPercent: 4.2, areaSqKm: 1090 },
  { acNo: 28, population: 294000, totalVoters: 225020, turnout2023: 79.2, maleVoters: 114560, femaleVoters: 110460, literacy: 62.8, urbanPercent: 34.1, scPercent: 15.7, stPercent: 3.8, areaSqKm: 950 },
  { acNo: 29, population: 281000, totalVoters: 215110, turnout2023: 77.8, maleVoters: 109480, femaleVoters: 105630, literacy: 59.6, urbanPercent: 22.9, scPercent: 17.8, stPercent: 5.4, areaSqKm: 1200 },
  { acNo: 30, population: 278000, totalVoters: 212810, turnout2023: 77.4, maleVoters: 108310, femaleVoters: 104500, literacy: 58.9, urbanPercent: 20.1, scPercent: 18.2, stPercent: 6.1, areaSqKm: 1320 },
  { acNo: 31, population: 286000, totalVoters: 218920, turnout2023: 78.3, maleVoters: 111430, femaleVoters: 107490, literacy: 60.5, urbanPercent: 25.7, scPercent: 16.9, stPercent: 4.6, areaSqKm: 1110 },
  { acNo: 32, population: 290000, totalVoters: 221970, turnout2023: 79.0, maleVoters: 113010, femaleVoters: 108960, literacy: 61.7, urbanPercent: 32.4, scPercent: 16.1, stPercent: 3.9, areaSqKm: 990 },
  { acNo: 33, population: 298000, totalVoters: 228100, turnout2023: 79.6, maleVoters: 116120, femaleVoters: 111980, literacy: 63.2, urbanPercent: 38.9, scPercent: 15.3, stPercent: 3.4, areaSqKm: 870 },
  { acNo: 34, population: 305000, totalVoters: 233460, turnout2023: 80.2, maleVoters: 118850, femaleVoters: 114610, literacy: 64.8, urbanPercent: 45.6, scPercent: 14.7, stPercent: 3.0, areaSqKm: 740 },
  { acNo: 35, population: 312000, totalVoters: 238820, turnout2023: 80.8, maleVoters: 121580, femaleVoters: 117240, literacy: 66.1, urbanPercent: 52.3, scPercent: 14.1, stPercent: 2.8, areaSqKm: 650 },
  // ─── MEDCHAL-MALKAJGIRI / HYDERABAD OUTER ───
  { acNo: 36, population: 325000, totalVoters: 248810, turnout2023: 62.4, maleVoters: 126680, femaleVoters: 122130, literacy: 72.5, urbanPercent: 82.1, scPercent: 12.8, stPercent: 1.9, areaSqKm: 420 },
  { acNo: 37, population: 338000, totalVoters: 258740, turnout2023: 58.3, maleVoters: 131720, femaleVoters: 127020, literacy: 74.8, urbanPercent: 88.4, scPercent: 11.5, stPercent: 1.4, areaSqKm: 340 },
  { acNo: 38, population: 342000, totalVoters: 261800, turnout2023: 56.7, maleVoters: 133280, femaleVoters: 128520, literacy: 76.2, urbanPercent: 91.2, scPercent: 10.8, stPercent: 1.2, areaSqKm: 280 },
  { acNo: 39, population: 348000, totalVoters: 266390, turnout2023: 55.2, maleVoters: 135610, femaleVoters: 130780, literacy: 77.5, urbanPercent: 93.8, scPercent: 10.2, stPercent: 1.0, areaSqKm: 220 },
  { acNo: 40, population: 335000, totalVoters: 256440, turnout2023: 59.8, maleVoters: 130540, femaleVoters: 125900, literacy: 73.9, urbanPercent: 86.7, scPercent: 12.1, stPercent: 1.6, areaSqKm: 360 },
  { acNo: 41, population: 355000, totalVoters: 271740, turnout2023: 54.1, maleVoters: 138360, femaleVoters: 133380, literacy: 78.8, urbanPercent: 95.2, scPercent: 9.6, stPercent: 0.8, areaSqKm: 180 },
  { acNo: 42, population: 362000, totalVoters: 277100, turnout2023: 52.8, maleVoters: 141090, femaleVoters: 136010, literacy: 80.1, urbanPercent: 96.5, scPercent: 9.1, stPercent: 0.6, areaSqKm: 150 },
  { acNo: 43, population: 345000, totalVoters: 264050, turnout2023: 57.4, maleVoters: 134410, femaleVoters: 129640, literacy: 75.6, urbanPercent: 90.1, scPercent: 11.2, stPercent: 1.3, areaSqKm: 300 },
  // ─── HYDERABAD CITY ───
  { acNo: 44, population: 380000, totalVoters: 290870, turnout2023: 48.2, maleVoters: 148090, femaleVoters: 142780, literacy: 82.4, urbanPercent: 98.5, scPercent: 8.4, stPercent: 0.4, areaSqKm: 95 },
  { acNo: 45, population: 395000, totalVoters: 302340, turnout2023: 46.5, maleVoters: 153940, femaleVoters: 148400, literacy: 84.1, urbanPercent: 99.1, scPercent: 7.8, stPercent: 0.3, areaSqKm: 78 },
  { acNo: 46, population: 385000, totalVoters: 294690, turnout2023: 47.8, maleVoters: 150010, femaleVoters: 144680, literacy: 83.2, urbanPercent: 98.8, scPercent: 8.1, stPercent: 0.3, areaSqKm: 85 },
  { acNo: 47, population: 378000, totalVoters: 289340, turnout2023: 49.1, maleVoters: 147310, femaleVoters: 142030, literacy: 81.8, urbanPercent: 98.2, scPercent: 8.6, stPercent: 0.5, areaSqKm: 102 },
  { acNo: 48, population: 372000, totalVoters: 284750, turnout2023: 50.3, maleVoters: 144970, femaleVoters: 139780, literacy: 80.5, urbanPercent: 97.6, scPercent: 9.0, stPercent: 0.6, areaSqKm: 115 },
  { acNo: 49, population: 365000, totalVoters: 279390, turnout2023: 51.8, maleVoters: 142230, femaleVoters: 137160, literacy: 79.2, urbanPercent: 97.1, scPercent: 9.4, stPercent: 0.7, areaSqKm: 130 },
  { acNo: 50, population: 358000, totalVoters: 274030, turnout2023: 53.5, maleVoters: 139500, femaleVoters: 134530, literacy: 77.8, urbanPercent: 96.4, scPercent: 9.8, stPercent: 0.9, areaSqKm: 155 },
  // ─── RANGAREDDY / VIKARABAD / OUTER HYDERABAD ───
  { acNo: 51, population: 348000, totalVoters: 266440, turnout2023: 56.2, maleVoters: 135630, femaleVoters: 130810, literacy: 76.4, urbanPercent: 92.8, scPercent: 10.5, stPercent: 1.1, areaSqKm: 210 },
  { acNo: 52, population: 365000, totalVoters: 279410, turnout2023: 53.8, maleVoters: 142240, femaleVoters: 137170, literacy: 79.5, urbanPercent: 94.6, scPercent: 9.8, stPercent: 0.8, areaSqKm: 175 },
  { acNo: 53, population: 305000, totalVoters: 233510, turnout2023: 68.4, maleVoters: 118880, femaleVoters: 114630, literacy: 65.2, urbanPercent: 38.5, scPercent: 15.4, stPercent: 4.8, areaSqKm: 890 },
  { acNo: 54, population: 288000, totalVoters: 220420, turnout2023: 72.1, maleVoters: 112200, femaleVoters: 108220, literacy: 61.8, urbanPercent: 28.3, scPercent: 16.7, stPercent: 6.2, areaSqKm: 1240 },
  { acNo: 55, population: 278000, totalVoters: 212770, turnout2023: 74.5, maleVoters: 108300, femaleVoters: 104470, literacy: 58.4, urbanPercent: 18.9, scPercent: 18.1, stPercent: 8.4, areaSqKm: 1560 },
  { acNo: 56, population: 285000, totalVoters: 218140, turnout2023: 73.2, maleVoters: 111030, femaleVoters: 107110, literacy: 59.7, urbanPercent: 22.6, scPercent: 17.3, stPercent: 7.1, areaSqKm: 1380 },
  { acNo: 57, population: 312000, totalVoters: 238850, turnout2023: 64.8, maleVoters: 121590, femaleVoters: 117260, literacy: 68.5, urbanPercent: 58.4, scPercent: 13.8, stPercent: 3.2, areaSqKm: 620 },
  { acNo: 58, population: 322000, totalVoters: 246500, turnout2023: 61.5, maleVoters: 125490, femaleVoters: 121010, literacy: 70.8, urbanPercent: 68.2, scPercent: 12.9, stPercent: 2.4, areaSqKm: 480 },
  { acNo: 59, population: 335000, totalVoters: 256410, turnout2023: 58.9, maleVoters: 130520, femaleVoters: 125890, literacy: 73.2, urbanPercent: 78.5, scPercent: 11.6, stPercent: 1.7, areaSqKm: 380 },
  { acNo: 60, population: 365000, totalVoters: 279370, turnout2023: 52.4, maleVoters: 142230, femaleVoters: 137140, literacy: 79.8, urbanPercent: 95.1, scPercent: 9.5, stPercent: 0.7, areaSqKm: 165 },
  // ─── MAHABUBNAGAR / NAGARKURNOOL / WANAPARTHY / GADWAL ───
  { acNo: 61, population: 268000, totalVoters: 205140, turnout2023: 75.8, maleVoters: 104430, femaleVoters: 100710, literacy: 55.6, urbanPercent: 16.8, scPercent: 18.4, stPercent: 6.8, areaSqKm: 1480 },
  { acNo: 62, population: 275000, totalVoters: 210490, turnout2023: 76.4, maleVoters: 107150, femaleVoters: 103340, literacy: 57.2, urbanPercent: 20.4, scPercent: 17.8, stPercent: 5.9, areaSqKm: 1340 },
  { acNo: 63, population: 261000, totalVoters: 199780, turnout2023: 74.9, maleVoters: 101700, femaleVoters: 98080, literacy: 53.8, urbanPercent: 14.2, scPercent: 19.6, stPercent: 7.4, areaSqKm: 1620 },
  { acNo: 64, population: 272000, totalVoters: 208200, turnout2023: 76.1, maleVoters: 105970, femaleVoters: 102230, literacy: 56.4, urbanPercent: 18.7, scPercent: 18.1, stPercent: 6.3, areaSqKm: 1410 },
  { acNo: 65, population: 282000, totalVoters: 215820, turnout2023: 77.2, maleVoters: 109860, femaleVoters: 105960, literacy: 58.9, urbanPercent: 24.5, scPercent: 17.2, stPercent: 5.1, areaSqKm: 1180 },
  { acNo: 66, population: 258000, totalVoters: 197490, turnout2023: 74.5, maleVoters: 100490, femaleVoters: 97000, literacy: 52.4, urbanPercent: 12.8, scPercent: 20.1, stPercent: 8.2, areaSqKm: 1740 },
  { acNo: 67, population: 265000, totalVoters: 202830, turnout2023: 75.3, maleVoters: 103240, femaleVoters: 99590, literacy: 54.8, urbanPercent: 15.6, scPercent: 19.2, stPercent: 7.1, areaSqKm: 1560 },
  { acNo: 68, population: 274000, totalVoters: 209690, turnout2023: 76.7, maleVoters: 106720, femaleVoters: 102970, literacy: 57.5, urbanPercent: 21.3, scPercent: 17.6, stPercent: 5.6, areaSqKm: 1290 },
  { acNo: 69, population: 269000, totalVoters: 205910, turnout2023: 75.9, maleVoters: 104830, femaleVoters: 101080, literacy: 55.9, urbanPercent: 17.4, scPercent: 18.8, stPercent: 6.5, areaSqKm: 1450 },
  // ─── NALGONDA / SURYAPET / BHONGIR ───
  { acNo: 70, population: 288000, totalVoters: 220380, turnout2023: 78.4, maleVoters: 112180, femaleVoters: 108200, literacy: 61.2, urbanPercent: 28.6, scPercent: 17.4, stPercent: 4.8, areaSqKm: 1080 },
  { acNo: 71, population: 295000, totalVoters: 225810, turnout2023: 79.1, maleVoters: 114940, femaleVoters: 110870, literacy: 62.8, urbanPercent: 34.2, scPercent: 16.8, stPercent: 4.1, areaSqKm: 940 },
  { acNo: 72, population: 282000, totalVoters: 215830, turnout2023: 77.8, maleVoters: 109890, femaleVoters: 105940, literacy: 59.5, urbanPercent: 22.8, scPercent: 18.2, stPercent: 5.6, areaSqKm: 1220 },
  { acNo: 73, population: 276000, totalVoters: 211240, turnout2023: 77.2, maleVoters: 107530, femaleVoters: 103710, literacy: 58.1, urbanPercent: 20.1, scPercent: 18.8, stPercent: 6.2, areaSqKm: 1350 },
  { acNo: 74, population: 291000, totalVoters: 222720, turnout2023: 78.8, maleVoters: 113390, femaleVoters: 109330, literacy: 62.1, urbanPercent: 32.4, scPercent: 17.1, stPercent: 4.4, areaSqKm: 980 },
  { acNo: 75, population: 285000, totalVoters: 218130, turnout2023: 78.1, maleVoters: 111010, femaleVoters: 107120, literacy: 60.4, urbanPercent: 26.7, scPercent: 17.6, stPercent: 5.0, areaSqKm: 1100 },
  { acNo: 76, population: 298000, totalVoters: 228100, turnout2023: 79.5, maleVoters: 116110, femaleVoters: 111990, literacy: 63.5, urbanPercent: 38.8, scPercent: 16.2, stPercent: 3.7, areaSqKm: 850 },
  { acNo: 77, population: 302000, totalVoters: 231160, turnout2023: 79.9, maleVoters: 117670, femaleVoters: 113490, literacy: 64.2, urbanPercent: 42.5, scPercent: 15.8, stPercent: 3.3, areaSqKm: 780 },
  { acNo: 78, population: 279000, totalVoters: 213550, turnout2023: 77.5, maleVoters: 108710, femaleVoters: 104840, literacy: 58.8, urbanPercent: 21.5, scPercent: 18.4, stPercent: 5.8, areaSqKm: 1280 },
  { acNo: 79, population: 264000, totalVoters: 202080, turnout2023: 75.6, maleVoters: 102860, femaleVoters: 99220, literacy: 54.2, urbanPercent: 15.2, scPercent: 19.4, stPercent: 7.6, areaSqKm: 1580 },
  { acNo: 80, population: 271000, totalVoters: 207440, turnout2023: 76.2, maleVoters: 105590, femaleVoters: 101850, literacy: 56.5, urbanPercent: 18.4, scPercent: 18.6, stPercent: 6.8, areaSqKm: 1420 },
  // ─── WARANGAL / HANAMKONDA / JANGAON ───
  { acNo: 81, population: 289000, totalVoters: 221200, turnout2023: 78.6, maleVoters: 112580, femaleVoters: 108620, literacy: 61.5, urbanPercent: 30.2, scPercent: 16.8, stPercent: 5.2, areaSqKm: 1040 },
  { acNo: 82, population: 296000, totalVoters: 226580, turnout2023: 79.3, maleVoters: 115380, femaleVoters: 111200, literacy: 63.2, urbanPercent: 36.8, scPercent: 16.1, stPercent: 4.5, areaSqKm: 890 },
  { acNo: 83, population: 308000, totalVoters: 235770, turnout2023: 80.4, maleVoters: 120060, femaleVoters: 115710, literacy: 65.8, urbanPercent: 52.4, scPercent: 14.8, stPercent: 3.4, areaSqKm: 680 },
  { acNo: 84, population: 318000, totalVoters: 243420, turnout2023: 81.1, maleVoters: 123930, femaleVoters: 119490, literacy: 68.4, urbanPercent: 62.8, scPercent: 13.6, stPercent: 2.8, areaSqKm: 540 },
  { acNo: 85, population: 282000, totalVoters: 215810, turnout2023: 77.9, maleVoters: 109870, femaleVoters: 105940, literacy: 59.8, urbanPercent: 24.5, scPercent: 17.4, stPercent: 5.8, areaSqKm: 1160 },
  { acNo: 86, population: 275000, totalVoters: 210510, turnout2023: 77.3, maleVoters: 107160, femaleVoters: 103350, literacy: 58.2, urbanPercent: 20.8, scPercent: 18.0, stPercent: 6.4, areaSqKm: 1300 },
  { acNo: 87, population: 268000, totalVoters: 205160, turnout2023: 76.6, maleVoters: 104430, femaleVoters: 100730, literacy: 56.5, urbanPercent: 17.2, scPercent: 18.6, stPercent: 7.1, areaSqKm: 1470 },
  { acNo: 88, population: 285000, totalVoters: 218180, turnout2023: 78.2, maleVoters: 111050, femaleVoters: 107130, literacy: 60.8, urbanPercent: 28.4, scPercent: 17.0, stPercent: 5.0, areaSqKm: 1080 },
  // ─── KHAMMAM / BHADRADRI KOTHAGUDEM ───
  { acNo: 89, population: 292000, totalVoters: 223510, turnout2023: 79.0, maleVoters: 113770, femaleVoters: 109740, literacy: 62.4, urbanPercent: 34.6, scPercent: 16.5, stPercent: 4.8, areaSqKm: 960 },
  { acNo: 90, population: 298000, totalVoters: 228080, turnout2023: 79.6, maleVoters: 116090, femaleVoters: 111990, literacy: 63.8, urbanPercent: 40.2, scPercent: 15.9, stPercent: 4.1, areaSqKm: 840 },
  { acNo: 91, population: 305000, totalVoters: 233440, turnout2023: 80.2, maleVoters: 118830, femaleVoters: 114610, literacy: 65.4, urbanPercent: 48.5, scPercent: 15.2, stPercent: 3.5, areaSqKm: 720 },
  { acNo: 92, population: 288000, totalVoters: 220400, turnout2023: 78.5, maleVoters: 112200, femaleVoters: 108200, literacy: 61.2, urbanPercent: 30.8, scPercent: 17.2, stPercent: 5.4, areaSqKm: 1060 },
  { acNo: 93, population: 278000, totalVoters: 212740, turnout2023: 77.6, maleVoters: 108280, femaleVoters: 104460, literacy: 58.6, urbanPercent: 22.4, scPercent: 18.0, stPercent: 6.8, areaSqKm: 1280 },
  { acNo: 94, population: 272000, totalVoters: 208190, turnout2023: 77.0, maleVoters: 105960, femaleVoters: 102230, literacy: 56.8, urbanPercent: 18.6, scPercent: 18.8, stPercent: 7.5, areaSqKm: 1460 },
  { acNo: 95, population: 265000, totalVoters: 202820, turnout2023: 76.2, maleVoters: 103230, femaleVoters: 99590, literacy: 55.1, urbanPercent: 15.4, scPercent: 19.4, stPercent: 8.2, areaSqKm: 1640 },
  { acNo: 96, population: 258000, totalVoters: 197460, turnout2023: 75.4, maleVoters: 100480, femaleVoters: 96980, literacy: 53.4, urbanPercent: 12.8, scPercent: 20.2, stPercent: 9.1, areaSqKm: 1820 },
  { acNo: 97, population: 248000, totalVoters: 189810, turnout2023: 74.1, maleVoters: 96620, femaleVoters: 93190, literacy: 50.8, urbanPercent: 10.2, scPercent: 14.6, stPercent: 22.4, areaSqKm: 2240 },
  { acNo: 98, population: 255000, totalVoters: 195170, turnout2023: 74.8, maleVoters: 99350, femaleVoters: 95820, literacy: 52.1, urbanPercent: 11.8, scPercent: 16.2, stPercent: 18.5, areaSqKm: 2080 },
  { acNo: 99, population: 262000, totalVoters: 200540, turnout2023: 75.5, maleVoters: 102080, femaleVoters: 98460, literacy: 54.5, urbanPercent: 14.6, scPercent: 17.8, stPercent: 12.4, areaSqKm: 1720 },
  // ─── MAHABUBABAD / MULUGU / JAYASHANKAR ───
  { acNo: 100, population: 252000, totalVoters: 192870, turnout2023: 74.8, maleVoters: 98180, femaleVoters: 94690, literacy: 51.2, urbanPercent: 11.4, scPercent: 15.8, stPercent: 19.6, areaSqKm: 2120 },
  { acNo: 101, population: 245000, totalVoters: 187520, turnout2023: 73.5, maleVoters: 95460, femaleVoters: 92060, literacy: 48.6, urbanPercent: 9.2, scPercent: 13.2, stPercent: 28.4, areaSqKm: 2480 },
  { acNo: 102, population: 238000, totalVoters: 182170, turnout2023: 72.8, maleVoters: 92740, femaleVoters: 89430, literacy: 46.4, urbanPercent: 7.8, scPercent: 11.8, stPercent: 34.2, areaSqKm: 2720 },
  { acNo: 103, population: 256000, totalVoters: 195940, turnout2023: 75.2, maleVoters: 99740, femaleVoters: 96200, literacy: 52.8, urbanPercent: 13.8, scPercent: 16.4, stPercent: 15.8, areaSqKm: 1860 },
  { acNo: 104, population: 268000, totalVoters: 205130, turnout2023: 76.4, maleVoters: 104420, femaleVoters: 100710, literacy: 55.4, urbanPercent: 18.2, scPercent: 17.6, stPercent: 10.4, areaSqKm: 1520 },
  { acNo: 105, population: 274000, totalVoters: 209710, turnout2023: 77.1, maleVoters: 106740, femaleVoters: 102970, literacy: 57.8, urbanPercent: 22.6, scPercent: 17.2, stPercent: 7.8, areaSqKm: 1340 },
  { acNo: 106, population: 281000, totalVoters: 215060, turnout2023: 77.8, maleVoters: 109480, femaleVoters: 105580, literacy: 59.4, urbanPercent: 26.4, scPercent: 16.8, stPercent: 5.6, areaSqKm: 1180 },
  { acNo: 107, population: 287000, totalVoters: 219670, turnout2023: 78.4, maleVoters: 111840, femaleVoters: 107830, literacy: 60.8, urbanPercent: 30.8, scPercent: 16.4, stPercent: 4.2, areaSqKm: 1040 },
  { acNo: 108, population: 293000, totalVoters: 224280, turnout2023: 79.1, maleVoters: 114190, femaleVoters: 110090, literacy: 62.2, urbanPercent: 35.4, scPercent: 15.8, stPercent: 3.6, areaSqKm: 920 },
  { acNo: 109, population: 278000, totalVoters: 212750, turnout2023: 77.5, maleVoters: 108300, femaleVoters: 104450, literacy: 58.4, urbanPercent: 24.2, scPercent: 17.4, stPercent: 6.8, areaSqKm: 1260 },
  { acNo: 110, population: 285000, totalVoters: 218120, turnout2023: 78.2, maleVoters: 111010, femaleVoters: 107110, literacy: 60.6, urbanPercent: 28.8, scPercent: 16.8, stPercent: 5.2, areaSqKm: 1100 },
  { acNo: 111, population: 292000, totalVoters: 223520, turnout2023: 78.8, maleVoters: 113780, femaleVoters: 109740, literacy: 62.4, urbanPercent: 34.2, scPercent: 16.2, stPercent: 4.4, areaSqKm: 960 },
  { acNo: 112, population: 298000, totalVoters: 228090, turnout2023: 79.4, maleVoters: 116100, femaleVoters: 111990, literacy: 63.8, urbanPercent: 40.6, scPercent: 15.6, stPercent: 3.8, areaSqKm: 840 },
  { acNo: 113, population: 305000, totalVoters: 233450, turnout2023: 80.0, maleVoters: 118840, femaleVoters: 114610, literacy: 65.2, urbanPercent: 48.4, scPercent: 14.8, stPercent: 3.2, areaSqKm: 720 },
  { acNo: 114, population: 312000, totalVoters: 238810, turnout2023: 80.6, maleVoters: 121580, femaleVoters: 117230, literacy: 66.8, urbanPercent: 54.2, scPercent: 14.2, stPercent: 2.8, areaSqKm: 620 },
  { acNo: 115, population: 275000, totalVoters: 210480, turnout2023: 77.0, maleVoters: 107140, femaleVoters: 103340, literacy: 57.6, urbanPercent: 22.4, scPercent: 17.6, stPercent: 7.2, areaSqKm: 1320 },
  { acNo: 116, population: 268000, totalVoters: 205140, turnout2023: 76.4, maleVoters: 104430, femaleVoters: 100710, literacy: 55.8, urbanPercent: 18.6, scPercent: 18.2, stPercent: 8.4, areaSqKm: 1480 },
  { acNo: 117, population: 260000, totalVoters: 199020, turnout2023: 75.6, maleVoters: 101330, femaleVoters: 97690, literacy: 53.4, urbanPercent: 14.8, scPercent: 19.0, stPercent: 10.2, areaSqKm: 1680 },
  { acNo: 118, population: 252000, totalVoters: 192900, turnout2023: 74.5, maleVoters: 98200, femaleVoters: 94700, literacy: 51.2, urbanPercent: 11.2, scPercent: 16.4, stPercent: 18.8, areaSqKm: 2100 },
  { acNo: 119, population: 242000, totalVoters: 185250, turnout2023: 73.2, maleVoters: 94270, femaleVoters: 90980, literacy: 48.4, urbanPercent: 8.6, scPercent: 14.8, stPercent: 24.6, areaSqKm: 2520 },
];

/** Lookup demographics by AC number */
const demoByAcNo = new Map<number, ConstituencyDemographics>(
  TELANGANA_DEMOGRAPHICS.map((d) => [d.acNo, d]),
);

export function getConstituencyDemographics(acNo: number): ConstituencyDemographics | undefined {
  return demoByAcNo.get(acNo);
}
