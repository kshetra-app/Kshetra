/**
 * Jammu & Kashmir Constituency Demographics
 *
 * ⚠️ DATA STATUS: INDICATIVE ESTIMATES — NOT authoritative per-constituency data.
 * These rows are modelled approximations (district-level Census 2011 figures and
 * J&K state averages for population, literacy, urbanisation, turnout and SC/ST
 * share). They are keyed to the official post-2022-delimitation ECI AC numbers
 * (1–90) so every seat has a value, but the figures are NOT real per-constituency
 * statistics and the per-row values do NOT necessarily reflect that
 * constituency's actual profile (e.g. SC/ST % will not always align with the
 * seat's reservation status).
 *
 * State averages — Literacy: 68.74% | Urban: 27.4% | SC: 7.4% | ST: 11.9%
 * Population: 12,541,302 (Census 2011) | Area: 42,241 sq km
 *
 * TODO: replace with real per-constituency data from ECI Form-20 / Census
 * constituency tables when available.
 */

import type { ConstituencyDemographics } from './telangana-demographics';

export const JK_DEMOGRAPHICS: ConstituencyDemographics[] = [
  { acNo: 1, population: 125256, totalVoters: 87428, turnout2023: 64.9, maleVoters: 43671, femaleVoters: 43757, literacy: 68.3, urbanPercent: 25.6, scPercent: 3.9, stPercent: 3.1, areaSqKm: 5 },
  { acNo: 2, population: 140192, totalVoters: 103042, turnout2023: 56.9, maleVoters: 52294, femaleVoters: 50748, literacy: 72.4, urbanPercent: 24.2, scPercent: 10.4, stPercent: 3.1, areaSqKm: 5 },
  { acNo: 3, population: 114590, totalVoters: 77005, turnout2023: 62, maleVoters: 37348, femaleVoters: 39657, literacy: 67.3, urbanPercent: 22.8, scPercent: 2.3, stPercent: 3.1, areaSqKm: 5 },
  { acNo: 4, population: 129527, totalVoters: 91834, turnout2023: 54, maleVoters: 45275, femaleVoters: 46559, literacy: 71.3, urbanPercent: 21.4, scPercent: 8.8, stPercent: 3.1, areaSqKm: 5 },
  { acNo: 5, population: 103924, totalVoters: 67135, turnout2023: 58.6, maleVoters: 33770, femaleVoters: 33365, literacy: 71.3, urbanPercent: 20, scPercent: 8.8, stPercent: 3.1, areaSqKm: 5 },
  { acNo: 6, population: 118861, totalVoters: 81183, turnout2023: 63.6, maleVoters: 41485, femaleVoters: 39698, literacy: 66.3, urbanPercent: 28.4, scPercent: 0.7, stPercent: 3.1, areaSqKm: 5 },
  { acNo: 7, population: 76221, totalVoters: 49543, turnout2023: 57.4, maleVoters: 24425, femaleVoters: 25118, literacy: 76.4, urbanPercent: 14.5, scPercent: 0.7, stPercent: 3.1, areaSqKm: 172 },
  { acNo: 8, population: 86964, totalVoters: 59745, turnout2023: 62.4, maleVoters: 29962, femaleVoters: 29783, literacy: 72.4, urbanPercent: 13.1, scPercent: 0, stPercent: 3.1, areaSqKm: 172 },
  { acNo: 9, population: 97710, totalVoters: 70742, turnout2023: 54, maleVoters: 36219, femaleVoters: 34523, literacy: 73.4, urbanPercent: 11.7, scPercent: 0, stPercent: 3.1, areaSqKm: 164 },
  { acNo: 10, population: 87265, totalVoters: 60039, turnout2023: 52.2, maleVoters: 30650, femaleVoters: 29389, literacy: 71.3, urbanPercent: 7.5, scPercent: 0, stPercent: 4.2, areaSqKm: 169 },
  { acNo: 11, population: 98009, totalVoters: 71057, turnout2023: 56.8, maleVoters: 34854, femaleVoters: 36203, literacy: 72.4, urbanPercent: 6.1, scPercent: 0, stPercent: 4.2, areaSqKm: 160 },
  { acNo: 12, population: 79595, totalVoters: 52692, turnout2023: 61.8, maleVoters: 26294, femaleVoters: 26398, literacy: 77.4, urbanPercent: 14.5, scPercent: 2.3, stPercent: 4.2, areaSqKm: 161 },
  { acNo: 13, population: 90338, totalVoters: 63146, turnout2023: 53.9, maleVoters: 32047, femaleVoters: 31099, literacy: 73.4, urbanPercent: 13.1, scPercent: 0, stPercent: 4.2, areaSqKm: 161 },
  { acNo: 14, population: 130368, totalVoters: 94256, turnout2023: 54.3, maleVoters: 45855, femaleVoters: 48401, literacy: 68.3, urbanPercent: 22.8, scPercent: 3.9, stPercent: 0, areaSqKm: 5 },
  { acNo: 15, population: 105664, totalVoters: 69738, turnout2023: 59.3, maleVoters: 34520, femaleVoters: 35218, literacy: 64.3, urbanPercent: 21.4, scPercent: 0, stPercent: 0, areaSqKm: 5 },
  { acNo: 16, population: 120664, totalVoters: 84103, turnout2023: 63.9, maleVoters: 42513, femaleVoters: 41590, literacy: 65.3, urbanPercent: 20, scPercent: 0, stPercent: 19.2, areaSqKm: 5 },
  { acNo: 17, population: 136154, totalVoters: 90134, turnout2023: 58.4, maleVoters: 46284, femaleVoters: 43850, literacy: 70.3, urbanPercent: 22.8, scPercent: 0, stPercent: 23.7, areaSqKm: 5 },
  { acNo: 18, population: 154497, totalVoters: 107993, turnout2023: 63.4, maleVoters: 53078, femaleVoters: 54915, literacy: 75.4, urbanPercent: 21.4, scPercent: 0, stPercent: 11.6, areaSqKm: 5 },
  { acNo: 19, population: 187654, totalVoters: 134173, turnout2023: 53, maleVoters: 67423, femaleVoters: 66750, literacy: 68.3, urbanPercent: 54.8, scPercent: 10.4, stPercent: 19.1, areaSqKm: 431 },
  { acNo: 20, population: 180777, totalVoters: 127086, turnout2023: 55.4, maleVoters: 62463, femaleVoters: 64623, literacy: 67.3, urbanPercent: 50.6, scPercent: 8.8, stPercent: 19.1, areaSqKm: 400 },
  { acNo: 21, population: 144395, totalVoters: 92413, turnout2023: 60.9, maleVoters: 45559, femaleVoters: 46854, literacy: 67.3, urbanPercent: 49.2, scPercent: 8.8, stPercent: 19.1, areaSqKm: 421 },
  { acNo: 22, population: 165620, totalVoters: 112124, turnout2023: 52.9, maleVoters: 55669, femaleVoters: 56455, literacy: 63.3, urbanPercent: 47.8, scPercent: 2.3, stPercent: 19.1, areaSqKm: 604 },
  { acNo: 23, population: 186846, totalVoters: 133409, turnout2023: 56.2, maleVoters: 66437, femaleVoters: 66972, literacy: 63.3, urbanPercent: 56.2, scPercent: 2.3, stPercent: 19.1, areaSqKm: 343 },
  { acNo: 24, population: 150464, totalVoters: 97952, turnout2023: 61.7, maleVoters: 48927, femaleVoters: 49025, literacy: 63.3, urbanPercent: 54.8, scPercent: 2.3, stPercent: 19.1, areaSqKm: 364 },
  { acNo: 25, population: 171690, totalVoters: 118123, turnout2023: 53.7, maleVoters: 59416, femaleVoters: 58707, literacy: 68.3, urbanPercent: 53.4, scPercent: 10.4, stPercent: 19.1, areaSqKm: 365 },
  { acNo: 26, population: 193780, totalVoters: 140490, turnout2023: 59.1, maleVoters: 70878, femaleVoters: 69612, literacy: 68.3, urbanPercent: 52, scPercent: 10.4, stPercent: 19.1, areaSqKm: 387 },
  { acNo: 27, population: 191387, totalVoters: 141434, turnout2023: 54.4, maleVoters: 70292, femaleVoters: 71142, literacy: 63.3, urbanPercent: 22.8, scPercent: 0, stPercent: 8.4, areaSqKm: 25 },
  { acNo: 28, population: 156802, totalVoters: 105998, turnout2023: 59.4, maleVoters: 54165, femaleVoters: 51833, literacy: 63.3, urbanPercent: 21.4, scPercent: 0, stPercent: 8.4, areaSqKm: 25 },
  { acNo: 29, population: 176979, totalVoters: 126187, turnout2023: 64, maleVoters: 62652, femaleVoters: 63535, literacy: 68.3, urbanPercent: 20, scPercent: 0.7, stPercent: 8.4, areaSqKm: 24 },
  { acNo: 30, population: 170441, totalVoters: 119479, turnout2023: 53.8, maleVoters: 58604, femaleVoters: 60875, literacy: 65.3, urbanPercent: 25.6, scPercent: 0, stPercent: 8.4, areaSqKm: 23 },
  { acNo: 31, population: 190619, totalVoters: 140677, turnout2023: 58.4, maleVoters: 71253, femaleVoters: 69424, literacy: 61.3, urbanPercent: 24.2, scPercent: 0, stPercent: 8.4, areaSqKm: 22 },
  { acNo: 32, population: 202277, totalVoters: 138762, turnout2023: 54.5, maleVoters: 70839, femaleVoters: 67923, literacy: 72.4, urbanPercent: 56.2, scPercent: 5.5, stPercent: 17, areaSqKm: 379 },
  { acNo: 33, population: 227434, totalVoters: 164434, turnout2023: 59.1, maleVoters: 80573, femaleVoters: 83861, literacy: 72.4, urbanPercent: 54.8, scPercent: 5.5, stPercent: 17, areaSqKm: 361 },
  { acNo: 34, population: 185338, totalVoters: 122323, turnout2023: 64.1, maleVoters: 60917, femaleVoters: 61406, literacy: 76.4, urbanPercent: 53.4, scPercent: 12, stPercent: 17, areaSqKm: 363 },
  { acNo: 35, population: 210495, totalVoters: 146715, turnout2023: 56.1, maleVoters: 74238, femaleVoters: 72477, literacy: 71.3, urbanPercent: 52, scPercent: 3.9, stPercent: 17, areaSqKm: 364 },
  { acNo: 36, population: 126921, totalVoters: 90494, turnout2023: 58, maleVoters: 44206, femaleVoters: 46288, literacy: 76.4, urbanPercent: 20, scPercent: 3.9, stPercent: 9.5, areaSqKm: 5 },
  { acNo: 37, population: 102218, totalVoters: 66442, turnout2023: 63.1, maleVoters: 32988, femaleVoters: 33454, literacy: 71.3, urbanPercent: 18.6, scPercent: 0, stPercent: 9.5, areaSqKm: 5 },
  { acNo: 38, population: 120971, totalVoters: 85890, turnout2023: 61.9, maleVoters: 43245, femaleVoters: 42645, literacy: 66.3, urbanPercent: 4.7, scPercent: 2.3, stPercent: 3.1, areaSqKm: 277 },
  { acNo: 39, population: 97166, totalVoters: 62867, turnout2023: 53.9, maleVoters: 30616, femaleVoters: 32251, literacy: 66.3, urbanPercent: 3.3, scPercent: 2.3, stPercent: 3.1, areaSqKm: 278 },
  { acNo: 40, population: 130360, totalVoters: 95814, turnout2023: 56.3, maleVoters: 49200, femaleVoters: 46614, literacy: 68.3, urbanPercent: 1.4, scPercent: 5.5, stPercent: 3.1, areaSqKm: 258 },
  { acNo: 41, population: 163243, totalVoters: 105619, turnout2023: 58.7, maleVoters: 52493, femaleVoters: 53126, literacy: 75.4, urbanPercent: 50.6, scPercent: 15.3, stPercent: 10.6, areaSqKm: 352 },
  { acNo: 42, population: 186566, totalVoters: 127611, turnout2023: 64.1, maleVoters: 63614, femaleVoters: 63997, literacy: 75.4, urbanPercent: 49.2, scPercent: 15.3, stPercent: 22.3, areaSqKm: 372 },
  { acNo: 43, population: 209888, totalVoters: 151329, turnout2023: 56.1, maleVoters: 75967, femaleVoters: 75362, literacy: 71.3, urbanPercent: 47.8, scPercent: 8.8, stPercent: 10.6, areaSqKm: 534 },
  { acNo: 44, population: 169913, totalVoters: 111803, turnout2023: 61.6, maleVoters: 56292, femaleVoters: 55511, literacy: 71.3, urbanPercent: 46.4, scPercent: 8.8, stPercent: 10.6, areaSqKm: 564 },
  { acNo: 45, population: 193235, totalVoters: 134299, turnout2023: 54, maleVoters: 67821, femaleVoters: 66478, literacy: 71.3, urbanPercent: 45, scPercent: 8.8, stPercent: 10.6, areaSqKm: 594 },
  { acNo: 46, population: 216558, totalVoters: 158520, turnout2023: 56.9, maleVoters: 80607, femaleVoters: 77913, literacy: 67.3, urbanPercent: 43.7, scPercent: 2.3, stPercent: 10.6, areaSqKm: 455 },
  { acNo: 47, population: 177531, totalVoters: 118768, turnout2023: 62.4, maleVoters: 60572, femaleVoters: 58196, literacy: 67.3, urbanPercent: 52, scPercent: 2.3, stPercent: 10.6, areaSqKm: 340 },
  { acNo: 48, population: 191425, totalVoters: 133806, turnout2023: 52.8, maleVoters: 68642, femaleVoters: 65164, literacy: 70.3, urbanPercent: 45, scPercent: 20.2, stPercent: 18, areaSqKm: 471 },
  { acNo: 49, population: 214223, totalVoters: 157667, turnout2023: 56.1, maleVoters: 81120, femaleVoters: 76547, literacy: 70.3, urbanPercent: 43.7, scPercent: 20.2, stPercent: 18, areaSqKm: 381 },
  { acNo: 50, population: 206837, totalVoters: 149750, turnout2023: 60.2, maleVoters: 75699, femaleVoters: 74051, literacy: 65.3, urbanPercent: 39.5, scPercent: 12, stPercent: 18, areaSqKm: 438 },
  { acNo: 51, population: 273605, totalVoters: 200278, turnout2023: 65, maleVoters: 97836, femaleVoters: 102442, literacy: 70.3, urbanPercent: 35.3, scPercent: 2.3, stPercent: 10.6, areaSqKm: 562 },
  { acNo: 52, population: 223299, totalVoters: 149387, turnout2023: 55.7, maleVoters: 73275, femaleVoters: 76112, literacy: 72.4, urbanPercent: 33.9, scPercent: 5.5, stPercent: 10.6, areaSqKm: 483 },
  { acNo: 53, population: 252648, totalVoters: 178369, turnout2023: 62, maleVoters: 87490, femaleVoters: 90879, literacy: 78.4, urbanPercent: 32.5, scPercent: 15.3, stPercent: 10.6, areaSqKm: 565 },
  { acNo: 54, population: 89283, totalVoters: 61427, turnout2023: 55.1, maleVoters: 30222, femaleVoters: 31205, literacy: 69.3, urbanPercent: 28.4, scPercent: 0, stPercent: 2, areaSqKm: 5 },
  { acNo: 55, population: 100290, totalVoters: 72710, turnout2023: 61.9, maleVoters: 36936, femaleVoters: 35774, literacy: 74.4, urbanPercent: 27, scPercent: 7.2, stPercent: 2, areaSqKm: 5 },
  { acNo: 56, population: 223352, totalVoters: 151210, turnout2023: 57, maleVoters: 76360, femaleVoters: 74850, literacy: 72.4, urbanPercent: 38.1, scPercent: 15.3, stPercent: 34.8, areaSqKm: 474 },
  { acNo: 57, population: 251915, totalVoters: 179868, turnout2023: 60.3, maleVoters: 90744, femaleVoters: 89124, literacy: 75.4, urbanPercent: 36.7, scPercent: 20.2, stPercent: 20.2, areaSqKm: 386 },
  { acNo: 58, population: 202956, totalVoters: 132124, turnout2023: 52.8, maleVoters: 66591, femaleVoters: 65533, literacy: 69.3, urbanPercent: 35.3, scPercent: 10.4, stPercent: 20.2, areaSqKm: 409 },
  { acNo: 59, population: 152341, totalVoters: 103897, turnout2023: 60.8, maleVoters: 51274, femaleVoters: 52623, literacy: 60.2, urbanPercent: 20, scPercent: 0, stPercent: 0, areaSqKm: 188 },
  { acNo: 60, population: 146143, totalVoters: 97916, turnout2023: 64.9, maleVoters: 50427, femaleVoters: 47489, literacy: 64.3, urbanPercent: 25.6, scPercent: 0, stPercent: 0, areaSqKm: 214 },
  { acNo: 61, population: 165272, totalVoters: 116846, turnout2023: 55.2, maleVoters: 56787, femaleVoters: 60059, literacy: 64.3, urbanPercent: 24.2, scPercent: 0, stPercent: 0, areaSqKm: 174 },
  { acNo: 62, population: 132483, totalVoters: 85319, turnout2023: 60.7, maleVoters: 41593, femaleVoters: 43726, literacy: 64.3, urbanPercent: 22.8, scPercent: 24.4, stPercent: 0, areaSqKm: 185 },
  { acNo: 63, population: 100712, totalVoters: 68988, turnout2023: 60.9, maleVoters: 35425, femaleVoters: 33563, literacy: 71.3, urbanPercent: 13.1, scPercent: 0, stPercent: 9.5, areaSqKm: 176 },
  { acNo: 64, population: 113803, totalVoters: 82166, turnout2023: 52.9, maleVoters: 40837, femaleVoters: 41329, literacy: 71.3, urbanPercent: 21.4, scPercent: 0, stPercent: 9.5, areaSqKm: 177 },
  { acNo: 65, population: 92244, totalVoters: 60788, turnout2023: 57.5, maleVoters: 31184, femaleVoters: 29604, literacy: 67.3, urbanPercent: 20, scPercent: 0, stPercent: 9.5, areaSqKm: 168 },
  { acNo: 66, population: 104822, totalVoters: 72956, turnout2023: 62.6, maleVoters: 36223, femaleVoters: 36733, literacy: 67.3, urbanPercent: 18.6, scPercent: 0, stPercent: 9.5, areaSqKm: 169 },
  { acNo: 67, population: 117401, totalVoters: 86055, turnout2023: 54.2, maleVoters: 44103, femaleVoters: 41952, literacy: 72.4, urbanPercent: 17.2, scPercent: 24.4, stPercent: 9.5, areaSqKm: 160 },
  { acNo: 68, population: 95840, totalVoters: 64213, turnout2023: 59.2, maleVoters: 31849, femaleVoters: 32364, literacy: 72.4, urbanPercent: 15.8, scPercent: 0, stPercent: 9.5, areaSqKm: 160 },
  { acNo: 69, population: 217960, totalVoters: 154533, turnout2023: 63, maleVoters: 78580, femaleVoters: 75953, literacy: 62.3, urbanPercent: 36.7, scPercent: 26.7, stPercent: 19.1, areaSqKm: 498 },
  { acNo: 70, population: 209810, totalVoters: 146237, turnout2023: 54.9, maleVoters: 72899, femaleVoters: 73338, literacy: 67.3, urbanPercent: 32.5, scPercent: 20.2, stPercent: 19.1, areaSqKm: 635 },
  { acNo: 71, population: 234965, totalVoters: 172464, turnout2023: 58.2, maleVoters: 85887, femaleVoters: 86577, literacy: 61.3, urbanPercent: 31.1, scPercent: 10.4, stPercent: 19.1, areaSqKm: 515 },
  { acNo: 72, population: 201301, totalVoters: 134670, turnout2023: 56, maleVoters: 68345, femaleVoters: 66325, literacy: 68.3, urbanPercent: 31.1, scPercent: 35.8, stPercent: 19.1, areaSqKm: 314 },
  { acNo: 73, population: 227768, totalVoters: 160804, turnout2023: 61.4, maleVoters: 81528, femaleVoters: 79276, literacy: 62.3, urbanPercent: 29.8, scPercent: 24.4, stPercent: 19.1, areaSqKm: 335 },
  { acNo: 74, population: 182403, totalVoters: 117286, turnout2023: 53.9, maleVoters: 59405, femaleVoters: 57881, literacy: 65.3, urbanPercent: 28.4, scPercent: 13.7, stPercent: 19.1, areaSqKm: 355 },
  { acNo: 75, population: 208869, totalVoters: 142031, turnout2023: 59.3, maleVoters: 71867, femaleVoters: 70164, literacy: 68.3, urbanPercent: 27, scPercent: 18.6, stPercent: 19.1, areaSqKm: 376 },
  { acNo: 76, population: 235337, totalVoters: 168737, turnout2023: 64.8, maleVoters: 85296, femaleVoters: 83441, literacy: 62.3, urbanPercent: 25.6, scPercent: 8.8, stPercent: 19.1, areaSqKm: 396 },
  { acNo: 77, population: 189971, totalVoters: 124241, turnout2023: 55.1, maleVoters: 62741, femaleVoters: 61500, literacy: 65.3, urbanPercent: 24.2, scPercent: 13.7, stPercent: 19.1, areaSqKm: 320 },
  { acNo: 78, population: 216438, totalVoters: 149559, turnout2023: 60.5, maleVoters: 75452, femaleVoters: 74107, literacy: 68.3, urbanPercent: 22.8, scPercent: 18.6, stPercent: 19.1, areaSqKm: 341 },
  { acNo: 79, population: 242904, totalVoters: 176834, turnout2023: 53, maleVoters: 89124, femaleVoters: 87710, literacy: 62.3, urbanPercent: 31.1, scPercent: 8.8, stPercent: 19.1, areaSqKm: 361 },
  { acNo: 80, population: 234330, totalVoters: 167780, turnout2023: 56.2, maleVoters: 82547, femaleVoters: 85233, literacy: 62.3, urbanPercent: 27, scPercent: 24.4, stPercent: 19.1, areaSqKm: 371 },
  { acNo: 81, population: 188964, totalVoters: 123394, turnout2023: 61.7, maleVoters: 60647, femaleVoters: 62747, literacy: 65.3, urbanPercent: 25.6, scPercent: 29, stPercent: 19.1, areaSqKm: 391 },
  { acNo: 82, population: 216509, totalVoters: 149391, turnout2023: 52, maleVoters: 73351, femaleVoters: 76040, literacy: 68.3, urbanPercent: 24.2, scPercent: 18.6, stPercent: 19.1, areaSqKm: 315 },
  { acNo: 83, population: 94670, totalVoters: 64849, turnout2023: 52.8, maleVoters: 32295, femaleVoters: 32554, literacy: 68.3, urbanPercent: 1.4, scPercent: 7.2, stPercent: 3.1, areaSqKm: 283 },
  { acNo: 84, population: 106463, totalVoters: 76867, turnout2023: 57.8, maleVoters: 38894, femaleVoters: 37973, literacy: 63.3, urbanPercent: 1.4, scPercent: 0, stPercent: 3.1, areaSqKm: 284 },
  { acNo: 85, population: 86250, totalVoters: 56839, turnout2023: 62.8, maleVoters: 29215, femaleVoters: 27624, literacy: 67.3, urbanPercent: 1.4, scPercent: 5.5, stPercent: 19.2, areaSqKm: 285 },
  { acNo: 86, population: 98043, totalVoters: 68238, turnout2023: 54.9, maleVoters: 33539, femaleVoters: 34699, literacy: 62.3, urbanPercent: 1.4, scPercent: 0, stPercent: 19.2, areaSqKm: 285 },
  { acNo: 87, population: 109836, totalVoters: 80509, turnout2023: 59.9, maleVoters: 40214, femaleVoters: 40295, literacy: 66.3, urbanPercent: 1.4, scPercent: 3.9, stPercent: 19.2, areaSqKm: 286 },
  { acNo: 88, population: 90333, totalVoters: 66214, turnout2023: 55.9, maleVoters: 33074, femaleVoters: 33140, literacy: 75.4, urbanPercent: 1.9, scPercent: 0, stPercent: 19.2, areaSqKm: 5 },
  { acNo: 89, population: 73714, totalVoters: 49389, turnout2023: 60.9, maleVoters: 25362, femaleVoters: 24027, literacy: 75.4, urbanPercent: 1.4, scPercent: 0, stPercent: 3.1, areaSqKm: 5 },
  { acNo: 90, population: 70573, totalVoters: 46438, turnout2023: 63.3, maleVoters: 23660, femaleVoters: 22778, literacy: 68.3, urbanPercent: 1.4, scPercent: 0, stPercent: 19.2, areaSqKm: 5 },
];

export function getJKConstituencyDemographics(acNo: number): ConstituencyDemographics | undefined {
  return JK_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
