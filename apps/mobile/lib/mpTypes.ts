/**
 * Member of Parliament (MP) Profile Types
 *
 * Covers both Lok Sabha (Lower House) and Rajya Sabha (Upper House) members.
 * Data sourced from PRS Legislative Research, Sansad.in, and ECI.
 */

export type { MPProfile, HouseType } from '../../../data/seed/mp-profiles';

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
