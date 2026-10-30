/**
 * Aspirant, Community Pages & Leadership Academy Service
 * Master Product Blueprint — Domain 4 (JOB 046 - JOB 050)
 * Ratified under DEC-176 and DEC-177
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  AspirantRegistrationRequest,
  AspirantKYCSubmissionRequest,
  AspirantKYCRecordDTO,
  AspirantPublicProfileDTO,
  PageCreateRequest,
  PageDTO,
  PageEventCreateRequest,
  PageEventDTO,
  PageEventRsvpStatus,
  GroupRole,
  CommunityGroupDTO,
  LeadershipModuleDTO,
  QuizQuestionDTO,
  QuizSubmissionRequest,
  QuizResultDTO,
} from '@kshetra/shared';

// Authoritative Academy Curriculum and Quiz Registry
export interface AcademyModuleData extends LeadershipModuleDTO {
  sections?: Array<{ heading: string; body: string }>;
  keyTakeaways?: string[];
  quiz?: QuizQuestionDTO[];
}

export const ACADEMY_CURRICULUM: Record<string, AcademyModuleData> = {
  'mod-1': {
    id: 'mod-1',
    title: 'How Indian Elections Work',
    description: 'Understand the complete election process — from nominations to counting day. Learn about ECI, EVMs, VVPATs, and electoral rolls.',
    category: 'electoral_process',
    contentType: 'article',
    durationMinutes: 15,
    difficulty: 'beginner',
    isPremium: false,
    sortOrder: 1,
    quiz: [
      {
        id: 'q1-1',
        question: 'Under which Article of the Constitution is the Election Commission of India established?',
        options: ['Article 324', 'Article 356', 'Article 370', 'Article 280'],
        correctIndex: 0,
        explanation: 'Article 324 vests the superintendence, direction and control of elections in the Election Commission.',
      },
      {
        id: 'q1-2',
        question: 'What is the full form of VVPAT?',
        options: [
          'Voter Verified Paper Audit Trail',
          'Verified Voter Public Access Terminal',
          'Voting Verification Protocol And Technology',
          'Voter Validated Physical Assessment Tool',
        ],
        correctIndex: 0,
        explanation: 'VVPAT stands for Voter Verified Paper Audit Trail, providing a physical paper slip verifying the vote cast on the EVM.',
      },
    ],
  },
  'mod-2': {
    id: 'mod-2',
    title: 'Filing Your Nomination',
    description: 'Step-by-step guide to filing nomination papers, required documents, security deposits, affidavits, and common rejection reasons.',
    category: 'electoral_process',
    contentType: 'article',
    durationMinutes: 20,
    difficulty: 'intermediate',
    isPremium: false,
    sortOrder: 2,
    quiz: [
      {
        id: 'q2-1',
        question: 'Which affidavit form is mandatory for candidates to declare assets, liabilities, and criminal antecedents?',
        options: ['Form 26', 'Form 7', 'Form 16', 'Form 20'],
        correctIndex: 0,
        explanation: 'Form 26 is the statutory affidavit mandated by the Supreme Court of India and ECI rules.',
      },
      {
        id: 'q2-2',
        question: 'What is the security deposit for an Assembly election candidate in general category?',
        options: ['₹10,000', '₹25,000', '₹50,000', '₹5,000'],
        correctIndex: 0,
        explanation: 'Under Section 34 of RPA 1951, the security deposit for an Assembly constituency is ₹10,000 (₹5,000 for SC/ST).',
      },
    ],
  },
  'mod-3': {
    id: 'mod-3',
    title: 'Understanding Election Symbols',
    description: 'How party symbols work, reserved vs free symbols, how independents get symbols, and the legal framework.',
    category: 'electoral_process',
    contentType: 'quiz',
    durationMinutes: 10,
    difficulty: 'beginner',
    isPremium: false,
    sortOrder: 3,
    quiz: [
      {
        id: 'q3-1',
        question: 'Which order governs the allotment of election symbols in India?',
        options: [
          'The Election Symbols (Reservation and Allotment) Order, 1968',
          'The Representation of the People Act, 1950',
          'The Delimitation Act, 2002',
          'The Conduct of Elections Rules, 1961',
        ],
        correctIndex: 0,
        explanation: 'The Election Symbols (Reservation and Allotment) Order, 1968 governs the reservation and allotment of symbols.',
      },
      {
        id: 'q3-2',
        question: 'An independent candidate is normally allotted what category of symbol?',
        options: ['A reserved symbol', 'A free symbol', 'A permanent party emblem', 'The state emblem'],
        correctIndex: 1,
        explanation: 'Independents choose from the ECI common pool of free symbols specified for each election.',
      },
      {
        id: 'q3-3',
        question: 'Who adjudicates symbol disputes when a recognized political party splits?',
        options: ['The Supreme Court', 'The Election Commission of India', 'Parliamentary Committee', 'The Law Commission'],
        correctIndex: 1,
        explanation: 'Under Paragraph 15 of the Symbols Order 1968, the Election Commission of India decides symbol disputes.',
      },
    ],
  },
  'mod-4': {
    id: 'mod-4',
    title: 'Building a Grassroots Campaign',
    description: 'Learn how to build a winning ground-level campaign — booth-level strategy, volunteer networks, and door-to-door canvassing.',
    category: 'campaign_strategy',
    contentType: 'case_study',
    durationMinutes: 25,
    difficulty: 'intermediate',
    isPremium: false,
    sortOrder: 4,
    quiz: [
      {
        id: 'q4-1',
        question: 'Approximately how many voters typically fall under a single polling booth in an Indian constituency?',
        options: ['1,000 to 1,500', '5,000 to 10,000', '100 to 300', '15,000 to 20,000'],
        correctIndex: 0,
        explanation: 'An average Indian polling station is designed for roughly 1,000 to 1,500 electors.',
      },
    ],
  },
};

export class AspirantService {
  // In-memory runtime fallbacks for test isolation & staging resilience
  private static mockProfiles = new Map<string, any>();
  private static mockVerifications = new Map<string, AspirantKYCRecordDTO[]>();
  private static mockPages = new Map<string, PageDTO>();
  private static mockPageFollowers = new Set<string>(); // "pageId:userId"
  private static mockPageEvents = new Map<string, PageEventDTO[]>();
  private static mockEventRsvps = new Map<string, PageEventRsvpStatus>(); // "eventId:userId"
  private static mockModuleProgress = new Map<string, { completed: boolean; quizScore?: number; startedAt: string }>(); // "userId:moduleId"
  private static mockBadges = new Map<string, Array<{ badgeType: string; earnedAt: string }>>(); // "userId"

  static resetMockState() {
    this.mockProfiles.clear();
    this.mockVerifications.clear();
    this.mockPages.clear();
    this.mockPageFollowers.clear();
    this.mockPageEvents.clear();
    this.mockEventRsvps.clear();
    this.mockModuleProgress.clear();
    this.mockBadges.clear();
  }

  static mapProfileRow(row: any): any {
    if (!row) return null;
    return {
      id: String(row.id),
      userId: row.user_id || row.userId,
      displayName: row.display_name || row.displayName,
      bio: row.bio || undefined,
      avatarUrl: row.avatar_url || row.avatarUrl || undefined,
      stateCode: row.state_code || row.stateCode,
      targetConstituencyAcNo: row.target_constituency_ac_no ?? row.targetConstituencyAcNo ?? undefined,
      targetConstituencyName: row.target_constituency_name ?? row.targetConstituencyName ?? undefined,
      targetElectionYear: row.target_election_year ?? row.targetElectionYear ?? undefined,
      partyAffiliation: row.party_affiliation ?? row.partyAffiliation ?? 'Independent',
      isIndependent: row.is_independent ?? row.isIndependent ?? true,
      manifestoUrl: row.manifesto_url ?? row.manifestoUrl ?? undefined,
      visionSummary: row.vision_summary ?? row.visionSummary ?? undefined,
      hasCriminalCases: row.has_criminal_cases ?? row.hasCriminalCases ?? false,
      criminalCasesDetails: row.criminal_cases_details ?? row.criminalCasesDetails ?? undefined,
      handle: row.handle ?? undefined,
      verificationTier: row.verification_tier ?? row.verificationTier ?? 'tier1',
      verificationStatus: row.verification_status ?? row.verificationStatus ?? 'unverified',
      civicScore: row.civic_score ?? row.civicScore ?? 0,
      issuesReported: row.issues_reported ?? row.issuesReported ?? 0,
      issuesResolved: row.issues_resolved ?? row.issuesResolved ?? 0,
      communityEndorsements: row.community_endorsements ?? row.communityEndorsements ?? 0,
      modulesCompleted: row.modules_completed ?? row.modulesCompleted ?? 0,
      badges: row.badges ?? [],
      upcomingEvents: row.upcomingEvents ?? [],
      createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
    };
  }

  // ─── 1. ASPIRANT REGISTRATION (JOB 046) ───

  static async registerAspirant(
    userId: string,
    req: AspirantRegistrationRequest,
  ): Promise<any> {
    if (!req.displayName || req.displayName.trim().length < 2) {
      throw new Error('DISPLAY_NAME_REQUIRED');
    }
    if (!req.stateCode) {
      throw new Error('STATE_CODE_REQUIRED');
    }

    const now = new Date().toISOString();
    const cleanHandle = req.handle ? req.handle.trim().toLowerCase().replace(/^@/, '') : undefined;

    // Check handle uniqueness
    if (cleanHandle) {
      if (isSupabaseConfigured) {
        const { data: existing } = await supabase
          .from('aspirant_profiles')
          .select('id, user_id')
          .eq('handle', cleanHandle)
          .maybeSingle();

        if (existing && existing.user_id !== userId) {
          throw new Error('HANDLE_ALREADY_TAKEN');
        }
      } else {
        for (const p of this.mockProfiles.values()) {
          if (p.handle === cleanHandle && p.userId !== userId) {
            throw new Error('HANDLE_ALREADY_TAKEN');
          }
        }
      }
    }

    const record = {
      user_id: userId,
      display_name: req.displayName.trim(),
      bio: req.bio?.trim() || null,
      state_code: req.stateCode,
      target_constituency_ac_no: req.targetConstituencyAcNo || null,
      target_constituency_name: req.targetConstituencyName || null,
      target_election_year: req.targetElectionYear || 2029,
      party_affiliation: req.partyAffiliation || 'Independent',
      is_independent: req.isIndependent ?? true,
      manifesto_url: req.manifestoUrl || null,
      vision_summary: req.visionSummary || null,
      has_criminal_cases: req.hasCriminalCases ?? false,
      criminal_cases_details: req.criminalCasesDetails || null,
      handle: cleanHandle || null,
      verification_tier: 'tier1',
      verification_status: 'unverified',
      updated_at: now,
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('aspirant_profiles')
        .upsert(record, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (error) {
        throw new Error(`DB_ERROR: ${error.message}`);
      }
      return this.mapProfileRow(data);
    }

    // In-memory fallback
    const id = this.mockProfiles.get(userId)?.id || `asp-${Date.now()}`;
    const saved = {
      id,
      userId,
      ...record,
      displayName: req.displayName.trim(),
      stateCode: req.stateCode,
      targetConstituencyAcNo: req.targetConstituencyAcNo || null,
      targetConstituencyName: req.targetConstituencyName || null,
      targetElectionYear: req.targetElectionYear || 2029,
      partyAffiliation: req.partyAffiliation || 'Independent',
      isIndependent: req.isIndependent ?? true,
      manifestoUrl: req.manifestoUrl || null,
      visionSummary: req.visionSummary || null,
      hasCriminalCases: req.hasCriminalCases ?? false,
      criminalCasesDetails: req.criminalCasesDetails || null,
      handle: cleanHandle || null,
      verificationTier: 'tier1',
      verificationStatus: 'unverified',
      civicScore: this.mockProfiles.get(userId)?.civicScore || 0,
      issuesReported: this.mockProfiles.get(userId)?.issuesReported || 0,
      issuesResolved: this.mockProfiles.get(userId)?.issuesResolved || 0,
      communityEndorsements: this.mockProfiles.get(userId)?.communityEndorsements || 0,
      modulesCompleted: this.mockProfiles.get(userId)?.modulesCompleted || 0,
      isPublic: true,
      createdAt: this.mockProfiles.get(userId)?.createdAt || now,
    };
    this.mockProfiles.set(userId, saved);
    return this.mapProfileRow(saved);
  }

  // ─── 2. ASPIRANT KYC VERIFICATION (JOB 046 - DEC-177 Decision 1) ───

  static async submitKYC(
    userId: string,
    req: AspirantKYCSubmissionRequest,
  ): Promise<AspirantKYCRecordDTO> {
    if (!req.statutoryDeclarationAccepted) {
      throw new Error('STATUTORY_DECLARATION_REQUIRED');
    }
    if (!req.documentHash || req.documentHash.length < 16) {
      throw new Error('INVALID_DOCUMENT_HASH');
    }

    const now = new Date().toISOString();
    let aspirantId: string | null = null;

    if (isSupabaseConfigured) {
      const { data: profile } = await supabase
        .from('aspirant_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) throw new Error('ASPIRANT_NOT_REGISTERED');
      aspirantId = profile.id;

      // Tier 2 promotion for statutory affidavits / voter id
      const tier = (req.documentType === 'election_affidavit' || req.documentType === 'voter_id') ? 'tier2' : 'tier1';
      const status = 'pending';

      const { data, error } = await supabase
        .from('aspirant_verifications')
        .upsert({
          aspirant_id: aspirantId,
          user_id: userId,
          document_type: req.documentType,
          document_hash: req.documentHash,
          document_url: req.documentUrl || null,
          verification_tier: tier,
          verification_status: status,
          statutory_declaration_accepted: true,
          updated_at: now,
        }, { onConflict: 'aspirant_id,document_type' })
        .select('*')
        .single();

      if (error) throw new Error(`KYC_DB_ERROR: ${error.message}`);

      // Update aspirant profile status
      await supabase
        .from('aspirant_profiles')
        .update({
          verification_tier: tier,
          verification_status: status,
          updated_at: now,
        })
        .eq('id', aspirantId);

      return {
        id: data.id,
        aspirantId: data.aspirant_id,
        documentType: data.document_type,
        verificationTier: data.verification_tier,
        verificationStatus: data.verification_status,
        rejectionReason: data.rejection_reason || undefined,
        reviewedAt: data.reviewed_at || undefined,
        statutoryDeclarationAccepted: data.statutory_declaration_accepted,
        createdAt: data.created_at,
      };
    }

    const profile = this.mockProfiles.get(userId);
    if (!profile) throw new Error('ASPIRANT_NOT_REGISTERED');
    const targetAspirantId = String(profile.id);

    const tier = (req.documentType === 'election_affidavit' || req.documentType === 'voter_id') ? 'tier2' : 'tier1';
    const status = 'pending';

    const kycRecord: AspirantKYCRecordDTO = {
      id: `kyc-${Date.now()}`,
      aspirantId: targetAspirantId,
      documentType: req.documentType,
      verificationTier: tier,
      verificationStatus: status,
      statutoryDeclarationAccepted: true,
      createdAt: now,
    };

    const existing = this.mockVerifications.get(targetAspirantId) || [];
    const filtered = existing.filter(k => k.documentType !== req.documentType);
    filtered.push(kycRecord);
    this.mockVerifications.set(targetAspirantId, filtered);

    profile.verification_tier = tier;
    profile.verification_status = status;
    return kycRecord;
  }

  static async getKYCStatus(userId: string): Promise<AspirantKYCRecordDTO[]> {
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('aspirant_verifications')
        .select('*')
        .eq('user_id', userId);

      return (data || []).map(d => ({
        id: d.id,
        aspirantId: d.aspirant_id,
        documentType: d.document_type,
        verificationTier: d.verification_tier,
        verificationStatus: d.verification_status,
        rejectionReason: d.rejection_reason || undefined,
        reviewedAt: d.reviewed_at || undefined,
        statutoryDeclarationAccepted: d.statutory_declaration_accepted,
        createdAt: d.created_at,
      }));
    }

    const profile = this.mockProfiles.get(userId);
    if (!profile) return [];
    return this.mockVerifications.get(profile.id) || [];
  }

  // ─── 3. PUBLIC PROFILE & AGGREGATED TIMELINE (JOB 047) ───

  static async getPublicProfile(idOrHandle: string): Promise<AspirantPublicProfileDTO | null> {
    let profile: any = null;

    if (isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrHandle);
      const query = supabase.from('aspirant_profiles').select('*');
      const { data } = isUuid
        ? await query.eq('id', idOrHandle).maybeSingle()
        : await query.eq('handle', idOrHandle.toLowerCase().replace(/^@/, '')).maybeSingle();

      if (!data) return null;
      profile = data;

      // Fetch badges
      const { data: badgesData } = await supabase
        .from('civic_badges')
        .select('badge_type, earned_at')
        .eq('user_id', profile.user_id);

      const badges = (badgesData || []).map(b => ({
        badgeType: b.badge_type,
        earnedAt: b.earned_at,
      }));

      // Fetch upcoming page events
      const { data: pageData } = await supabase
        .from('pages')
        .select('id')
        .eq('owner_id', profile.user_id)
        .maybeSingle();

      let upcomingEvents: PageEventDTO[] = [];
      if (pageData) {
        upcomingEvents = await this.listPageEvents(pageData.id);
      }

      return {
        id: profile.id,
        userId: profile.user_id,
        displayName: profile.display_name,
        bio: profile.bio || undefined,
        avatarUrl: profile.avatar_url || undefined,
        stateCode: profile.state_code,
        targetConstituencyAcNo: profile.target_constituency_ac_no || undefined,
        targetConstituencyName: profile.target_constituency_name || undefined,
        targetElectionYear: profile.target_election_year || 2029,
        partyAffiliation: profile.party_affiliation || 'Independent',
        isIndependent: profile.is_independent,
        verificationTier: profile.verification_tier || 'tier1',
        verificationStatus: profile.verification_status || 'unverified',
        manifestoUrl: profile.manifesto_url || undefined,
        visionSummary: profile.vision_summary || undefined,
        hasCriminalCases: Boolean(profile.has_criminal_cases),
        criminalCasesDetails: profile.criminal_cases_details || undefined,
        handle: profile.handle || undefined,
        civicScore: profile.civic_score || 0,
        issuesReported: profile.issues_reported || 0,
        issuesResolved: profile.issues_resolved || 0,
        communityEndorsements: profile.community_endorsements || 0,
        modulesCompleted: profile.modules_completed || 0,
        badges,
        upcomingEvents,
        createdAt: profile.created_at,
      };
    }

    // In-memory fallback
    for (const p of this.mockProfiles.values()) {
      if (p.id === idOrHandle || p.handle === idOrHandle.toLowerCase().replace(/^@/, '')) {
        profile = p;
        break;
      }
    }
    if (!profile) return null;

    const badges = this.mockBadges.get(profile.userId) || [];
    let upcomingEvents: PageEventDTO[] = [];
    for (const pg of this.mockPages.values()) {
      if (pg.ownerId === profile.userId) {
        upcomingEvents = this.mockPageEvents.get(pg.id) || [];
        break;
      }
    }

    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.display_name || profile.displayName,
      bio: profile.bio || undefined,
      avatarUrl: profile.avatarUrl || undefined,
      stateCode: profile.state_code || profile.stateCode,
      targetConstituencyAcNo: profile.target_constituency_ac_no || profile.targetConstituencyAcNo,
      targetConstituencyName: profile.target_constituency_name || profile.targetConstituencyName,
      targetElectionYear: profile.target_election_year || profile.targetElectionYear || 2029,
      partyAffiliation: profile.party_affiliation || profile.partyAffiliation || 'Independent',
      isIndependent: profile.is_independent ?? profile.isIndependent ?? true,
      verificationTier: profile.verification_tier || 'tier1',
      verificationStatus: profile.verification_status || 'unverified',
      manifestoUrl: profile.manifesto_url || profile.manifestoUrl,
      visionSummary: profile.vision_summary || profile.visionSummary,
      hasCriminalCases: Boolean(profile.has_criminal_cases),
      criminalCasesDetails: profile.criminal_cases_details,
      handle: profile.handle || undefined,
      civicScore: profile.civicScore || 0,
      issuesReported: profile.issuesReported || 0,
      issuesResolved: profile.issuesResolved || 0,
      communityEndorsements: profile.communityEndorsements || 0,
      modulesCompleted: profile.modulesCompleted || 0,
      badges,
      upcomingEvents,
      createdAt: profile.createdAt || new Date().toISOString(),
    };
  }

  // ─── 4. ASPIRANT PAGES & EVENT DISPATCHING ENGINE (JOB 048 - DEC-177 Decision 2) ───

  static async createPage(userId: string, req: PageCreateRequest): Promise<PageDTO> {
    if (!req.title || req.title.trim().length < 2) {
      throw new Error('PAGE_TITLE_REQUIRED');
    }
    if (!req.handle || req.handle.trim().length < 2) {
      throw new Error('PAGE_HANDLE_REQUIRED');
    }

    const cleanHandle = req.handle.trim().toLowerCase().replace(/^@/, '');
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data: existing } = await supabase
        .from('pages')
        .select('id')
        .eq('handle', cleanHandle)
        .maybeSingle();

      if (existing) {
        throw new Error('PAGE_HANDLE_ALREADY_EXISTS');
      }

      const { data, error } = await supabase
        .from('pages')
        .insert({
          owner_id: userId,
          title: req.title.trim(),
          handle: cleanHandle,
          role: req.role,
          category: req.category || 'political',
          bio: req.bio || null,
          constituency_id: req.constituencyId || null,
          state_code: req.stateCode || null,
          avatar_url: req.avatarUrl || null,
          banner_url: req.bannerUrl || null,
        })
        .select('*')
        .single();

      if (error) throw new Error(`PAGE_DB_ERROR: ${error.message}`);

      return {
        id: data.id,
        ownerId: data.owner_id,
        title: data.title,
        handle: data.handle,
        role: data.role,
        category: data.category,
        bio: data.bio || undefined,
        avatarUrl: data.avatar_url || undefined,
        bannerUrl: data.banner_url || undefined,
        constituencyId: data.constituency_id || undefined,
        stateCode: data.state_code || undefined,
        isPro: Boolean(data.is_pro),
        followerCount: data.follower_count || 0,
        postCount: data.post_count || 0,
        createdAt: data.created_at,
      };
    }

    for (const pg of this.mockPages.values()) {
      if (pg.handle === cleanHandle) {
        throw new Error('PAGE_HANDLE_ALREADY_EXISTS');
      }
    }

    const id = `page-${Date.now()}`;
    const page: PageDTO = {
      id,
      ownerId: userId,
      title: req.title.trim(),
      handle: cleanHandle,
      role: req.role,
      category: req.category || 'political',
      bio: req.bio || undefined,
      avatarUrl: req.avatarUrl || undefined,
      bannerUrl: req.bannerUrl || undefined,
      constituencyId: req.constituencyId || undefined,
      stateCode: req.stateCode || undefined,
      isPro: false,
      followerCount: 0,
      postCount: 0,
      createdAt: now,
    };
    this.mockPages.set(id, page);
    return page;
  }

  static async getPage(idOrHandle: string, currentUserId?: string): Promise<PageDTO | null> {
    if (isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrHandle);
      const query = supabase.from('pages').select('*');
      const { data } = isUuid
        ? await query.eq('id', idOrHandle).maybeSingle()
        : await query.eq('handle', idOrHandle.toLowerCase().replace(/^@/, '')).maybeSingle();

      if (!data) return null;

      let isFollowing = false;
      if (currentUserId) {
        const { data: follow } = await supabase
          .from('page_followers')
          .select('id')
          .eq('page_id', data.id)
          .eq('user_id', currentUserId)
          .maybeSingle();
        isFollowing = Boolean(follow);
      }

      return {
        id: data.id,
        ownerId: data.owner_id,
        title: data.title,
        handle: data.handle,
        role: data.role,
        category: data.category,
        bio: data.bio || undefined,
        avatarUrl: data.avatar_url || undefined,
        bannerUrl: data.banner_url || undefined,
        constituencyId: data.constituency_id || undefined,
        stateCode: data.state_code || undefined,
        isPro: Boolean(data.is_pro),
        followerCount: data.follower_count || 0,
        postCount: data.post_count || 0,
        isFollowing,
        createdAt: data.created_at,
      };
    }

    let page: PageDTO | null = null;
    for (const pg of this.mockPages.values()) {
      if (pg.id === idOrHandle || pg.handle === idOrHandle.toLowerCase().replace(/^@/, '')) {
        page = pg;
        break;
      }
    }
    if (!page) return null;

    const isFollowing = currentUserId ? this.mockPageFollowers.has(`${page.id}:${currentUserId}`) : false;
    return { ...page, isFollowing };
  }

  static async toggleFollowPage(pageId: string, userId: string, follow: boolean): Promise<{ pageId: string; isFollowing: boolean; followerCount: number }> {
    if (isSupabaseConfigured) {
      if (follow) {
        await supabase
          .from('page_followers')
          .upsert({ page_id: pageId, user_id: userId }, { onConflict: 'page_id,user_id' });
      } else {
        await supabase
          .from('page_followers')
          .delete()
          .eq('page_id', pageId)
          .eq('user_id', userId);
      }

      const { data: pg } = await supabase.from('pages').select('follower_count').eq('id', pageId).single();
      return {
        pageId,
        isFollowing: follow,
        followerCount: pg?.follower_count || 0,
      };
    }

    const key = `${pageId}:${userId}`;
    const page = this.mockPages.get(pageId);
    if (follow) {
      if (!this.mockPageFollowers.has(key)) {
        this.mockPageFollowers.add(key);
        if (page) page.followerCount = (page.followerCount || 0) + 1;
      }
    } else {
      if (this.mockPageFollowers.has(key)) {
        this.mockPageFollowers.delete(key);
        if (page) page.followerCount = Math.max(0, (page.followerCount || 0) - 1);
      }
    }

    return {
      pageId,
      isFollowing: follow,
      followerCount: page?.followerCount || 0,
    };
  }

  static async createPageEvent(pageId: string, userId: string, req: PageEventCreateRequest): Promise<PageEventDTO> {
    if (!req.title || req.title.trim().length < 3) throw new Error('EVENT_TITLE_REQUIRED');
    if (!req.startTime) throw new Error('START_TIME_REQUIRED');

    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('page_events')
        .insert({
          page_id: pageId,
          title: req.title.trim(),
          description: req.description || null,
          event_type: req.eventType,
          start_time: req.startTime,
          end_time: req.endTime || null,
          venue_name: req.venueName || null,
          venue_address: req.venueAddress || null,
          constituency_id: req.constituencyId || null,
          latitude: req.latitude || null,
          longitude: req.longitude || null,
          is_virtual: req.isVirtual ?? false,
          meeting_link: req.meetingLink || null,
          dispatched_to_followers: true,
          dispatched_at: now,
        })
        .select('*')
        .single();

      if (error) throw new Error(`EVENT_DB_ERROR: ${error.message}`);

      return {
        id: data.id,
        pageId: data.page_id,
        title: data.title,
        description: data.description || undefined,
        eventType: data.event_type,
        startTime: data.start_time,
        endTime: data.end_time || undefined,
        venueName: data.venue_name || undefined,
        venueAddress: data.venue_address || undefined,
        constituencyId: data.constituency_id || undefined,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
        isVirtual: data.is_virtual,
        meetingLink: data.meeting_link || undefined,
        rsvpCount: data.rsvp_count || 0,
        dispatchedToFollowers: data.dispatched_to_followers,
        createdAt: data.created_at,
      };
    }

    const id = `event-${Date.now()}`;
    const event: PageEventDTO = {
      id,
      pageId,
      title: req.title.trim(),
      description: req.description,
      eventType: req.eventType,
      startTime: req.startTime,
      endTime: req.endTime,
      venueName: req.venueName,
      venueAddress: req.venueAddress,
      constituencyId: req.constituencyId,
      latitude: req.latitude,
      longitude: req.longitude,
      isVirtual: req.isVirtual ?? false,
      meetingLink: req.meetingLink,
      rsvpCount: 0,
      dispatchedToFollowers: true,
      createdAt: now,
    };

    const existing = this.mockPageEvents.get(pageId) || [];
    existing.push(event);
    this.mockPageEvents.set(pageId, existing);
    return event;
  }

  static async listPageEvents(pageId: string, currentUserId?: string): Promise<PageEventDTO[]> {
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('page_events')
        .select('*')
        .eq('page_id', pageId)
        .order('start_time', { ascending: false });

      const events = data || [];
      return events.map(e => ({
        id: e.id,
        pageId: e.page_id,
        title: e.title,
        description: e.description || undefined,
        eventType: e.event_type,
        startTime: e.start_time,
        endTime: e.end_time || undefined,
        venueName: e.venue_name || undefined,
        venueAddress: e.venue_address || undefined,
        constituencyId: e.constituency_id || undefined,
        latitude: e.latitude ? Number(e.latitude) : undefined,
        longitude: e.longitude ? Number(e.longitude) : undefined,
        isVirtual: e.is_virtual,
        meetingLink: e.meeting_link || undefined,
        rsvpCount: e.rsvp_count || 0,
        dispatchedToFollowers: e.dispatched_to_followers,
        createdAt: e.created_at,
      }));
    }

    const events = this.mockPageEvents.get(pageId) || [];
    return events.map(e => ({
      ...e,
      userRsvp: currentUserId ? this.mockEventRsvps.get(`${e.id}:${currentUserId}`) : undefined,
    }));
  }

  static async rsvpPageEvent(eventId: string, userId: string, status: PageEventRsvpStatus): Promise<{ eventId: string; userId: string; status: PageEventRsvpStatus; rsvpCount: number }> {
    if (isSupabaseConfigured) {
      await supabase
        .from('page_event_rsvps')
        .upsert({ event_id: eventId, user_id: userId, status }, { onConflict: 'event_id,user_id' });

      const { data: ev } = await supabase.from('page_events').select('rsvp_count').eq('id', eventId).single();
      return { eventId, userId, status, rsvpCount: ev?.rsvp_count || 0 };
    }

    const key = `${eventId}:${userId}`;
    this.mockEventRsvps.set(key, status);
    return { eventId, userId, status, rsvpCount: status === 'going' ? 1 : 0 };
  }

  // ─── 5. LEADERSHIP ACADEMY & QUIZ VALIDATION (JOB 050 - DEC-177 Decision 3) ───

  static listAcademyModules(userId?: string): LeadershipModuleDTO[] {
    return Object.values(ACADEMY_CURRICULUM).map(mod => {
      let completed = false;
      let quizScore: number | undefined = undefined;
      if (userId) {
        const prog = this.mockModuleProgress.get(`${userId}:${mod.id}`);
        if (prog) {
          completed = prog.completed;
          quizScore = prog.quizScore;
        }
      }
      return {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        category: mod.category,
        contentType: mod.contentType,
        durationMinutes: mod.durationMinutes,
        difficulty: mod.difficulty,
        isPremium: mod.isPremium,
        sortOrder: mod.sortOrder,
        completed,
        quizScore,
      };
    });
  }

  static getAcademyModule(moduleId: string, userId?: string): AcademyModuleData | null {
    const mod = ACADEMY_CURRICULUM[moduleId];
    if (!mod) return null;

    let completed = false;
    let quizScore: number | undefined = undefined;
    if (userId) {
      const prog = this.mockModuleProgress.get(`${userId}:${mod.id}`);
      if (prog) {
        completed = prog.completed;
        quizScore = prog.quizScore;
      }
    }

    return {
      ...mod,
      completed,
      quizScore,
    };
  }

  static async submitQuiz(
    userId: string,
    moduleId: string,
    submission: QuizSubmissionRequest,
  ): Promise<QuizResultDTO> {
    const mod = ACADEMY_CURRICULUM[moduleId];
    if (!mod) throw new Error('MODULE_NOT_FOUND');
    if (!mod.quiz || mod.quiz.length === 0) throw new Error('NO_QUIZ_IN_MODULE');

    const totalQuestions = mod.quiz.length;
    let correctCount = 0;
    const explanations: Array<{
      questionId: string;
      correctIndex: number;
      explanation: string;
      wasCorrect: boolean;
    }> = [];

    const answerMap = new Map<string, number>();
    for (const ans of submission.answers) {
      answerMap.set(ans.questionId, ans.selectedIndex);
    }

    for (const q of mod.quiz) {
      const selected = answerMap.get(q.id);
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) correctCount++;

      explanations.push({
        questionId: q.id,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        wasCorrect: isCorrect,
      });
    }

    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    // Decision 3: 80% passing threshold for honors certification and badge
    const passed = scorePercentage >= 80;
    const badgeAwarded = passed ? 'election_scholar' : undefined;
    const pointsEarned = passed ? 15 : 5; // 15 pts for passing quiz, 5 pts for completion

    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      // Record quiz attempt
      await supabase.from('module_quiz_attempts').insert({
        user_id: userId,
        module_id: moduleId,
        score_percentage: scorePercentage,
        passed,
        answers_summary: explanations,
      });

      // Update module progress
      await supabase.from('module_progress').upsert({
        user_id: userId,
        module_id: moduleId,
        completed: true,
        quiz_score: scorePercentage,
        completed_at: now,
      }, { onConflict: 'user_id,module_id' });

      // Award badge if passed
      if (badgeAwarded) {
        await supabase.from('civic_badges').upsert({
          user_id: userId,
          badge_type: badgeAwarded,
          earned_at: now,
        }, { onConflict: 'user_id,badge_type' });
      }

      // Increment points on profile
      try {
        await supabase.rpc('increment_aspirant_modules', { p_user_id: userId });
      } catch {
        // best effort
      }
    }

    // In-memory update
    this.mockModuleProgress.set(`${userId}:${moduleId}`, {
      completed: true,
      quizScore: scorePercentage,
      startedAt: now,
    });

    if (badgeAwarded) {
      const userBadges = this.mockBadges.get(userId) || [];
      if (!userBadges.some(b => b.badgeType === badgeAwarded)) {
        userBadges.push({ badgeType: badgeAwarded, earnedAt: now });
        this.mockBadges.set(userId, userBadges);
      }
    }

    const profile = this.mockProfiles.get(userId);
    if (profile) {
      profile.modulesCompleted = (profile.modulesCompleted || 0) + 1;
      profile.civicScore = (profile.civicScore || 0) + pointsEarned;
    }

    return {
      moduleId,
      totalQuestions,
      correctAnswers: correctCount,
      scorePercentage,
      passed,
      badgeAwarded,
      pointsEarned,
      explanations,
    };
  }
}
