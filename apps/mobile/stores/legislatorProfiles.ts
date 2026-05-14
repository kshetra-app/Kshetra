/**
 * Legislator Profiles Store — Manages full LegislatorProfile data for the app.
 * Loads from static JSON (bundled) or Supabase, provides queries by state/constituency/id.
 */
import { create } from 'zustand';

export interface LegislatorProfileSummary {
  id: string;
  fullName: string;
  displayName: string;
  party: string;
  constituency: string;
  district: string;
  stateCode: string;
  house: string;
  photoUrl: string | null;
  age: number | null;
  totalAssets: number;
  criminalCases: number;
  termsServed: number;
  isCurrentMember: boolean;
  isCrorepati: boolean;
  dataCompleteness: number;
}

interface LegislatorProfilesState {
  profiles: any[];
  isLoaded: boolean;
  loadProfiles: (stateCode: string) => void;
  getProfileById: (id: string) => any | null;
  getProfilesForState: (stateCode: string) => any[];
  getProfileForConstituency: (stateCode: string, constituencyName: string) => any | null;
  getCurrentMembers: (stateCode: string) => any[];
  getSummaries: (stateCode: string) => LegislatorProfileSummary[];
}

export const useLegislatorProfilesStore = create<LegislatorProfilesState>((set, get) => ({
  profiles: [],
  isLoaded: false,

  loadProfiles: (stateCode: string) => {
    try {
      // In production, this would fetch from Supabase or cached JSON
      // For now, attempt to load from the bundled data file
      const allProfiles = require('../data/legislator-profiles.json');
      const stateProfiles = allProfiles.filter((p: any) => p.career?.stateCode === stateCode);
      set({ profiles: stateProfiles.length > 0 ? stateProfiles : allProfiles, isLoaded: true });
    } catch {
      set({ profiles: [], isLoaded: true });
    }
  },

  getProfileById: (id: string) => {
    return get().profiles.find((p: any) => p.id === id) ?? null;
  },

  getProfilesForState: (stateCode: string) => {
    return get().profiles.filter((p: any) => p.career?.stateCode === stateCode);
  },

  getProfileForConstituency: (stateCode: string, constituencyName: string) => {
    const normalized = constituencyName.toLowerCase().replace(/[^a-z]/g, '');
    return get().profiles.find((p: any) => {
      if (p.career?.stateCode !== stateCode) return false;
      const pNorm = (p.career?.constituencyName || '').toLowerCase().replace(/[^a-z]/g, '');
      return pNorm === normalized;
    }) ?? null;
  },

  getCurrentMembers: (stateCode: string) => {
    return get().profiles.filter((p: any) =>
      p.career?.stateCode === stateCode && p.career?.isCurrentMember === true
    );
  },

  getSummaries: (stateCode: string) => {
    return get().profiles
      .filter((p: any) => p.career?.stateCode === stateCode)
      .map((p: any) => ({
        id: p.id,
        fullName: p.personal?.fullName || '',
        displayName: p.personal?.displayName || '',
        party: p.career?.currentParty || '',
        constituency: p.career?.constituencyName || '',
        district: p.career?.district || '',
        stateCode: p.career?.stateCode || '',
        house: p.career?.house || '',
        photoUrl: p.personal?.photoUrl || null,
        age: p.personal?.currentAge || p.personal?.ageAtElection || null,
        totalAssets: p.financialHistory?.length > 0
          ? p.financialHistory[p.financialHistory.length - 1]?.totalAssets || 0
          : 0,
        criminalCases: p.criminalRecord?.totalCases || 0,
        termsServed: p.career?.termsServed || 0,
        isCurrentMember: p.career?.isCurrentMember || false,
        isCrorepati: p.financialHistory?.length > 0
          ? (p.financialHistory[p.financialHistory.length - 1]?.totalAssets || 0) >= 1_00_00_000
          : false,
        dataCompleteness: p.sources?.dataCompleteness || 0,
      }));
  },
}));
