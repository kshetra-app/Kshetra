/**
 * @module politicalEntities
 * @description
 * Canonical type contracts for the Political Entity Model (W018).
 * Supports canonical persons, organizations, organization relationships,
 * person roles, party affiliations, candidacies, tenures, party switches, and linkages.
 */

export type GovernanceDataStatus =
  | 'OFFICIAL'
  | 'DERIVED'
  | 'VERIFIED'
  | 'ESTIMATE'
  | 'SCENARIO'
  | 'INFERRED'
  | 'UNVERIFIED'
  | 'UNKNOWN';

export type PoliticalOrgType =
  | 'political_party'
  | 'media_organization'
  | 'civic_organization'
  | 'political_alliance'
  | 'other';

export type PoliticalRoleType =
  | 'mp'
  | 'mla'
  | 'mlc'
  | 'local_representative'
  | 'candidate'
  | 'aspirant'
  | 'journalist'
  | 'party_official';

export type PersonOrgRelationshipType =
  | 'member_of'
  | 'affiliated_with'
  | 'contested_for'
  | 'employed_by';

export type OrganizationRelationshipType =
  | 'alliance_with'
  | 'coalition_partner'
  | 'parent_of'
  | 'subsidiary_of'
  | 'merged_into'
  | 'renamed_to'
  | 'succeeded_by'
  | 'predecessor_of'
  | 'split_from'
  | 'faction_of'
  | 'other';

export type OfficeTypeEnum =
  | 'mp_lok_sabha'
  | 'mp_rajya_sabha'
  | 'mla'
  | 'mlc'
  | 'mayor'
  | 'sarpanch'
  | 'corporator'
  | 'mptc_member'
  | 'zptc_member';

export type ElectionTypeEnum =
  | 'parliamentary'
  | 'assembly'
  | 'local_body'
  | 'by_election';

export type ElectionResultEnum =
  | 'won'
  | 'lost'
  | 'forfeited_deposit'
  | 'withdrawn'
  | 'pending'
  | 'won_uncontested';

export type IdentityMatchMethod =
  | 'exact_eci_id'
  | 'exact_sansad_id'
  | 'user_verified_claim'
  | 'manual_curated'
  | 'deterministic_biographic_tuple';

