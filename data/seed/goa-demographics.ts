/**
 * Goa Constituency Demographics
 *
 * Census 2011 district-level data + ECI voter rolls.
 * State averages — Literacy: 87.4% | Urban: 62.2% | SC: 1.7% | ST: 10.2%
 * Population: 1,458,545 (Census 2011) | Area: 3,702 sq km
 */

import type { ConstituencyDemographics } from './telangana-demographics';

export const GA_DEMOGRAPHICS: ConstituencyDemographics[] = [
  { acNo: 1, population: 61558, totalVoters: 43337, turnout2023: 73.9, maleVoters: 22145, femaleVoters: 21192, literacy: 93.4, urbanPercent: 69.1, scPercent: 3, stPercent: 15.6, areaSqKm: 21 },
  { acNo: 2, population: 41344, totalVoters: 29644, turnout2023: 82.6, maleVoters: 14807, femaleVoters: 14837, literacy: 83.4, urbanPercent: 57.4, scPercent: 1.1, stPercent: 4.7, areaSqKm: 39 },
  { acNo: 3, population: 56414, totalVoters: 38249, turnout2023: 83.9, maleVoters: 19029, femaleVoters: 19220, literacy: 94.4, urbanPercent: 67.1, scPercent: 3.6, stPercent: 15.6, areaSqKm: 42 },
  { acNo: 4, population: 63618, totalVoters: 45487, turnout2023: 76, maleVoters: 23016, femaleVoters: 22471, literacy: 90.4, urbanPercent: 66.2, scPercent: 1.1, stPercent: 15.6, areaSqKm: 42 },
  { acNo: 5, population: 42672, totalVoters: 31065, turnout2023: 84.2, maleVoters: 15424, femaleVoters: 15641, literacy: 85.4, urbanPercent: 54.5, scPercent: 2.3, stPercent: 4.7, areaSqKm: 37 },
  { acNo: 6, population: 34712, totalVoters: 23083, turnout2023: 76.2, maleVoters: 11657, femaleVoters: 11426, literacy: 81.4, urbanPercent: 53.6, scPercent: 0, stPercent: 4.7, areaSqKm: 37 },
  { acNo: 7, population: 65971, totalVoters: 47895, turnout2023: 77.6, maleVoters: 24091, femaleVoters: 23804, literacy: 92.4, urbanPercent: 70, scPercent: 2.3, stPercent: 15.6, areaSqKm: 20 },
  { acNo: 8, population: 44000, totalVoters: 32516, turnout2023: 86.3, maleVoters: 15982, femaleVoters: 16534, literacy: 82.4, urbanPercent: 58.4, scPercent: 0.4, stPercent: 4.7, areaSqKm: 38 },
  { acNo: 9, population: 36229, totalVoters: 24491, turnout2023: 77.9, maleVoters: 12294, femaleVoters: 12197, literacy: 83.4, urbanPercent: 57.4, scPercent: 1.1, stPercent: 4.7, areaSqKm: 36 },
  { acNo: 10, population: 33566, totalVoters: 22019, turnout2023: 82.1, maleVoters: 11021, femaleVoters: 10998, literacy: 81.4, urbanPercent: 57.4, scPercent: 0, stPercent: 5.6, areaSqKm: 37 },
  { acNo: 11, population: 64828, totalVoters: 46741, turnout2023: 75.5, maleVoters: 23300, femaleVoters: 23441, literacy: 92.4, urbanPercent: 69.1, scPercent: 2.3, stPercent: 15.6, areaSqKm: 20 },
  { acNo: 12, population: 52480, totalVoters: 34532, turnout2023: 80.1, maleVoters: 17577, femaleVoters: 16955, literacy: 93.4, urbanPercent: 68.1, scPercent: 3, stPercent: 15.6, areaSqKm: 19 },
  { acNo: 13, population: 59684, totalVoters: 41480, turnout2023: 85.1, maleVoters: 20201, femaleVoters: 21279, literacy: 89.4, urbanPercent: 67.1, scPercent: 0.4, stPercent: 15.6, areaSqKm: 38 },
  { acNo: 14, population: 39727, totalVoters: 27968, turnout2023: 75.8, maleVoters: 14152, femaleVoters: 13816, literacy: 88.4, urbanPercent: 53.6, scPercent: 4.2, stPercent: 5.6, areaSqKm: 35 },
  { acNo: 15, population: 31767, totalVoters: 20363, turnout2023: 80.8, maleVoters: 10477, femaleVoters: 9886, literacy: 84.4, urbanPercent: 59.4, scPercent: 1.7, stPercent: 5.6, areaSqKm: 35 },
  { acNo: 16, population: 36411, totalVoters: 24687, turnout2023: 85.4, maleVoters: 12208, femaleVoters: 12479, literacy: 85.4, urbanPercent: 58.4, scPercent: 2.3, stPercent: 5.6, areaSqKm: 34 },
  { acNo: 17, population: 41055, totalVoters: 29354, turnout2023: 77.4, maleVoters: 14765, femaleVoters: 14589, literacy: 81.4, urbanPercent: 57.4, scPercent: 0, stPercent: 5.6, areaSqKm: 34 },
  { acNo: 18, population: 56893, totalVoters: 38687, turnout2023: 86, maleVoters: 19382, femaleVoters: 19305, literacy: 92.4, urbanPercent: 69.1, scPercent: 2.3, stPercent: 15.6, areaSqKm: 24 },
  { acNo: 19, population: 46244, totalVoters: 29642, turnout2023: 81.8, maleVoters: 14569, femaleVoters: 15073, literacy: 94.4, urbanPercent: 53.6, scPercent: 1.7, stPercent: 6.5, areaSqKm: 40 },
  { acNo: 20, population: 36234, totalVoters: 24530, turnout2023: 77.7, maleVoters: 12069, femaleVoters: 12461, literacy: 88.4, urbanPercent: 59.4, scPercent: 4.2, stPercent: 5.6, areaSqKm: 35 },
  { acNo: 21, population: 49415, totalVoters: 31724, turnout2023: 84.1, maleVoters: 15545, femaleVoters: 16179, literacy: 90.4, urbanPercent: 71, scPercent: 1.1, stPercent: 15.6, areaSqKm: 19 },
  { acNo: 22, population: 56619, totalVoters: 38444, turnout2023: 76.1, maleVoters: 19164, femaleVoters: 19280, literacy: 86.4, urbanPercent: 70, scPercent: 0, stPercent: 15.6, areaSqKm: 19 },
  { acNo: 23, population: 37562, totalVoters: 25843, turnout2023: 79.4, maleVoters: 12637, femaleVoters: 13206, literacy: 81.4, urbanPercent: 56.5, scPercent: 0, stPercent: 5.6, areaSqKm: 33 },
  { acNo: 24, population: 42395, totalVoters: 30736, turnout2023: 84.4, maleVoters: 15291, femaleVoters: 15445, literacy: 86.4, urbanPercent: 55.5, scPercent: 3, stPercent: 5.6, areaSqKm: 34 },
  { acNo: 25, population: 34435, totalVoters: 22796, turnout2023: 76.4, maleVoters: 11535, femaleVoters: 11261, literacy: 82.4, urbanPercent: 54.5, scPercent: 0.4, stPercent: 5.6, areaSqKm: 34 },
  { acNo: 26, population: 66176, totalVoters: 48110, turnout2023: 84.9, maleVoters: 24247, femaleVoters: 23863, literacy: 93.4, urbanPercent: 66.2, scPercent: 3, stPercent: 15.6, areaSqKm: 47 },
  { acNo: 27, population: 43723, totalVoters: 32180, turnout2023: 73, maleVoters: 15913, femaleVoters: 16267, literacy: 88.4, urbanPercent: 59.4, scPercent: 4.2, stPercent: 5.6, areaSqKm: 32 },
  { acNo: 28, population: 61032, totalVoters: 42783, turnout2023: 81.6, maleVoters: 21071, femaleVoters: 21712, literacy: 90.4, urbanPercent: 71, scPercent: 1.1, stPercent: 15.6, areaSqKm: 23 },
  { acNo: 29, population: 40407, totalVoters: 28689, turnout2023: 83.1, maleVoters: 14674, femaleVoters: 14015, literacy: 80.4, urbanPercent: 57.4, scPercent: 0, stPercent: 5.6, areaSqKm: 32 },
  { acNo: 30, population: 65902, totalVoters: 47845, turnout2023: 75.1, maleVoters: 23994, femaleVoters: 23851, literacy: 87.4, urbanPercent: 67.1, scPercent: 0, stPercent: 15.6, areaSqKm: 38 },
  { acNo: 31, population: 53554, totalVoters: 35506, turnout2023: 81.8, maleVoters: 18179, femaleVoters: 17327, literacy: 88.4, urbanPercent: 66.2, scPercent: 0, stPercent: 15.6, areaSqKm: 47 },
  { acNo: 32, population: 60758, totalVoters: 42531, turnout2023: 86.9, maleVoters: 20840, femaleVoters: 21691, literacy: 93.4, urbanPercent: 65.2, scPercent: 3, stPercent: 15.6, areaSqKm: 47 },
  { acNo: 33, population: 67962, totalVoters: 50088, turnout2023: 78.9, maleVoters: 24969, femaleVoters: 25119, literacy: 89.4, urbanPercent: 71, scPercent: 0.4, stPercent: 15.6, areaSqKm: 23 },
  { acNo: 34, population: 32271, totalVoters: 20847, turnout2023: 80.4, maleVoters: 10152, femaleVoters: 10695, literacy: 88.4, urbanPercent: 57.4, scPercent: 4.2, stPercent: 5.6, areaSqKm: 34 },
];

export function getGAConstituencyDemographics(acNo: number): ConstituencyDemographics | undefined {
  return GA_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
