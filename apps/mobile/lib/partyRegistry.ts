import { apiClient } from './api';
import { authManager } from './api/authManager';
import type { KYCStatus } from './contentAccountabilityTypes';

export interface RegistryParty {
  id: string;
  name: string;
  short_name: string;
  local_name?: string | null;
  symbol_url?: string | null;
  page_id: string | null;
}

export type PartyProfileEvidence = { sourceUrl: string } & (
  | { kind: 'founded'; year: number }
  | { kind: 'contributionReport'; period: string }
  | { kind: 'constitution' }
  | { kind: 'assemblyElection'; year: number; state: string }
);

export interface PartyDeclaration {
  organization_id: string;
  is_public: boolean;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'revoked';
export interface PartyClaim {
  id: string;
  organization_id: string;
  status: ClaimStatus;
  review_note: string | null;
}

export interface PartyAccount {
  accountId: string;
  canReviewClaims: boolean;
  contributorStatus: KYCStatus | null;
  declaration: PartyDeclaration | null;
  claims: PartyClaim[];
}

export type PartyTeamRole = 'editor' | 'approver' | 'publisher' | 'moderator';
export interface PartyTeamMember {
  user_id: string;
  role: PartyTeamRole;
}

export interface PartyPageState {
  isFollowing: boolean;
  followerCount: number;
}

const base = '/api/v1/parties';
const account = { authPolicy: 'authenticated' } as const;
const publicRequest = { authPolicy: 'public' } as const;
const path = (id: string) => base + '/' + encodeURIComponent(id);

export async function searchParties(q: string, language: string, offset: number) {
  return (await apiClient.get<{ parties: RegistryParty[]; nextOffset: number | null }>(base, {
    ...publicRequest,
    query: { q, language, offset },
  })).data;
}

export async function getParty(id: string) {
  return (await apiClient.get<RegistryParty & {
    sourceUrl: string | null;
    verifiedAt: string | null;
    profileEvidence?: PartyProfileEvidence[];
    names: { language_code: string; name_value: string }[];
  }>(path(id), publicRequest)).data;
}

export async function getPartyAccount() {
  return (await apiClient.get<PartyAccount>(base + '/me', account)).data;
}

export async function savePartyDeclaration(id: string, visibility: boolean) {
  return (await apiClient.put<{ declaration: PartyDeclaration }>(base + '/me/declaration', {
    partyId: id, public: visibility,
  }, account)).data.declaration;
}

export async function clearPartyDeclaration() {
  await apiClient.delete(base + '/me/declaration', account);
}

export async function getPublicPartyDeclaration(userId: string) {
  return (await apiClient.get<{
    declaration: { organization_id: string; political_organizations: { name: string } } | null;
  }>(base + '/public-declarations/' + encodeURIComponent(userId), publicRequest)).data.declaration;
}

export async function getPartyPage(pageId: string, signedIn: boolean) {
  const token = signedIn ? await authManager.getAccessToken() : null;
  return (await apiClient.get<{ page: PartyPageState }>('/api/v1/pages/' + pageId, {
    ...publicRequest, headers: token ? { Authorization: 'Bearer ' + token } : {},
  })).data.page;
}

export async function canPublishForParty(id: string) {
  return (await apiClient.get<{ canPublish: boolean }>(path(id) + '/publishing-access', account)).data.canPublish;
}

export async function setPartyPageFollow(pageId: string, follow: boolean) {
  const endpoint = '/api/v1/pages/' + pageId + '/follow';
  return (follow
    ? await apiClient.post<PartyPageState>(endpoint, {}, account)
    : await apiClient.delete<PartyPageState>(endpoint, account)
  ).data;
}

export async function submitPartyClaim(id: string, evidenceUrl: string, summary: string) {
  await apiClient.post(path(id) + '/claims', { evidenceUrl, summary }, account);
}

export async function listPartyTeam(id: string) {
  return (await apiClient.get<{ team: PartyTeamMember[] }>(path(id) + '/team', account)).data.team;
}

export async function updatePartyTeam(id: string, memberId: string, role: PartyTeamRole | null) {
  await apiClient.put(path(id) + '/team/' + encodeURIComponent(memberId), { role }, account);
}

export async function listPartyClaims(offset: number) {
  return (await apiClient.get<{
    claims: (PartyClaim & {
      claimant_id: string;
      evidence_url: string;
      authority_summary: string;
      political_organizations: { name: string };
    })[];
    nextOffset: number | null;
  }>(base + '/admin/claims', { ...account, query: { offset } })).data;
}

export async function reviewPartyClaim(id: string, decision: Exclude<ClaimStatus, 'pending'>, note: string) {
  await apiClient.post(base + '/admin/claims/' + id, { decision, note }, account);
}