export interface CanonicalPerson {
  id: string;
  canonicalName: string;
  aliases: string[];
  gender?: 'male' | 'female' | 'other';
  dob?: string | null;
  dobEstimated: boolean;
  photoUrl?: string | null;
  eciCandidateId?: string | null;
  sansadMemberId?: string | null;
  primaryUserId?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PoliticalOrganization {
  id: string;
  orgType: PoliticalOrgType;
  name: string;
  shortName: string;
  ecPartyCode?: string | null;
  recognitionLevel?: 'national' | 'state' | 'unrecognized' | 'registered_unrecognized' | null;
  headquartersState?: string | null;
  parentOrgId?: string | null;
  symbolUrl?: string | null;
  brandColors: {
    primary?: string;
    secondary?: string;
  };
  pageId?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRelationship {
  id: string;
  sourceOrgId: string;
  targetOrgId: string;
  relationshipType: OrganizationRelationshipType;
  validFrom: string;
  validTo?: string | null;
  isCurrent: boolean;
  metadata: Record<string, unknown>;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonRole {
  id: string;
  personId: string;
  roleType: PoliticalRoleType;
  organizationId?: string | null;
  relationshipType: PersonOrgRelationshipType;
  validFrom: string;
  validTo?: string | null;
  isCurrent: boolean;
  roleMetadata: Record<string, unknown>;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonPartyAffiliation {
  id: string;
  personId: string;
  partyId: string;
  validFrom: string;
  validTo?: string | null;
  isCurrent: boolean;
  affiliationType: 'primary_member' | 'office_bearer' | 'associated' | 'expelled' | 'resigned' | 'suspended';
  notes?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Candidacy {
  id: string;
  contestId?: string | null;
  personId: string;
  electionYear: number;
  electionType: ElectionTypeEnum;
  constituencyType: 'parliamentary' | 'assembly' | 'local_body_ward' | 'panchayat';
  constituencyId: string;
  partyId?: string | null;
  isIndependent: boolean;
  result: ElectionResultEnum;
  votesReceived: number;
  evmVotes?: number | null;
  postalVotes?: number | null;
  voteShare: number;
  rank: number;
  affidavitId?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TenureStatusEnum =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'VACATED_RESIGNATION'
  | 'VACATED_DEATH'
  | 'VACATED_DISQUALIFICATION'
  | 'ANNULLED'
  | 'PROVISIONAL';

export interface ElectedTenure {
  id: string;
  personId: string;
  officeType: OfficeTypeEnum;
  jurisdictionType: string;
  jurisdictionId: string;
  constituencyVersionId?: string | null;
  termStart: string;
  termEnd?: string | null;
  isCurrent: boolean;
  tenureStatus?: TenureStatusEnum;
  partyAtElection?: string | null;
  currentParty?: string | null;
  defectionDate?: string | null;
  candidacyId?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenurePartySwitch {
  id: string;
  tenureId: string;
  personId: string;
  fromPartyId: string;
  toPartyId: string;
  effectiveDate: string;
  switchType: 'defection' | 'merger' | 'expulsion' | 'resignation' | 'unaligned';
  gazetteReference?: string | null;
  notes?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
}

export interface PersonMultilingualIdentity {
  id: string;
  personId: string;
  languageCode: string;
  scriptCode: string;
  representationType: 'OFFICIAL' | 'PREFERRED' | 'SOURCE_NATIVE' | 'TRANSLITERATION' | 'ALIAS' | 'HISTORICAL';
  representationValue: string;
  isPreferred: boolean;
  isOfficial: boolean;
  validFrom: string;
  validTo?: string | null;
  source?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenureVacancy {
  id: string;
  tenureId: string;
  personId: string;
  vacancyReason: 'DEATH' | 'RESIGNATION' | 'DISQUALIFICATION_TENTH_SCHEDULE' | 'DISQUALIFICATION_RPA_SEC_8' | 'ELECTION_ANNULLED_COURT_ORDER' | 'EXPULSION' | 'VACANCY_GAZETTED';
  effectiveDate: string;
  notifyingAuthority: string;
  gazetteNotificationRef?: string | null;
  notes?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonIdentityLinkage {
  id: string;
  personId: string;
  sourceSystem: string;
  sourceRecordId: string;
  matchMethod: IdentityMatchMethod;
  confidence: number;
  curatedBy: string;
  curatedAt: string;
  isActive: boolean;
  provenanceId?: string | null;
  createdAt: string;
}

export interface OrganizationMultilingualName {
  id: string;
  organizationId: string;
  languageCode: string;
  scriptCode: string;
  representationType: 'OFFICIAL' | 'PREFERRED' | 'SOURCE_NATIVE' | 'TRANSLITERATION' | 'ALIAS' | 'HISTORICAL';
  nameValue: string;
  shortNameValue?: string | null;
  isPreferred: boolean;
  isOfficial: boolean;
  validFrom: string;
  validTo?: string | null;
  source?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAlias {
  id: string;
  rawLookupKey: string;
  rawOriginalString: string;
  organizationId: string;
  aliasType: 'STANDARD_ABBREVIATION' | 'TYPOGRAPHIC_VARIANT' | 'HISTORICAL_PREDECESSOR' | 'ECI_PARTY_CODE' | 'REGIONAL_VARIANT' | 'POPULAR_NAME';
  jurisdictionScope?: string | null;
  validFrom: string;
  validTo?: string | null;
  confidence: 'VERIFIED' | 'RECONCILED' | 'PROVISIONAL' | 'CONFLICTING';
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSymbol {
  id: string;
  organizationId: string;
  symbolName: string;
  symbolUrl?: string | null;
  jurisdictionScope?: string | null;
  validFrom: string;
  validTo?: string | null;
  isCurrent: boolean;
  statutoryOrderRef?: string | null;
  dataStatus: GovernanceDataStatus;
  provenanceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoliticalCareerTimeline {
  person: CanonicalPerson;
  activeRoles: PersonRole[];
  affiliations: PersonPartyAffiliation[];
  tenures: ElectedTenure[];
  partySwitches: TenurePartySwitch[];
  candidacies: Candidacy[];
  linkages?: PersonIdentityLinkage[];
  multilingualIdentities?: PersonMultilingualIdentity[];
  vacancies?: TenureVacancy[];
}


