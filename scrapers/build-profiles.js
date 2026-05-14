#!/usr/bin/env node
/**
 * Profile Builder — Converts scraped data → LegislatorProfile schema
 * ══════════════════════════════════════════════════════════════════════
 * Reads from scrapers/output/{myneta,prs,wikipedia,eci,sansad}/
 * Outputs unified LegislatorProfile JSON per state to scrapers/output/profiles/
 *
 * Usage:
 *   node scrapers/build-profiles.js                # All states
 *   node scrapers/build-profiles.js --state=TS     # Single state
 */

const fs = require('fs');
const path = require('path');
const { STATES, extractYear } = require('./config');
const { ensureDir, writeJSON, readJSON, normalizeName, nameSimilarity } = require('./utils');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];

const OUTPUT_BASE = path.resolve(__dirname, 'output');
const PROFILES_DIR = path.resolve(OUTPUT_BASE, 'profiles');

// ─── Load all sources ──────────────────────────────────────────────────

function loadMyNetaData(stateCode) {
  const state = STATES.find(s => s.code === stateCode);
  if (!state) return [];

  // Prefer deep scrape output, fallback to basic
  const deepDir = path.join(OUTPUT_BASE, 'myneta-deep');
  const basicDir = path.join(OUTPUT_BASE, 'myneta');
  const allRecords = [];

  for (const key of state.mynetaKeys) {
    const deepFile = path.join(deepDir, `${key}.json`);
    const basicFile = path.join(basicDir, `${key}.json`);
    const data = readJSON(deepFile) || readJSON(basicFile);
    if (data) allRecords.push(...data);
  }
  return allRecords;
}

function loadPRSData(stateCode) {
  const file = path.join(OUTPUT_BASE, 'prs', `${stateCode}-mlas.json`);
  return readJSON(file) || [];
}

function loadWikiDOBs(stateCode) {
  const file = path.join(OUTPUT_BASE, 'wikipedia', `${stateCode}-dobs.json`);
  return readJSON(file) || {};
}

function loadWikiEnriched(stateCode) {
  const file = path.join(OUTPUT_BASE, 'wiki-enriched', `${stateCode}-enriched.json`);
  const allFile = path.join(OUTPUT_BASE, 'wiki-enriched', 'ALL-enriched.json');
  return readJSON(file) || readJSON(allFile) || {};
}

function loadECIMaster(stateCode) {
  const file = path.join(OUTPUT_BASE, 'eci-master', `${stateCode}-master.json`);
  return readJSON(file) || null;
}

function loadECIResults(stateCode) {
  const dir = path.join(OUTPUT_BASE, 'eci');
  if (!fs.existsSync(dir)) return {};
  const results = {};
  const files = fs.readdirSync(dir).filter(f => f.startsWith(`${stateCode}-`) && f.endsWith('.json'));
  for (const f of files) {
    const year = f.match(/\d{4}/)?.[0];
    if (year) results[year] = readJSON(path.join(dir, f)) || [];
  }
  return results;
}

function loadEvents() {
  const file = path.join(OUTPUT_BASE, 'events', 'all-events.json');
  return readJSON(file) || [];
}

// ─── Build a single LegislatorProfile ──────────────────────────────────

