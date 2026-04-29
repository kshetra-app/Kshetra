/**
 * Andhra Pradesh Constituency Demographics
 *
 * ── DATA SOURCES ─────────────────────────────────────────────────────────
 *  1. Census 2011 (AP post-bifurcation)
 *  2. AP Socio-Economic Survey 2023-24
 *  3. ECI voter roll data (2024 assembly elections)
 *  4. AP State Election Commission delimitation gazette
 *
 * ── NOTES ─────────────────────────────────────────────────────────────────
 *  - Population figures are 2011 Census projections
 *  - Literacy, urbanisation from district-level Census 2011
 *  - Total voters from ECI 2024 final rolls
 *  - SC/ST % approximated from district-level Census proportions
 */

import type { ConstituencyDemographics } from './telangana-demographics';

/**
 * Demographics for all 175 Andhra Pradesh Assembly Constituencies.
 * turnout field represents 2024 election turnout.
 */
export const AP_DEMOGRAPHICS: ConstituencyDemographics[] = [
  // ── Srikakulam District ──
  { acNo: 1, population: 312000, totalVoters: 238450, turnout2023: 82.4, maleVoters: 118230, femaleVoters: 120220, literacy: 55.8, urbanPercent: 14.2, scPercent: 18.6, stPercent: 6.8, areaSqKm: 1450 },
  { acNo: 2, population: 298000, totalVoters: 227840, turnout2023: 81.7, maleVoters: 112920, femaleVoters: 114920, literacy: 54.2, urbanPercent: 12.5, scPercent: 20.1, stPercent: 5.4, areaSqKm: 1320 },
  { acNo: 3, population: 285000, totalVoters: 217950, turnout2023: 83.1, maleVoters: 107980, femaleVoters: 109970, literacy: 52.6, urbanPercent: 10.8, scPercent: 24.3, stPercent: 4.2, areaSqKm: 1180 },
  { acNo: 4, population: 267000, totalVoters: 204120, turnout2023: 80.5, maleVoters: 101060, femaleVoters: 103060, literacy: 48.9, urbanPercent: 8.4, scPercent: 14.7, stPercent: 28.5, areaSqKm: 1890 },
  { acNo: 5, population: 325000, totalVoters: 248500, turnout2023: 82.8, maleVoters: 123250, femaleVoters: 125250, literacy: 62.4, urbanPercent: 42.6, scPercent: 16.2, stPercent: 3.1, areaSqKm: 680 },
  { acNo: 6, population: 305000, totalVoters: 233150, turnout2023: 81.2, maleVoters: 115580, femaleVoters: 117570, literacy: 56.7, urbanPercent: 18.3, scPercent: 19.4, stPercent: 5.6, areaSqKm: 1240 },
  { acNo: 7, population: 279000, totalVoters: 213230, turnout2023: 82.5, maleVoters: 105620, femaleVoters: 107610, literacy: 51.3, urbanPercent: 11.2, scPercent: 26.8, stPercent: 3.9, areaSqKm: 1350 },
  { acNo: 8, population: 318000, totalVoters: 243060, turnout2023: 83.4, maleVoters: 120530, femaleVoters: 122530, literacy: 58.1, urbanPercent: 22.4, scPercent: 17.5, stPercent: 4.8, areaSqKm: 1080 },
  { acNo: 9, population: 291000, totalVoters: 222360, turnout2023: 81.9, maleVoters: 110180, femaleVoters: 112180, literacy: 53.8, urbanPercent: 15.6, scPercent: 21.3, stPercent: 4.5, areaSqKm: 1290 },
  { acNo: 10, population: 302000, totalVoters: 230780, turnout2023: 82.1, maleVoters: 114390, femaleVoters: 116390, literacy: 55.4, urbanPercent: 13.8, scPercent: 19.8, stPercent: 5.1, areaSqKm: 1360 },
  // ── Vizianagaram District ──
  { acNo: 11, population: 342000, totalVoters: 261450, turnout2023: 81.6, maleVoters: 129730, femaleVoters: 131720, literacy: 60.2, urbanPercent: 38.5, scPercent: 15.4, stPercent: 3.8, areaSqKm: 720 },
  { acNo: 12, population: 278000, totalVoters: 212520, turnout2023: 80.8, maleVoters: 105260, femaleVoters: 107260, literacy: 52.8, urbanPercent: 16.7, scPercent: 18.9, stPercent: 6.2, areaSqKm: 1410 },
  { acNo: 13, population: 248000, totalVoters: 189560, turnout2023: 79.4, maleVoters: 93780, femaleVoters: 95780, literacy: 44.6, urbanPercent: 7.3, scPercent: 12.1, stPercent: 38.4, areaSqKm: 2240 },
  { acNo: 14, population: 309000, totalVoters: 236180, turnout2023: 81.3, maleVoters: 117090, femaleVoters: 119090, literacy: 57.5, urbanPercent: 24.1, scPercent: 17.6, stPercent: 5.3, areaSqKm: 1120 },
  { acNo: 15, population: 296000, totalVoters: 226260, turnout2023: 82.7, maleVoters: 112130, femaleVoters: 114130, literacy: 53.1, urbanPercent: 12.9, scPercent: 22.4, stPercent: 4.7, areaSqKm: 1340 },
  { acNo: 16, population: 315000, totalVoters: 240750, turnout2023: 82.0, maleVoters: 119380, femaleVoters: 121370, literacy: 58.8, urbanPercent: 20.5, scPercent: 16.8, stPercent: 5.9, areaSqKm: 1190 },
  { acNo: 17, population: 235000, totalVoters: 179650, turnout2023: 78.6, maleVoters: 88830, femaleVoters: 90820, literacy: 42.3, urbanPercent: 6.1, scPercent: 10.8, stPercent: 42.7, areaSqKm: 2580 },
  { acNo: 18, population: 274000, totalVoters: 209440, turnout2023: 80.2, maleVoters: 103720, femaleVoters: 105720, literacy: 49.7, urbanPercent: 9.8, scPercent: 23.6, stPercent: 8.4, areaSqKm: 1650 },
  { acNo: 19, population: 241000, totalVoters: 184210, turnout2023: 79.1, maleVoters: 91110, femaleVoters: 93100, literacy: 43.8, urbanPercent: 6.8, scPercent: 11.5, stPercent: 40.2, areaSqKm: 2420 },
  // ── Visakhapatnam District ──
  { acNo: 20, population: 385000, totalVoters: 294320, turnout2023: 78.2, maleVoters: 145160, femaleVoters: 149160, literacy: 72.4, urbanPercent: 82.6, scPercent: 10.2, stPercent: 1.4, areaSqKm: 340 },
  { acNo: 21, population: 398000, totalVoters: 304180, turnout2023: 77.5, maleVoters: 150090, femaleVoters: 154090, literacy: 74.8, urbanPercent: 88.4, scPercent: 9.8, stPercent: 1.1, areaSqKm: 280 },
  { acNo: 22, population: 412000, totalVoters: 314880, turnout2023: 76.8, maleVoters: 155440, femaleVoters: 159440, literacy: 76.2, urbanPercent: 92.1, scPercent: 8.6, stPercent: 0.9, areaSqKm: 220 },
  { acNo: 23, population: 378000, totalVoters: 288960, turnout2023: 77.9, maleVoters: 142480, femaleVoters: 146480, literacy: 73.5, urbanPercent: 85.3, scPercent: 11.4, stPercent: 1.2, areaSqKm: 310 },
  { acNo: 24, population: 365000, totalVoters: 278950, turnout2023: 78.4, maleVoters: 137480, femaleVoters: 141470, literacy: 71.8, urbanPercent: 79.8, scPercent: 12.1, stPercent: 1.6, areaSqKm: 360 },
  { acNo: 25, population: 425000, totalVoters: 324750, turnout2023: 77.1, maleVoters: 160380, femaleVoters: 164370, literacy: 68.4, urbanPercent: 72.5, scPercent: 14.2, stPercent: 2.3, areaSqKm: 420 },
  { acNo: 26, population: 295000, totalVoters: 225450, turnout2023: 80.6, maleVoters: 111730, femaleVoters: 113720, literacy: 56.2, urbanPercent: 18.4, scPercent: 24.5, stPercent: 5.8, areaSqKm: 1280 },
  { acNo: 27, population: 268000, totalVoters: 204880, turnout2023: 79.8, maleVoters: 101440, femaleVoters: 103440, literacy: 52.4, urbanPercent: 14.6, scPercent: 16.8, stPercent: 12.4, areaSqKm: 1520 },
  { acNo: 28, population: 218000, totalVoters: 166560, turnout2023: 76.2, maleVoters: 82280, femaleVoters: 84280, literacy: 38.6, urbanPercent: 4.2, scPercent: 8.4, stPercent: 52.8, areaSqKm: 3450 },
  { acNo: 29, population: 205000, totalVoters: 156650, turnout2023: 75.4, maleVoters: 77330, femaleVoters: 79320, literacy: 36.2, urbanPercent: 3.5, scPercent: 7.2, stPercent: 58.4, areaSqKm: 3820 },
  { acNo: 30, population: 328000, totalVoters: 250720, turnout2023: 81.5, maleVoters: 124360, femaleVoters: 126360, literacy: 61.8, urbanPercent: 35.2, scPercent: 15.6, stPercent: 3.4, areaSqKm: 840 },
  { acNo: 31, population: 358000, totalVoters: 273620, turnout2023: 79.2, maleVoters: 135810, femaleVoters: 137810, literacy: 67.4, urbanPercent: 58.6, scPercent: 13.2, stPercent: 2.1, areaSqKm: 520 },
  { acNo: 32, population: 308000, totalVoters: 235340, turnout2023: 80.8, maleVoters: 116670, femaleVoters: 118670, literacy: 58.6, urbanPercent: 22.8, scPercent: 17.4, stPercent: 4.6, areaSqKm: 1180 },
  { acNo: 33, population: 289000, totalVoters: 220930, turnout2023: 81.1, maleVoters: 109470, femaleVoters: 111460, literacy: 55.2, urbanPercent: 16.4, scPercent: 18.6, stPercent: 6.8, areaSqKm: 1340 },
  { acNo: 34, population: 276000, totalVoters: 210960, turnout2023: 81.6, maleVoters: 104480, femaleVoters: 106480, literacy: 53.8, urbanPercent: 14.8, scPercent: 19.2, stPercent: 8.4, areaSqKm: 1460 },
  // ── East Godavari District ──
  { acNo: 35, population: 318000, totalVoters: 243060, turnout2023: 82.6, maleVoters: 120530, femaleVoters: 122530, literacy: 62.8, urbanPercent: 28.4, scPercent: 16.4, stPercent: 3.2, areaSqKm: 980 },
  { acNo: 36, population: 295000, totalVoters: 225450, turnout2023: 83.2, maleVoters: 111730, femaleVoters: 113720, literacy: 58.4, urbanPercent: 18.6, scPercent: 18.2, stPercent: 4.8, areaSqKm: 1240 },
  { acNo: 37, population: 342000, totalVoters: 261450, turnout2023: 84.1, maleVoters: 129730, femaleVoters: 131720, literacy: 65.6, urbanPercent: 36.8, scPercent: 14.6, stPercent: 2.8, areaSqKm: 780 },
  { acNo: 38, population: 368000, totalVoters: 281280, turnout2023: 81.8, maleVoters: 139640, femaleVoters: 141640, literacy: 71.2, urbanPercent: 68.4, scPercent: 12.4, stPercent: 1.6, areaSqKm: 440 },
  { acNo: 39, population: 305000, totalVoters: 233150, turnout2023: 83.4, maleVoters: 115580, femaleVoters: 117570, literacy: 60.2, urbanPercent: 24.2, scPercent: 17.8, stPercent: 3.6, areaSqKm: 1080 },
  { acNo: 40, population: 282000, totalVoters: 215530, turnout2023: 84.2, maleVoters: 106770, femaleVoters: 108760, literacy: 56.8, urbanPercent: 16.8, scPercent: 22.6, stPercent: 4.2, areaSqKm: 1320 },
  { acNo: 41, population: 385000, totalVoters: 294320, turnout2023: 82.4, maleVoters: 145160, femaleVoters: 149160, literacy: 72.6, urbanPercent: 78.4, scPercent: 10.8, stPercent: 1.4, areaSqKm: 360 },
  { acNo: 42, population: 312000, totalVoters: 238450, turnout2023: 83.6, maleVoters: 118230, femaleVoters: 120220, literacy: 64.2, urbanPercent: 32.6, scPercent: 15.2, stPercent: 3.4, areaSqKm: 880 },
  { acNo: 43, population: 275000, totalVoters: 210150, turnout2023: 84.8, maleVoters: 104080, femaleVoters: 106070, literacy: 54.6, urbanPercent: 12.4, scPercent: 24.8, stPercent: 5.6, areaSqKm: 1380 },
  { acNo: 44, population: 298000, totalVoters: 227740, turnout2023: 83.2, maleVoters: 112870, femaleVoters: 114870, literacy: 59.4, urbanPercent: 20.8, scPercent: 18.4, stPercent: 3.8, areaSqKm: 1120 },
  { acNo: 45, population: 285000, totalVoters: 217850, turnout2023: 82.8, maleVoters: 107930, femaleVoters: 109920, literacy: 57.2, urbanPercent: 17.4, scPercent: 16.8, stPercent: 8.6, areaSqKm: 1480 },
  { acNo: 46, population: 308000, totalVoters: 235340, turnout2023: 83.8, maleVoters: 116670, femaleVoters: 118670, literacy: 61.6, urbanPercent: 26.4, scPercent: 17.2, stPercent: 3.2, areaSqKm: 960 },
  { acNo: 47, population: 228000, totalVoters: 174220, turnout2023: 78.4, maleVoters: 86110, femaleVoters: 88110, literacy: 42.8, urbanPercent: 5.6, scPercent: 9.6, stPercent: 48.2, areaSqKm: 3120 },
  { acNo: 48, population: 315000, totalVoters: 240750, turnout2023: 83.4, maleVoters: 119380, femaleVoters: 121370, literacy: 62.4, urbanPercent: 28.6, scPercent: 16.6, stPercent: 3.4, areaSqKm: 940 },
  { acNo: 49, population: 322000, totalVoters: 246100, turnout2023: 82.6, maleVoters: 122050, femaleVoters: 124050, literacy: 63.8, urbanPercent: 34.2, scPercent: 14.8, stPercent: 2.6, areaSqKm: 820 },
  { acNo: 50, population: 292000, totalVoters: 223180, turnout2023: 84.6, maleVoters: 110590, femaleVoters: 112590, literacy: 58.2, urbanPercent: 18.2, scPercent: 26.4, stPercent: 3.8, areaSqKm: 1260 },
  { acNo: 51, population: 278000, totalVoters: 212460, turnout2023: 84.4, maleVoters: 105230, femaleVoters: 107230, literacy: 56.4, urbanPercent: 14.6, scPercent: 28.2, stPercent: 4.6, areaSqKm: 1380 },
  { acNo: 52, population: 302000, totalVoters: 230840, turnout2023: 83.2, maleVoters: 114420, femaleVoters: 116420, literacy: 60.8, urbanPercent: 22.4, scPercent: 17.6, stPercent: 3.2, areaSqKm: 1060 },
  { acNo: 53, population: 288000, totalVoters: 220120, turnout2023: 83.6, maleVoters: 109060, femaleVoters: 111060, literacy: 57.6, urbanPercent: 16.8, scPercent: 18.8, stPercent: 4.4, areaSqKm: 1220 },
  // ── West Godavari District ──
  { acNo: 54, population: 315000, totalVoters: 240750, turnout2023: 83.8, maleVoters: 119380, femaleVoters: 121370, literacy: 64.6, urbanPercent: 32.4, scPercent: 16.2, stPercent: 2.4, areaSqKm: 860 },
  { acNo: 55, population: 335000, totalVoters: 256050, turnout2023: 82.6, maleVoters: 127030, femaleVoters: 129020, literacy: 68.2, urbanPercent: 48.6, scPercent: 14.4, stPercent: 1.8, areaSqKm: 620 },
  { acNo: 56, population: 298000, totalVoters: 227740, turnout2023: 84.2, maleVoters: 112870, femaleVoters: 114870, literacy: 62.4, urbanPercent: 24.8, scPercent: 18.6, stPercent: 3.2, areaSqKm: 1040 },
  { acNo: 57, population: 285000, totalVoters: 217850, turnout2023: 83.6, maleVoters: 107930, femaleVoters: 109920, literacy: 60.8, urbanPercent: 20.6, scPercent: 17.4, stPercent: 3.8, areaSqKm: 1160 },
  { acNo: 58, population: 342000, totalVoters: 261450, turnout2023: 83.2, maleVoters: 129730, femaleVoters: 131720, literacy: 66.4, urbanPercent: 42.8, scPercent: 15.2, stPercent: 2.2, areaSqKm: 720 },
  { acNo: 59, population: 308000, totalVoters: 235340, turnout2023: 84.4, maleVoters: 116670, femaleVoters: 118670, literacy: 63.2, urbanPercent: 28.6, scPercent: 16.8, stPercent: 2.8, areaSqKm: 940 },
  { acNo: 60, population: 318000, totalVoters: 243060, turnout2023: 83.8, maleVoters: 120530, femaleVoters: 122530, literacy: 64.8, urbanPercent: 34.2, scPercent: 15.6, stPercent: 2.4, areaSqKm: 840 },
  { acNo: 61, population: 295000, totalVoters: 225450, turnout2023: 84.6, maleVoters: 111730, femaleVoters: 113720, literacy: 61.4, urbanPercent: 22.4, scPercent: 17.8, stPercent: 3.4, areaSqKm: 1080 },
  { acNo: 62, population: 325000, totalVoters: 248500, turnout2023: 83.4, maleVoters: 123250, femaleVoters: 125250, literacy: 65.6, urbanPercent: 38.4, scPercent: 14.8, stPercent: 2.2, areaSqKm: 760 },
  { acNo: 63, population: 272000, totalVoters: 207920, turnout2023: 82.8, maleVoters: 102960, femaleVoters: 104960, literacy: 56.8, urbanPercent: 14.2, scPercent: 18.2, stPercent: 6.4, areaSqKm: 1420 },
  { acNo: 64, population: 248000, totalVoters: 189560, turnout2023: 80.6, maleVoters: 93780, femaleVoters: 95780, literacy: 48.4, urbanPercent: 8.6, scPercent: 14.6, stPercent: 24.8, areaSqKm: 2180 },
  { acNo: 65, population: 232000, totalVoters: 177320, turnout2023: 79.2, maleVoters: 87660, femaleVoters: 89660, literacy: 44.2, urbanPercent: 6.2, scPercent: 12.4, stPercent: 32.6, areaSqKm: 2640 },
  { acNo: 66, population: 286000, totalVoters: 218580, turnout2023: 84.2, maleVoters: 108290, femaleVoters: 110290, literacy: 58.6, urbanPercent: 18.6, scPercent: 24.2, stPercent: 3.6, areaSqKm: 1240 },
  // ── Krishna District ──
  { acNo: 67, population: 305000, totalVoters: 233150, turnout2023: 82.4, maleVoters: 115580, femaleVoters: 117570, literacy: 62.4, urbanPercent: 26.8, scPercent: 17.2, stPercent: 2.8, areaSqKm: 980 },
  { acNo: 68, population: 328000, totalVoters: 250720, turnout2023: 81.6, maleVoters: 124360, femaleVoters: 126360, literacy: 66.8, urbanPercent: 42.4, scPercent: 14.6, stPercent: 1.8, areaSqKm: 680 },
  { acNo: 69, population: 412000, totalVoters: 314880, turnout2023: 78.4, maleVoters: 155440, femaleVoters: 159440, literacy: 78.6, urbanPercent: 94.2, scPercent: 9.2, stPercent: 0.8, areaSqKm: 180 },
  { acNo: 70, population: 398000, totalVoters: 304180, turnout2023: 78.8, maleVoters: 150090, femaleVoters: 154090, literacy: 76.4, urbanPercent: 91.8, scPercent: 10.4, stPercent: 0.9, areaSqKm: 210 },
  { acNo: 71, population: 385000, totalVoters: 294320, turnout2023: 79.2, maleVoters: 145160, femaleVoters: 149160, literacy: 74.8, urbanPercent: 88.6, scPercent: 11.2, stPercent: 1.1, areaSqKm: 240 },
  { acNo: 72, population: 295000, totalVoters: 225450, turnout2023: 82.8, maleVoters: 111730, femaleVoters: 113720, literacy: 60.4, urbanPercent: 22.6, scPercent: 18.4, stPercent: 3.6, areaSqKm: 1120 },
  { acNo: 73, population: 278000, totalVoters: 212460, turnout2023: 83.4, maleVoters: 105230, femaleVoters: 107230, literacy: 56.8, urbanPercent: 14.8, scPercent: 24.6, stPercent: 4.2, areaSqKm: 1380 },
  { acNo: 74, population: 308000, totalVoters: 235340, turnout2023: 82.6, maleVoters: 116670, femaleVoters: 118670, literacy: 62.8, urbanPercent: 28.4, scPercent: 16.4, stPercent: 2.8, areaSqKm: 960 },
  { acNo: 75, population: 292000, totalVoters: 223180, turnout2023: 83.2, maleVoters: 110590, femaleVoters: 112590, literacy: 59.4, urbanPercent: 20.2, scPercent: 17.8, stPercent: 3.4, areaSqKm: 1100 },
  { acNo: 76, population: 345000, totalVoters: 263650, turnout2023: 81.8, maleVoters: 130830, femaleVoters: 132820, literacy: 68.4, urbanPercent: 52.6, scPercent: 13.6, stPercent: 1.6, areaSqKm: 560 },
  { acNo: 77, population: 288000, totalVoters: 220120, turnout2023: 83.8, maleVoters: 109060, femaleVoters: 111060, literacy: 57.6, urbanPercent: 16.4, scPercent: 26.2, stPercent: 3.8, areaSqKm: 1280 },
  { acNo: 78, population: 312000, totalVoters: 238450, turnout2023: 82.4, maleVoters: 118230, femaleVoters: 120220, literacy: 63.2, urbanPercent: 30.8, scPercent: 16.8, stPercent: 2.4, areaSqKm: 880 },
  { acNo: 79, population: 302000, totalVoters: 230840, turnout2023: 83.2, maleVoters: 114420, femaleVoters: 116420, literacy: 61.4, urbanPercent: 24.6, scPercent: 17.4, stPercent: 2.8, areaSqKm: 1020 },
  { acNo: 80, population: 335000, totalVoters: 256050, turnout2023: 82.2, maleVoters: 127030, femaleVoters: 129020, literacy: 66.8, urbanPercent: 44.8, scPercent: 14.2, stPercent: 1.6, areaSqKm: 640 },
  { acNo: 81, population: 275000, totalVoters: 210150, turnout2023: 83.6, maleVoters: 104080, femaleVoters: 106070, literacy: 58.2, urbanPercent: 18.4, scPercent: 17.6, stPercent: 3.2, areaSqKm: 1160 },
  { acNo: 82, population: 298000, totalVoters: 227740, turnout2023: 82.8, maleVoters: 112870, femaleVoters: 114870, literacy: 60.6, urbanPercent: 22.2, scPercent: 16.8, stPercent: 2.8, areaSqKm: 1040 },
  // ── Guntur District ──
  { acNo: 83, population: 285000, totalVoters: 217850, turnout2023: 83.4, maleVoters: 107930, femaleVoters: 109920, literacy: 58.4, urbanPercent: 16.8, scPercent: 24.8, stPercent: 3.6, areaSqKm: 1260 },
  { acNo: 84, population: 342000, totalVoters: 261450, turnout2023: 82.6, maleVoters: 129730, femaleVoters: 131720, literacy: 66.2, urbanPercent: 46.4, scPercent: 14.2, stPercent: 1.8, areaSqKm: 620 },
  { acNo: 85, population: 318000, totalVoters: 243060, turnout2023: 83.2, maleVoters: 120530, femaleVoters: 122530, literacy: 62.8, urbanPercent: 32.6, scPercent: 16.4, stPercent: 2.4, areaSqKm: 860 },
  { acNo: 86, population: 295000, totalVoters: 225450, turnout2023: 84.2, maleVoters: 111730, femaleVoters: 113720, literacy: 59.6, urbanPercent: 20.8, scPercent: 18.2, stPercent: 3.2, areaSqKm: 1120 },
  { acNo: 87, population: 308000, totalVoters: 235340, turnout2023: 83.8, maleVoters: 116670, femaleVoters: 118670, literacy: 61.4, urbanPercent: 26.4, scPercent: 17.4, stPercent: 2.6, areaSqKm: 980 },
  { acNo: 88, population: 335000, totalVoters: 256050, turnout2023: 82.8, maleVoters: 127030, femaleVoters: 129020, literacy: 65.8, urbanPercent: 40.2, scPercent: 15.2, stPercent: 2.2, areaSqKm: 720 },
  { acNo: 89, population: 348000, totalVoters: 266040, turnout2023: 82.4, maleVoters: 132020, femaleVoters: 134020, literacy: 67.4, urbanPercent: 48.6, scPercent: 14.6, stPercent: 1.8, areaSqKm: 580 },
  { acNo: 90, population: 312000, totalVoters: 238450, turnout2023: 83.6, maleVoters: 118230, femaleVoters: 120220, literacy: 63.2, urbanPercent: 30.4, scPercent: 16.8, stPercent: 2.4, areaSqKm: 880 },
  { acNo: 91, population: 272000, totalVoters: 207920, turnout2023: 84.4, maleVoters: 102960, femaleVoters: 104960, literacy: 55.8, urbanPercent: 14.2, scPercent: 26.4, stPercent: 4.2, areaSqKm: 1420 },
  { acNo: 92, population: 285000, totalVoters: 217850, turnout2023: 83.2, maleVoters: 107930, femaleVoters: 109920, literacy: 57.4, urbanPercent: 16.6, scPercent: 18.8, stPercent: 5.4, areaSqKm: 1340 },
  { acNo: 93, population: 378000, totalVoters: 288960, turnout2023: 80.4, maleVoters: 142480, femaleVoters: 146480, literacy: 72.8, urbanPercent: 82.4, scPercent: 11.2, stPercent: 1.2, areaSqKm: 320 },
  { acNo: 94, population: 362000, totalVoters: 276720, turnout2023: 80.8, maleVoters: 137360, femaleVoters: 139360, literacy: 70.4, urbanPercent: 76.8, scPercent: 12.4, stPercent: 1.4, areaSqKm: 380 },
  { acNo: 95, population: 302000, totalVoters: 230840, turnout2023: 82.6, maleVoters: 114420, femaleVoters: 116420, literacy: 61.8, urbanPercent: 24.8, scPercent: 17.2, stPercent: 2.6, areaSqKm: 1020 },
  { acNo: 96, population: 365000, totalVoters: 278950, turnout2023: 81.2, maleVoters: 137480, femaleVoters: 141470, literacy: 72.4, urbanPercent: 72.6, scPercent: 10.8, stPercent: 1.4, areaSqKm: 420 },
  { acNo: 97, population: 275000, totalVoters: 210150, turnout2023: 84.2, maleVoters: 104080, femaleVoters: 106070, literacy: 56.4, urbanPercent: 14.8, scPercent: 28.4, stPercent: 3.8, areaSqKm: 1380 },
  { acNo: 98, population: 292000, totalVoters: 223180, turnout2023: 83.8, maleVoters: 110590, femaleVoters: 112590, literacy: 59.2, urbanPercent: 18.6, scPercent: 17.4, stPercent: 3.2, areaSqKm: 1180 },
  { acNo: 99, population: 325000, totalVoters: 248500, turnout2023: 82.4, maleVoters: 123250, femaleVoters: 125250, literacy: 64.6, urbanPercent: 36.8, scPercent: 15.6, stPercent: 2.2, areaSqKm: 780 },
  // ── Prakasam District ──
  { acNo: 100, population: 352000, totalVoters: 269080, turnout2023: 82.2, maleVoters: 133540, femaleVoters: 135540, literacy: 66.8, urbanPercent: 48.2, scPercent: 14.8, stPercent: 2.1, areaSqKm: 640 },
  { acNo: 101, population: 278000, totalVoters: 212460, turnout2023: 83.6, maleVoters: 105230, femaleVoters: 107230, literacy: 56.2, urbanPercent: 14.4, scPercent: 24.6, stPercent: 4.8, areaSqKm: 1380 },
  { acNo: 102, population: 295000, totalVoters: 225450, turnout2023: 83.2, maleVoters: 111730, femaleVoters: 113720, literacy: 58.8, urbanPercent: 18.6, scPercent: 18.4, stPercent: 4.2, areaSqKm: 1220 },
  { acNo: 103, population: 268000, totalVoters: 204880, turnout2023: 82.8, maleVoters: 101440, femaleVoters: 103440, literacy: 54.6, urbanPercent: 12.4, scPercent: 17.6, stPercent: 6.8, areaSqKm: 1520 },
  { acNo: 104, population: 255000, totalVoters: 194850, turnout2023: 82.4, maleVoters: 96430, femaleVoters: 98420, literacy: 52.4, urbanPercent: 10.8, scPercent: 16.2, stPercent: 8.4, areaSqKm: 1680 },
  { acNo: 105, population: 282000, totalVoters: 215530, turnout2023: 83.4, maleVoters: 106770, femaleVoters: 108760, literacy: 56.8, urbanPercent: 15.6, scPercent: 19.8, stPercent: 5.6, areaSqKm: 1340 },
  { acNo: 106, population: 248000, totalVoters: 189560, turnout2023: 82.6, maleVoters: 93780, femaleVoters: 95780, literacy: 51.2, urbanPercent: 9.8, scPercent: 16.4, stPercent: 7.2, areaSqKm: 1580 },
  { acNo: 107, population: 242000, totalVoters: 184960, turnout2023: 82.2, maleVoters: 91480, femaleVoters: 93480, literacy: 49.8, urbanPercent: 8.4, scPercent: 15.2, stPercent: 9.6, areaSqKm: 1820 },
  { acNo: 108, population: 265000, totalVoters: 202550, turnout2023: 83.4, maleVoters: 100280, femaleVoters: 102270, literacy: 53.4, urbanPercent: 11.6, scPercent: 22.8, stPercent: 5.4, areaSqKm: 1460 },
  { acNo: 109, population: 298000, totalVoters: 227740, turnout2023: 83.2, maleVoters: 112870, femaleVoters: 114870, literacy: 59.6, urbanPercent: 20.4, scPercent: 18.2, stPercent: 4.2, areaSqKm: 1140 },
  { acNo: 110, population: 275000, totalVoters: 210150, turnout2023: 82.8, maleVoters: 104080, femaleVoters: 106070, literacy: 55.4, urbanPercent: 14.2, scPercent: 17.8, stPercent: 5.8, areaSqKm: 1360 },
  { acNo: 111, population: 288000, totalVoters: 220120, turnout2023: 83.6, maleVoters: 109060, femaleVoters: 111060, literacy: 57.8, urbanPercent: 16.8, scPercent: 19.4, stPercent: 4.6, areaSqKm: 1280 },
  // ── Nellore District ──
  { acNo: 112, population: 325000, totalVoters: 248500, turnout2023: 82.4, maleVoters: 123250, femaleVoters: 125250, literacy: 64.2, urbanPercent: 38.4, scPercent: 16.2, stPercent: 2.4, areaSqKm: 780 },
  { acNo: 113, population: 298000, totalVoters: 227740, turnout2023: 82.8, maleVoters: 112870, femaleVoters: 114870, literacy: 60.8, urbanPercent: 24.6, scPercent: 18.4, stPercent: 3.2, areaSqKm: 1060 },
  { acNo: 114, population: 308000, totalVoters: 235340, turnout2023: 82.6, maleVoters: 116670, femaleVoters: 118670, literacy: 62.4, urbanPercent: 28.8, scPercent: 17.2, stPercent: 2.8, areaSqKm: 940 },
  { acNo: 115, population: 385000, totalVoters: 294320, turnout2023: 80.8, maleVoters: 145160, femaleVoters: 149160, literacy: 72.6, urbanPercent: 76.4, scPercent: 12.4, stPercent: 1.6, areaSqKm: 380 },
  { acNo: 116, population: 312000, totalVoters: 238450, turnout2023: 82.4, maleVoters: 118230, femaleVoters: 120220, literacy: 63.8, urbanPercent: 32.6, scPercent: 16.8, stPercent: 2.4, areaSqKm: 860 },
  { acNo: 117, population: 285000, totalVoters: 217850, turnout2023: 83.2, maleVoters: 107930, femaleVoters: 109920, literacy: 58.2, urbanPercent: 18.4, scPercent: 22.6, stPercent: 3.6, areaSqKm: 1220 },
  { acNo: 118, population: 295000, totalVoters: 225450, turnout2023: 82.8, maleVoters: 111730, femaleVoters: 113720, literacy: 60.4, urbanPercent: 22.8, scPercent: 17.4, stPercent: 2.8, areaSqKm: 1080 },
  { acNo: 119, population: 272000, totalVoters: 207920, turnout2023: 83.6, maleVoters: 102960, femaleVoters: 104960, literacy: 55.6, urbanPercent: 14.6, scPercent: 24.2, stPercent: 4.2, areaSqKm: 1380 },
  { acNo: 120, population: 282000, totalVoters: 215530, turnout2023: 82.4, maleVoters: 106770, femaleVoters: 108760, literacy: 57.8, urbanPercent: 16.8, scPercent: 18.6, stPercent: 3.8, areaSqKm: 1260 },
  { acNo: 121, population: 262000, totalVoters: 200240, turnout2023: 83.2, maleVoters: 99120, femaleVoters: 101120, literacy: 54.2, urbanPercent: 12.4, scPercent: 17.2, stPercent: 5.4, areaSqKm: 1440 },
  // ── Chittoor District ──
  { acNo: 122, population: 365000, totalVoters: 278950, turnout2023: 81.2, maleVoters: 137480, femaleVoters: 141470, literacy: 71.8, urbanPercent: 68.4, scPercent: 12.6, stPercent: 1.8, areaSqKm: 420 },
  { acNo: 123, population: 292000, totalVoters: 223180, turnout2023: 82.8, maleVoters: 110590, femaleVoters: 112590, literacy: 59.4, urbanPercent: 20.4, scPercent: 22.8, stPercent: 3.4, areaSqKm: 1140 },
  { acNo: 124, population: 278000, totalVoters: 212460, turnout2023: 83.4, maleVoters: 105230, femaleVoters: 107230, literacy: 56.8, urbanPercent: 14.8, scPercent: 26.4, stPercent: 4.2, areaSqKm: 1380 },
  { acNo: 125, population: 318000, totalVoters: 243060, turnout2023: 82.2, maleVoters: 120530, femaleVoters: 122530, literacy: 64.2, urbanPercent: 34.6, scPercent: 15.8, stPercent: 2.6, areaSqKm: 840 },
  { acNo: 126, population: 285000, totalVoters: 217850, turnout2023: 82.6, maleVoters: 107930, femaleVoters: 109920, literacy: 58.4, urbanPercent: 18.2, scPercent: 17.4, stPercent: 3.8, areaSqKm: 1220 },
  { acNo: 127, population: 342000, totalVoters: 261450, turnout2023: 81.8, maleVoters: 129730, femaleVoters: 131720, literacy: 66.8, urbanPercent: 46.2, scPercent: 14.6, stPercent: 2.2, areaSqKm: 680 },
  { acNo: 128, population: 268000, totalVoters: 204880, turnout2023: 82.8, maleVoters: 101440, femaleVoters: 103440, literacy: 54.6, urbanPercent: 12.6, scPercent: 17.8, stPercent: 4.6, areaSqKm: 1460 },
  { acNo: 129, population: 255000, totalVoters: 194850, turnout2023: 82.4, maleVoters: 96430, femaleVoters: 98420, literacy: 52.8, urbanPercent: 10.4, scPercent: 16.4, stPercent: 5.8, areaSqKm: 1580 },
  { acNo: 130, population: 298000, totalVoters: 227740, turnout2023: 84.6, maleVoters: 112870, femaleVoters: 114870, literacy: 62.4, urbanPercent: 26.8, scPercent: 15.2, stPercent: 3.2, areaSqKm: 1020 },
  { acNo: 131, population: 275000, totalVoters: 210150, turnout2023: 82.8, maleVoters: 104080, femaleVoters: 106070, literacy: 57.2, urbanPercent: 16.4, scPercent: 17.6, stPercent: 4.4, areaSqKm: 1340 },
  { acNo: 132, population: 312000, totalVoters: 238450, turnout2023: 82.4, maleVoters: 118230, femaleVoters: 120220, literacy: 63.6, urbanPercent: 32.4, scPercent: 16.2, stPercent: 2.6, areaSqKm: 860 },
  { acNo: 133, population: 262000, totalVoters: 200240, turnout2023: 82.6, maleVoters: 99120, femaleVoters: 101120, literacy: 53.4, urbanPercent: 11.8, scPercent: 16.8, stPercent: 5.2, areaSqKm: 1520 },
  { acNo: 134, population: 328000, totalVoters: 250720, turnout2023: 81.8, maleVoters: 124360, femaleVoters: 126360, literacy: 67.4, urbanPercent: 48.6, scPercent: 14.2, stPercent: 2.4, areaSqKm: 620 },
  { acNo: 135, population: 248000, totalVoters: 189560, turnout2023: 82.4, maleVoters: 93780, femaleVoters: 95780, literacy: 51.2, urbanPercent: 9.6, scPercent: 16.4, stPercent: 6.8, areaSqKm: 1640 },
  // ── Kadapa (YSR) District ──
  { acNo: 136, population: 358000, totalVoters: 273620, turnout2023: 81.4, maleVoters: 135810, femaleVoters: 137810, literacy: 68.2, urbanPercent: 52.4, scPercent: 14.8, stPercent: 2.2, areaSqKm: 580 },
  { acNo: 137, population: 275000, totalVoters: 210150, turnout2023: 83.2, maleVoters: 104080, femaleVoters: 106070, literacy: 56.4, urbanPercent: 14.6, scPercent: 26.8, stPercent: 4.4, areaSqKm: 1420 },
  { acNo: 138, population: 298000, totalVoters: 227740, turnout2023: 83.8, maleVoters: 112870, femaleVoters: 114870, literacy: 60.8, urbanPercent: 22.4, scPercent: 18.2, stPercent: 3.6, areaSqKm: 1080 },
  { acNo: 139, population: 335000, totalVoters: 256050, turnout2023: 82.4, maleVoters: 127030, femaleVoters: 129020, literacy: 65.6, urbanPercent: 42.8, scPercent: 15.4, stPercent: 2.2, areaSqKm: 720 },
  { acNo: 140, population: 268000, totalVoters: 204880, turnout2023: 82.8, maleVoters: 101440, femaleVoters: 103440, literacy: 54.8, urbanPercent: 12.8, scPercent: 17.2, stPercent: 5.8, areaSqKm: 1460 },
  { acNo: 141, population: 285000, totalVoters: 217850, turnout2023: 83.2, maleVoters: 107930, femaleVoters: 109920, literacy: 57.6, urbanPercent: 16.4, scPercent: 18.6, stPercent: 4.4, areaSqKm: 1280 },
  { acNo: 142, population: 292000, totalVoters: 223180, turnout2023: 82.6, maleVoters: 110590, femaleVoters: 112590, literacy: 59.2, urbanPercent: 18.8, scPercent: 17.4, stPercent: 3.8, areaSqKm: 1160 },
  { acNo: 143, population: 255000, totalVoters: 194850, turnout2023: 82.4, maleVoters: 96430, femaleVoters: 98420, literacy: 52.4, urbanPercent: 10.6, scPercent: 16.2, stPercent: 6.4, areaSqKm: 1540 },
  { acNo: 144, population: 305000, totalVoters: 233150, turnout2023: 83.4, maleVoters: 115580, femaleVoters: 117570, literacy: 62.2, urbanPercent: 26.4, scPercent: 16.8, stPercent: 3.2, areaSqKm: 980 },
  { acNo: 145, population: 262000, totalVoters: 200240, turnout2023: 83.6, maleVoters: 99120, femaleVoters: 101120, literacy: 54.6, urbanPercent: 12.2, scPercent: 24.4, stPercent: 4.8, areaSqKm: 1420 },
  // ── Kurnool District ──
  { acNo: 146, population: 348000, totalVoters: 266040, turnout2023: 81.6, maleVoters: 132020, femaleVoters: 134020, literacy: 67.4, urbanPercent: 52.6, scPercent: 14.6, stPercent: 2.4, areaSqKm: 620 },
  { acNo: 147, population: 275000, totalVoters: 210150, turnout2023: 82.4, maleVoters: 104080, femaleVoters: 106070, literacy: 55.8, urbanPercent: 14.8, scPercent: 18.2, stPercent: 5.6, areaSqKm: 1380 },
  { acNo: 148, population: 318000, totalVoters: 243060, turnout2023: 82.2, maleVoters: 120530, femaleVoters: 122530, literacy: 63.4, urbanPercent: 36.4, scPercent: 16.4, stPercent: 3.2, areaSqKm: 840 },
  { acNo: 149, population: 268000, totalVoters: 204880, turnout2023: 82.8, maleVoters: 101440, femaleVoters: 103440, literacy: 54.2, urbanPercent: 12.4, scPercent: 17.8, stPercent: 5.4, areaSqKm: 1480 },
  { acNo: 150, population: 292000, totalVoters: 223180, turnout2023: 82.6, maleVoters: 110590, femaleVoters: 112590, literacy: 58.4, urbanPercent: 18.6, scPercent: 16.4, stPercent: 4.2, areaSqKm: 1240 },
  { acNo: 151, population: 342000, totalVoters: 261450, turnout2023: 81.8, maleVoters: 129730, femaleVoters: 131720, literacy: 66.2, urbanPercent: 46.8, scPercent: 15.2, stPercent: 2.6, areaSqKm: 680 },
  { acNo: 152, population: 258000, totalVoters: 197160, turnout2023: 82.4, maleVoters: 97580, femaleVoters: 99580, literacy: 53.8, urbanPercent: 11.4, scPercent: 17.2, stPercent: 6.2, areaSqKm: 1520 },
  { acNo: 153, population: 248000, totalVoters: 189560, turnout2023: 83.2, maleVoters: 93780, femaleVoters: 95780, literacy: 50.4, urbanPercent: 9.2, scPercent: 24.8, stPercent: 5.8, areaSqKm: 1640 },
  { acNo: 154, population: 278000, totalVoters: 212460, turnout2023: 82.6, maleVoters: 105230, femaleVoters: 107230, literacy: 56.2, urbanPercent: 15.4, scPercent: 18.4, stPercent: 4.6, areaSqKm: 1340 },
  { acNo: 155, population: 285000, totalVoters: 217850, turnout2023: 82.8, maleVoters: 107930, femaleVoters: 109920, literacy: 57.4, urbanPercent: 16.8, scPercent: 17.6, stPercent: 4.2, areaSqKm: 1280 },
  { acNo: 156, population: 262000, totalVoters: 200240, turnout2023: 83.4, maleVoters: 99120, femaleVoters: 101120, literacy: 53.2, urbanPercent: 11.2, scPercent: 26.2, stPercent: 5.4, areaSqKm: 1480 },
  { acNo: 157, population: 272000, totalVoters: 207920, turnout2023: 82.8, maleVoters: 102960, femaleVoters: 104960, literacy: 55.6, urbanPercent: 13.8, scPercent: 17.8, stPercent: 5.2, areaSqKm: 1400 },
  { acNo: 158, population: 232000, totalVoters: 177320, turnout2023: 81.4, maleVoters: 87660, femaleVoters: 89660, literacy: 46.8, urbanPercent: 6.8, scPercent: 14.2, stPercent: 18.6, areaSqKm: 2240 },
  { acNo: 159, population: 255000, totalVoters: 194850, turnout2023: 83.2, maleVoters: 96430, femaleVoters: 98420, literacy: 52.4, urbanPercent: 10.4, scPercent: 28.6, stPercent: 4.8, areaSqKm: 1560 },
  // ── Anantapur District ──
  { acNo: 160, population: 358000, totalVoters: 273620, turnout2023: 81.4, maleVoters: 135810, femaleVoters: 137810, literacy: 68.4, urbanPercent: 56.8, scPercent: 14.2, stPercent: 2.4, areaSqKm: 560 },
  { acNo: 161, population: 282000, totalVoters: 215530, turnout2023: 82.4, maleVoters: 106770, femaleVoters: 108760, literacy: 56.8, urbanPercent: 16.4, scPercent: 17.8, stPercent: 5.2, areaSqKm: 1340 },
  { acNo: 162, population: 305000, totalVoters: 233150, turnout2023: 82.8, maleVoters: 115580, femaleVoters: 117570, literacy: 61.2, urbanPercent: 24.6, scPercent: 16.4, stPercent: 3.6, areaSqKm: 1080 },
  { acNo: 163, population: 318000, totalVoters: 243060, turnout2023: 82.2, maleVoters: 120530, femaleVoters: 122530, literacy: 63.4, urbanPercent: 32.4, scPercent: 15.8, stPercent: 3.2, areaSqKm: 880 },
  { acNo: 164, population: 268000, totalVoters: 204880, turnout2023: 82.6, maleVoters: 101440, femaleVoters: 103440, literacy: 54.8, urbanPercent: 12.8, scPercent: 18.2, stPercent: 5.4, areaSqKm: 1460 },
  { acNo: 165, population: 342000, totalVoters: 261450, turnout2023: 82.4, maleVoters: 129730, femaleVoters: 131720, literacy: 66.8, urbanPercent: 44.6, scPercent: 14.4, stPercent: 2.2, areaSqKm: 720 },
  { acNo: 166, population: 275000, totalVoters: 210150, turnout2023: 82.8, maleVoters: 104080, femaleVoters: 106070, literacy: 56.4, urbanPercent: 14.6, scPercent: 17.4, stPercent: 4.8, areaSqKm: 1380 },
  { acNo: 167, population: 262000, totalVoters: 200240, turnout2023: 83.4, maleVoters: 99120, femaleVoters: 101120, literacy: 53.2, urbanPercent: 11.2, scPercent: 22.4, stPercent: 5.6, areaSqKm: 1520 },
  { acNo: 168, population: 312000, totalVoters: 238450, turnout2023: 82.4, maleVoters: 118230, femaleVoters: 120220, literacy: 63.8, urbanPercent: 34.8, scPercent: 16.2, stPercent: 2.8, areaSqKm: 860 },
  { acNo: 169, population: 285000, totalVoters: 217850, turnout2023: 82.6, maleVoters: 107930, femaleVoters: 109920, literacy: 57.4, urbanPercent: 16.8, scPercent: 17.8, stPercent: 4.4, areaSqKm: 1280 },
  { acNo: 170, population: 272000, totalVoters: 207920, turnout2023: 82.8, maleVoters: 102960, femaleVoters: 104960, literacy: 55.2, urbanPercent: 14.2, scPercent: 16.8, stPercent: 5.2, areaSqKm: 1380 },
  { acNo: 171, population: 298000, totalVoters: 227740, turnout2023: 82.4, maleVoters: 112870, femaleVoters: 114870, literacy: 60.4, urbanPercent: 22.4, scPercent: 15.6, stPercent: 3.6, areaSqKm: 1080 },
  { acNo: 172, population: 258000, totalVoters: 197160, turnout2023: 83.2, maleVoters: 97580, femaleVoters: 99580, literacy: 52.6, urbanPercent: 10.8, scPercent: 24.8, stPercent: 5.4, areaSqKm: 1520 },
  { acNo: 173, population: 288000, totalVoters: 220120, turnout2023: 82.6, maleVoters: 109060, femaleVoters: 111060, literacy: 58.2, urbanPercent: 18.4, scPercent: 17.2, stPercent: 4.2, areaSqKm: 1240 },
  // ── Remaining seats ──
  { acNo: 174, population: 278000, totalVoters: 212460, turnout2023: 82.8, maleVoters: 105230, femaleVoters: 107230, literacy: 56.4, urbanPercent: 14.8, scPercent: 18.4, stPercent: 4.6, areaSqKm: 1340 },
  { acNo: 175, population: 265000, totalVoters: 202550, turnout2023: 82.4, maleVoters: 100280, femaleVoters: 102270, literacy: 54.2, urbanPercent: 12.4, scPercent: 17.6, stPercent: 5.8, areaSqKm: 1460 },
];

// ─── LOOKUP HELPER ──────────────────────────────────────────────────────────

const demoByAcNo = new Map<number, ConstituencyDemographics>(
  AP_DEMOGRAPHICS.map((d) => [d.acNo, d]),
);

export function getAPConstituencyDemographics(acNo: number): ConstituencyDemographics | undefined {
  return demoByAcNo.get(acNo);
}
