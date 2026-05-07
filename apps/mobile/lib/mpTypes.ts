/**
 * Member of Parliament (MP) Profile Types
 *
 * Covers both Lok Sabha (Lower House) and Rajya Sabha (Upper House) members.
 * Data sourced from PRS Legislative Research, Sansad.in, and ECI.
 */

export type HouseType = 'lok_sabha' | 'rajya_sabha';

export interface MPProfile {
  /** Unique MP identifier */
  id: string;
  name: string;
  party: string;
  /** State the MP represents */
  stateCode: string;
  house: HouseType;
  /** Lok Sabha: constituency name; Rajya Sabha: 'Rajya Sabha' */
  constituency?: string;
  /** Lok Sabha constituency number */
  constituencyNo?: number;
  gender: 'M' | 'F';
  age?: number;
  education?: string;
  profession?: string;
  terms: number;
  /** Year first elected to current term */
  electedYear: number;
  /** For Rajya Sabha: term end year */
  termEndYear?: number;
  criminalCases?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  /** Whether this MP is a minister */
  isMinister?: boolean;
  ministerialPortfolio?: string;
  /** Attendance percentage in parliament sessions */
  attendancePercent?: number;
  /** Number of questions asked */
  questionsAsked?: number;
  /** Number of debates participated in */
  debatesParticipated?: number;
  /** Number of private member bills introduced */
  privateBills?: number;
  /** Photo URL (MyNeta/ECI CDN) — use avatar generator if absent */
  photoUrl?: string;
}

export interface PartyStrength {
  party: string;
  lokSabhaSeats: number;
  rajyaSabhaSeats: number;
  totalSeats: number;
  /** Percentage of total seats */
  percentage: number;
  /** Alliance grouping */
  alliance?: 'NDA' | 'INDIA' | 'Others';
}

export interface StateParliamentarySummary {
  stateCode: string;
  stateName: string;
  lokSabhaSeats: number;
  rajyaSabhaSeats: number;
  partyWise: { party: string; lokSabha: number; rajyaSabha: number }[];
}