function buildProfile(candidateKey, mynetaRecords, prsData, wikiDOBs, wikiEnriched, eciMaster, eciResults, events, stateCode) {
  const state = STATES.find(s => s.code === stateCode);

  // Sort by election year descending (latest first)
  const sorted = [...mynetaRecords].sort((a, b) => (b.electionYear || 0) - (a.electionYear || 0));
  const latest = sorted[0];
  const winRecords = sorted.filter(r => r.isWinner);

  // Pick best name
  const name = latest.mynetaName || latest.name || candidateKey;

  // Try to find PRS match
  const prsMatch = prsData.find(p => nameSimilarity(name, p.name) >= 0.6);

  // Try to find Wikipedia DOB
  let dob = null;
  for (const [wikiName, data] of Object.entries(wikiDOBs)) {
    if (nameSimilarity(name, wikiName) >= 0.6) {
      dob = data.dob || data;
      break;
    }
  }

  // Try Wikipedia enrichment (gender, religion, dynasty, minister, spouse)
  let wikiData = null;
  for (const [wikiName, data] of Object.entries(wikiEnriched)) {
    if (data.found && nameSimilarity(name, wikiName) >= 0.6) {
      wikiData = data;
      if (!dob && data.dob) dob = data.dob;
      break;
    }
  }

  // Find constituency in ECI master data
  let eciConst = null;
  if (eciMaster?.constituencies) {
    eciConst = eciMaster.constituencies.find(c =>
      normalizeName(c.name) === normalizeName(latest.constituency || '')
    );
  }

  // Find events for this person
  const personEvents = events.filter(e =>
    e.name && nameSimilarity(name, e.name) >= 0.6
  );

  const currentAge = dob ? calculateAge(dob) : null;
  const latestYear = latest.electionYear || new Date().getFullYear();

  // Build election history from MyNeta records
  const electionHistory = sorted.map(r => ({
    electionYear: r.electionYear || 0,
    electionType: 'assembly',
    electionKey: r.electionKey || '',
    stateCode,
    constituencyName: r.constituency || '',
    constituencyNumber: 0,
    party: r.party || '',
    result: r.isWinner ? 'won' : 'lost',
    votesReceived: 0,
    voteShare: 0,
    margin: 0,
    totalVoters: 0,
    turnoutPercent: 0,
    rank: r.isWinner ? 1 : 0,
    totalCandidates: 0,
  }));

  // Build financial history
  const financialHistory = sorted
    .filter(r => r.totalAssets > 0 || r.totalLiabilities > 0)
    .map(r => {
      const totalAssets = r.totalAssets || 0;
      const totalLiabilities = r.totalLiabilities || 0;
      const selfIncome = r.totalIncome || 0;
      return {
        electionYear: r.electionYear || 0,
        electionKey: r.electionKey || '',
        selfMovableAssets: r.selfMovableAssets || 0,
        selfImmovableAssets: r.selfImmovableAssets || 0,
        spouseMovableAssets: 0,
        spouseImmovableAssets: 0,
        dependentsAssets: 0,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        selfIncome,
        spouseIncome: 0,
        totalIncome: selfIncome,
        isCrorepati: totalAssets >= 1_00_00_000,
        sourceUrl: r.sourceUrl || '',
      };
    });

  // Add wealth growth to financial records
  if (financialHistory.length >= 2) {
    const fSorted = [...financialHistory].sort((a, b) => a.electionYear - b.electionYear);
    for (let i = 1; i < fSorted.length; i++) {
      const prev = fSorted[i - 1];
      const curr = fSorted[i];
      if (prev.totalAssets > 0) {
        const years = curr.electionYear - prev.electionYear;
        const pctGrowth = ((curr.totalAssets - prev.totalAssets) / prev.totalAssets) * 100;
        const annualized = years > 0 ? (Math.pow(curr.totalAssets / prev.totalAssets, 1 / years) - 1) * 100 : 0;
        curr.wealthGrowth = {
          fromYear: prev.electionYear,
          toYear: curr.electionYear,
          percentGrowth: Math.round(pctGrowth * 10) / 10,
          annualizedGrowth: Math.round(annualized * 10) / 10,
        };
      }
    }
  }

  // Build criminal record
  const criminalRecord = {
    hasCriminalCases: (latest.criminalCases || 0) > 0,
    totalCases: latest.criminalCases || 0,
    seriousCases: latest.seriousCriminalCases || 0,
    convictions: 0,
    caseDetails: (latest.ipcSections || []).map(s => ({
      caseNo: '',
      court: '',
      ipcSections: [s],
      otherActs: [],
      status: 'pending',
      chargesFramed: false,
      description: `IPC Section ${s}`,
      isSeriousIPC: ['302', '307', '376', '395', '420', '467', '468', '471', '120B'].some(si => s.startsWith(si)),
    })),
  };

  // Photo sources
  const photoSources = {};
  if (latest.photoUrl) photoSources.myneta = latest.photoUrl;
  if (prsMatch?.photoUrl) photoSources.prs = prsMatch.photoUrl;
  for (const [wikiName, data] of Object.entries(wikiDOBs)) {
    if (nameSimilarity(name, wikiName) >= 0.6 && data.photoUrl) {
      photoSources.wikipedia = data.photoUrl;
      break;
    }
  }

  // Best photo: MyNeta > PRS > Wikipedia
  const bestPhoto = photoSources.myneta || photoSources.prs || photoSources.wikipedia || null;

  // Determine party switches
  const parties = sorted.map(r => ({ party: r.party, year: r.electionYear }));
  const previousParties = [];
  for (let i = 1; i < parties.length; i++) {
    if (parties[i].party !== parties[i - 1].party) {
      previousParties.push({
        party: parties[i].party,
        fromYear: parties[i].year,
        toYear: parties[i - 1].year,
      });
    }
  }

  // Compute insights
  const voteShareTrend = 'stable'; // Would need ECI data for vote shares
  const assetGrowthTrend = financialHistory.length >= 2
    ? (() => {
      const g = financialHistory[financialHistory.length - 1]?.wealthGrowth;
      if (!g) return 'normal';
      if (g.percentGrowth > 500) return 'suspicious';
      if (g.percentGrowth > 200) return 'high';
      return 'normal';
    })()
    : 'normal';

  const consecutiveWins = winRecords.length >= 2 &&
    winRecords.some((w, i) => i > 0 && w.constituency === winRecords[i - 1]?.constituency);

  const profile = {
    id: `MLA_${stateCode}_${latestYear}_${latest.constituency || 'UNK'}_${latest.candidateId || 0}`,

    personal: {
      fullName: name,
      displayName: name.split(' ').slice(-2).join(' '),
      aliases: [...new Set(sorted.map(r => r.mynetaName || r.name).filter(Boolean))],
      gender: latest.gender || wikiData?.gender || 'male',
      dob,
      ageAtElection: latest.age || null,
      currentAge,
      religion: wikiData?.religion || undefined,
      caste: eciConst?.reservationType || undefined,
      maritalStatus: latest.maritalStatus || wikiData?.maritalStatus || (latest.spouseProfession ? 'married' : undefined),
      spouseName: wikiData?.spouseName || undefined,
      dependents: latest.dependents || undefined,
      photoUrl: bestPhoto,
      photoSources,
    },

    career: {
      house: 'state_assembly',
      stateCode,
      stateName: state?.name || '',
      constituencyName: latest.constituency || '',
      constituencyNumber: eciConst?.number || 0,
      constituencyType: eciConst?.reservationType || 'general',
      district: latest.district || '',
      currentParty: latest.party || '',
      currentPartyFull: latest.partyFull || wikiData?.party || '',
      previousParties: previousParties.length > 0 ? previousParties
        : (wikiData?.previousParties || []).map(p => ({ party: p, fromYear: 0, toYear: null })),
      termsServed: winRecords.length,
      firstElectedYear: winRecords.length > 0 ? winRecords[winRecords.length - 1].electionYear : latestYear,
      isCurrentMember: latest.isWinner === true,
      isCabinetMinister: wikiData?.isCabinetMinister || false,
      ministerialPortfolio: wikiData?.currentOffice || undefined,
      isChiefMinister: wikiData?.isChiefMinister || false,
      isOppositionLeader: false,
      committeeMemberships: [],
      specialPositions: (wikiData?.allOffices || []).filter(o => /speaker|whip|leader/i.test(o)),
    },

    electionHistory,
    financialHistory,
    criminalRecord,

    education: {
      educationLevel: latest.educationLevel || 'others',
      educationCategory: latest.educationCategory || '',
      educationDetail: latest.educationDetail || '',
      selfProfession: latest.selfProfession || '',
      spouseProfession: latest.spouseProfession || '',
      otherActivities: [],
    },

    performance: {
      questionsAsked: prsMatch?.questionsAsked || 0,
      debatesParticipated: prsMatch?.debates || 0,
      privateMemberBills: prsMatch?.privateBills || 0,
      attendancePercent: prsMatch?.attendance || 0,
      performanceScore: 0,
    },

    constituencyContext: {
      totalElectors: eciConst?.totalElectors || 0,
    },

    dynasty: {
      isDynast: wikiData?.isDynast || false,
      politicalGeneration: wikiData?.isDynast ? 2 : 1,
      familyInPolitics: (wikiData?.familyInPolitics || []).map(f => ({
        name: '', relation: f.relation, party: '', position: f.mention || '', years: '',
      })),
      familyConstituencies: [],
    },

    keyDates: {
      dob,
      termStartDate: wikiData?.termStart || undefined,
      termEndDate: wikiData?.termEnd || undefined,
      notableEventsTimeline: personEvents.map(e => ({
        date: e.eventDate || e.event_date || '', event: e.eventType || e.type || '', description: e.description || '',
      })),
    },

    insights: {
      redFlags: [],
      incumbencyAdvantage: consecutiveWins,
      voteShareTrend,
      assetGrowthTrend,
      antiIncumbencyRisk: 'low',
    },

    sources: {
      dataSources: [
        'myneta',
        ...(prsMatch ? ['prs'] : []),
        ...(dob || wikiData ? ['wikipedia'] : []),
        ...(eciConst ? ['eci'] : []),
      ],
      mynetaUrl: latest.sourceUrl || '',
      prsUrl: prsMatch?.profileUrl || undefined,
      wikipediaArticle: wikiData?.articleTitle || undefined,
      lastUpdated: new Date().toISOString(),
      dataCompleteness: 0,
      verificationStatus: (dob && prsMatch) ? 'verified' : (dob || prsMatch ? 'partial' : 'unverified'),
    },
  };

  // Apply PRS overrides
  if (prsMatch) {
    if (prsMatch.gender) profile.personal.gender = prsMatch.gender.toLowerCase() === 'female' ? 'female' : 'male';
    if (prsMatch.age && !profile.personal.ageAtElection) profile.personal.ageAtElection = prsMatch.age;
    if (prsMatch.constituency) profile.career.constituencyName = prsMatch.constituency;
  }

  // Compute data completeness
  profile.sources.dataCompleteness = computeCompleteness(profile);

  // Detect red flags
  profile.insights.redFlags = detectRedFlags(profile);

  return profile;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function calculateAge(dob) {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const mDiff = now.getMonth() - d.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function computeCompleteness(profile) {
  const checks = [
    !!profile.personal.fullName,
    !!profile.personal.dob,
    !!profile.personal.photoUrl,
    !!profile.personal.gender,
    profile.career.constituencyName.length > 0,
    profile.career.currentParty.length > 0,
    profile.career.termsServed > 0,
    profile.electionHistory.length > 0,
    profile.financialHistory.length > 0,
    profile.criminalRecord.totalCases >= 0,
    !!profile.education.educationLevel && profile.education.educationLevel !== 'others',
    !!profile.education.selfProfession,
    profile.performance.attendancePercent > 0,
    profile.performance.questionsAsked >= 0,
    !!profile.sources.mynetaUrl,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function detectRedFlags(profile) {
  const flags = [];

  if (profile.criminalRecord.seriousCases > 0) {
    flags.push({
      type: 'serious_criminal_cases', severity: 'critical',
      description: `${profile.criminalRecord.seriousCases} serious criminal case(s)`,
      value: `${profile.criminalRecord.seriousCases}`,
    });
  }

  if (profile.financialHistory.length >= 2) {
    const fh = [...profile.financialHistory].sort((a, b) => a.electionYear - b.electionYear);
    const older = fh[0], newer = fh[fh.length - 1];
    if (older.totalAssets > 0) {
      const pct = ((newer.totalAssets - older.totalAssets) / older.totalAssets) * 100;
      if (pct > 500) {
        flags.push({
          type: 'extreme_wealth_growth', severity: pct > 1000 ? 'critical' : 'warning',
          description: `Assets grew ${Math.round(pct)}% over ${newer.electionYear - older.electionYear} years`,
          value: `${Math.round(pct)}%`,
        });
      }
    }
  }

  const latest = profile.financialHistory[profile.financialHistory.length - 1];
  if (latest && latest.totalAssets > 5_00_00_000 && latest.totalLiabilities === 0) {
    flags.push({
      type: 'zero_liability_anomaly', severity: 'warning',
      description: `Declares ₹${Math.round(latest.totalAssets / 1_00_00_000 * 10) / 10} Cr assets but zero liabilities`,
    });
  }

  if (profile.career.previousParties.length >= 2) {
    flags.push({
      type: 'party_hopping', severity: 'info',
      description: `Changed parties ${profile.career.previousParties.length} times`,
    });
  }

  if (profile.performance.attendancePercent > 0 && profile.performance.attendancePercent < 50) {
    flags.push({
      type: 'low_attendance', severity: profile.performance.attendancePercent < 30 ? 'critical' : 'warning',
      description: `Only ${profile.performance.attendancePercent}% attendance`,
      value: `${profile.performance.attendancePercent}%`,
    });
  }

  return flags;
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log('🏗️  Profile Builder — LegislatorProfile Schema');
  console.log('═'.repeat(60));

  ensureDir(PROFILES_DIR);

  const filteredStates = stateFilter
    ? STATES.filter(s => s.code === stateFilter.toUpperCase())
    : STATES;

  let totalProfiles = 0;
  let totalWithPhoto = 0;
  let totalWithDOB = 0;
  const stateSummary = {};

  for (const state of filteredStates) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${state.name} (${state.code})`);
    console.log(`${'─'.repeat(60)}`);

    // Load data from ALL sources
    const mynetaData = loadMyNetaData(state.code);
    const prsData = loadPRSData(state.code);
    const wikiDOBs = loadWikiDOBs(state.code);
    const wikiEnriched = loadWikiEnriched(state.code);
    const eciMaster = loadECIMaster(state.code);
    const eciResults = loadECIResults(state.code);
    const events = loadEvents();

    if (mynetaData.length === 0) {
      console.log('   ⚠️ No MyNeta data available, skipping');
      continue;
    }

    console.log(`   Sources: MyNeta=${mynetaData.length}, PRS=${prsData.length}, Wiki=${Object.keys(wikiDOBs).length}, WikiEnrich=${Object.keys(wikiEnriched).length}, ECI=${eciMaster ? eciMaster.totalSeats + ' seats' : '0'}`);

    // Group MyNeta records by normalized candidate name
    const candidateGroups = {};
    for (const r of mynetaData) {
      const key = normalizeName(r.mynetaName || r.name || '');
      if (!key) continue;
      if (!candidateGroups[key]) candidateGroups[key] = [];
      candidateGroups[key].push(r);
    }

    console.log(`   Unique candidates: ${Object.keys(candidateGroups).length}`);

    // Build profiles
    const profiles = [];
    for (const [key, records] of Object.entries(candidateGroups)) {
      const profile = buildProfile(key, records, prsData, wikiDOBs, wikiEnriched, eciMaster, eciResults, events, state.code);
      profiles.push(profile);
      if (profile.personal.photoUrl) totalWithPhoto++;
      if (profile.personal.dob) totalWithDOB++;
    }

    // Sort by constituency
    profiles.sort((a, b) => a.career.constituencyName.localeCompare(b.career.constituencyName));

    // Save
    writeJSON(path.join(PROFILES_DIR, `${state.code}-profiles.json`), profiles);
    console.log(`   ✅ Built ${profiles.length} profiles, ${profiles.filter(p => p.personal.photoUrl).length} with photos`);

    totalProfiles += profiles.length;
    stateSummary[state.code] = {
      total: profiles.length,
      winners: profiles.filter(p => p.career.isCurrentMember).length,
      withPhoto: profiles.filter(p => p.personal.photoUrl).length,
      withDOB: profiles.filter(p => p.personal.dob).length,
      avgCompleteness: Math.round(profiles.reduce((s, p) => s + p.sources.dataCompleteness, 0) / (profiles.length || 1)),
    };
  }

  // Write summary
  writeJSON(path.join(PROFILES_DIR, '_summary.json'), stateSummary);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 PROFILE BUILD SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Total profiles:  ${totalProfiles}`);
  console.log(`   With photos:     ${totalWithPhoto}`);
  console.log(`   With DOBs:       ${totalWithDOB}`);
  console.log(`   Output:          ${PROFILES_DIR}`);

  for (const [code, s] of Object.entries(stateSummary)) {
    console.log(`   ${code}: ${s.total} profiles (${s.withPhoto} photos, ${s.withDOB} DOBs, ${s.avgCompleteness}% avg completeness)`);
  }
}

main();
