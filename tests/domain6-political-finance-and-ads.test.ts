/**
 * Comprehensive Test Battery: Domain 6 — Political Finance, Campaign Management, Advertising & Monetization Engine
 * Master Product Blueprint — Jobs 054 through 061 (Ratified DEC-186)
 * Representation of the People Act 1951 (Section 127A) & ECI MCMC Guidelines
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignService } from '../apps/api/src/services/campaignService';
import { adService } from '../apps/api/src/services/adService';
import { civicService } from '../apps/api/src/services/civicService';

test('Domain 6: Political Finance, Campaign Management, Advertising & Monetization Engine (JOB 054–061)', async (t) => {
  // Clear all in-memory caches before test suite execution
  campaignService.clearCaches();
  adService.clearCaches();

  // Seed baseline civic issue in Jubilee Hills (TS-AC-61) for geographic intelligence tests
  await civicService.createIssue(
    {
      title: 'Water supply pipeline burst on Road No 36',
      description: 'High pressure drinking water pipeline leaking on main road causing flooding and traffic delay.',
      category: 'water',
      severity: 'critical',
      latitude: 17.4401,
      longitude: 78.3489,
      reportedBy: 'citizen-jh-1',
      constituencyId: 'TS-AC-61',
      stateCode: 'TS',
      address: 'Road No 36, Jubilee Hills',
    },
    { userId: 'citizen-jh-1', userName: 'Anil Kumar' }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // JOB 054: CAMPAIGN FOUNDATION & RBAC (5 ROLES)
  // ─────────────────────────────────────────────────────────────────────────
  let campaignId = '';

  await t.test('JOB 054.1: Create Political Campaign workspace bound to Assembly Constituency', async () => {
    const campaign = await campaignService.createCampaign({
      title: 'Jubilee Hills 2026 Citizens Campaign',
      description: 'Official grassroots electoral campaign for TS-AC-61 Assembly Election',
      stateCode: 'TS',
      targetConstituencyId: 'TS-AC-61',
      startDate: '2026-11-01',
      endDate: '2026-12-15',
      totalBudgetInr: 2500000, // ₹25,00,000 (within statutory limit)
      candidateId: 'cand-jh-2026',
      organizationId: 'party-org-1',
    });

    assert.ok(campaign.id, 'Campaign must be assigned a UUID');
    campaignId = campaign.id;
    assert.equal(campaign.title, 'Jubilee Hills 2026 Citizens Campaign');
    assert.equal(campaign.targetConstituencyId, 'TS-AC-61');
    assert.equal(campaign.status, 'active');
    assert.equal(campaign.totalBudgetInr, 2500000);
    assert.equal(campaign.spentBudgetInr, 0);
  });

  await t.test('JOB 054.2: Team RBAC onboarding with 5 distinct roles and permissions', async () => {
    // 1. Campaign Manager
    const manager = await campaignService.addMember(campaignId, {
      userId: 'user-mgr-1',
      userName: 'Suresh Reddy (Campaign Director)',
      role: 'campaign_manager',
      userPhone: '+919849011111',
    });
    assert.equal(manager.role, 'campaign_manager');
    assert.ok(manager.permissions.includes('approve_content'));
    assert.ok(manager.permissions.includes('manage_budget'));

    // 2. Content Creator
    const creator = await campaignService.addMember(campaignId, {
      userId: 'user-creator-1',
      userName: 'Ananya Rao (Social Media Lead)',
      role: 'content_creator',
    });
    assert.equal(creator.role, 'content_creator');
    assert.ok(creator.permissions.includes('create_content'));
    assert.ok(!creator.permissions.includes('approve_content'), 'Creator cannot approve content');

    // 3. Field Director
    const fieldDir = await campaignService.addMember(campaignId, {
      userId: 'user-field-1',
      userName: 'Mohd Feroz (Booth Coordinator)',
      role: 'field_director',
    });
    assert.equal(fieldDir.role, 'field_director');
    assert.ok(fieldDir.permissions.includes('manage_volunteers'));

    // 4. Finance Officer
    const finance = await campaignService.addMember(campaignId, {
      userId: 'user-fin-1',
      userName: 'Venkatesh CA (Election Agent)',
      role: 'finance_officer',
    });
    assert.equal(finance.role, 'finance_officer');
    assert.ok(finance.permissions.includes('manage_budget'));

    // 5. Analyst
    const analyst = await campaignService.addMember(campaignId, {
      userId: 'user-analyst-1',
      userName: 'Kavitha Data (Pollster)',
      role: 'analyst',
    });
    assert.equal(analyst.role, 'analyst');
    assert.ok(analyst.permissions.includes('view_intelligence'));
    assert.ok(!analyst.permissions.includes('manage_budget'));

    const members = await campaignService.getMembers(campaignId);
    assert.equal(members.length, 5, 'All 5 RBAC members must be registered in the workspace');
  });

  await t.test('JOB 054.3: Negative Test: Validation guards fail-closed on invalid dates or empty titles', async () => {
    await assert.rejects(
      async () => {
        await campaignService.createCampaign({
          title: '',
          stateCode: 'TS',
          targetConstituencyId: 'TS-AC-61',
          startDate: '2026-11-01',
          endDate: '2026-12-01',
        });
      },
      /Campaign title is required/,
      'Must reject empty title fail-closed',
    );

    await assert.rejects(
      async () => {
        await campaignService.createCampaign({
          title: 'Invalid Flight Dates Campaign',
          stateCode: 'TS',
          targetConstituencyId: 'TS-AC-61',
          startDate: '2026-12-01',
          endDate: '2026-11-01', // End date before start date
        });
      },
      /start date must be before end date/,
      'Must reject inverted campaign dates fail-closed',
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // JOB 055: CAMPAIGN GEOGRAPHIC INTELLIGENCE
  // ─────────────────────────────────────────────────────────────────────────
  await t.test('JOB 055.1: Campaign Geographic Intelligence aggregates civic issues and sentiment for target AC', async () => {
    const report = await campaignService.getGeographicIntelligence(campaignId, 'user-mgr-1');

    assert.equal(report.campaignId, campaignId);
    assert.equal(report.constituencyId, 'TS-AC-61');
    assert.ok(report.civicSummary.totalIssues >= 1, 'Must include seeded Jubilee Hills water pipeline issue');
    assert.ok(report.civicSummary.issuesByCategory['water'] >= 1);
    assert.ok(report.sentimentMetrics.cdiScore >= 0, 'Must compute CDI score');
    assert.ok(report.voterEngagement.registeredVotersEstimate > 0);
    assert.ok(report.voterEngagement.topDiscussionTopics.length > 0);
  });

  await t.test('JOB 055.2: Locality isolation & permission guard blocks unauthorized viewer', async () => {
    await assert.rejects(
      async () => {
        // user-creator-1 does not have view_intelligence permission
        await campaignService.getGeographicIntelligence(campaignId, 'user-creator-1');
      },
      /not authorized to view geographic intelligence/,
      'Must block content creator from accessing campaign intelligence',
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // JOB 056: CAMPAIGN COMMUNICATION & MULTI-MODALITY WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────
  let contentId = '';

  await t.test('JOB 056.1: Content creator drafts townhall rally announcement across modalities', async () => {
    const content = await campaignService.createContent(
      campaignId,
      { userId: 'user-creator-1', userName: 'Ananya Rao' },
      {
        modality: 'rally',
        title: 'Mega Civic Townhall & Manifesto Release at Jubilee Hills Club',
        bodyText: 'Join candidate Suresh Reddy to discuss arterial road re-carpeting and youth entrepreneurship grants.',
        eventLocation: 'Main Auditorium, Jubilee Hills Club, Hyderabad',
        scheduledAt: '2026-11-10T18:00:00Z',
      },
    );

    assert.ok(content.id);
    contentId = content.id;
    assert.equal(content.workflowStatus, 'DRAFT');
    assert.equal(content.modality, 'rally');
    assert.equal(content.createdBy, 'user-creator-1');
  });

  await t.test('JOB 056.2: 4-Stage Content Workflow: DRAFT -> SUBMITTED -> APPROVED -> PUBLISHED', async () => {
    // 1. Submit for review
    const submitted = await campaignService.submitContentForReview(contentId, 'user-creator-1');
    assert.equal(submitted.workflowStatus, 'SUBMITTED');

    // 2. Creator tries to self-approve -> Blocked
    await assert.rejects(
      async () => {
        await campaignService.reviewContent(
          contentId,
          { userId: 'user-creator-1', userName: 'Ananya Rao', role: 'content_creator' },
          'APPROVED',
        );
      },
      /Only campaign managers can approve/,
      'Content creator cannot self-approve campaign communications',
    );

    // 3. Manager approves
    const approved = await campaignService.reviewContent(
      contentId,
      { userId: 'user-mgr-1', userName: 'Suresh Reddy', role: 'campaign_manager' },
      'APPROVED',
      'Manifesto points verified against Election Commission legal guidelines.',
    );
    assert.equal(approved.workflowStatus, 'APPROVED');
    assert.equal(approved.reviewedBy, 'user-mgr-1');

    // 4. Publish
    const published = await campaignService.publishContent(contentId, 'user-mgr-1');
    assert.equal(published.workflowStatus, 'PUBLISHED');
    assert.ok(published.publishedAt);
  });

  await t.test('JOB 056.3: Negative Test: Unapproved content cannot be published directly from DRAFT', async () => {
    const draft2 = await campaignService.createContent(
      campaignId,
      { userId: 'user-creator-1', userName: 'Ananya Rao' },
      {
        modality: 'post',
        title: 'Unreviewed Policy Post',
      },
    );

    await assert.rejects(
      async () => {
        await campaignService.publishContent(draft2.id, 'user-creator-1');
      },
      /Content must be APPROVED before publishing/,
      'Cannot bypass approval stage directly to published',
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // JOB 057: POLITICAL ADVERTISING & ADAPTIVE GOVERNANCE MATRIX (6 CATEGORIES)
  // ─────────────────────────────────────────────────────────────────────────
  let greetingAdId = '';
  let electionAdId = '';

  await t.test('JOB 057.1: Category 1 (Festival Wishes): Fast-Track review during routine civic period', async () => {
    adService.setConstituencyElectoralState('TS-AC-61', 'ROUTINE_CIVIC');

    const ad = await adService.createPoliticalAd({
      campaignId,
      category: 'festival_wishes',
      title: 'Diwali Greetings from Suresh Reddy',
      headline: 'Wishing every family of Jubilee Hills a prosperous & joyous Deepavali!',
      bodyText: 'May the festival of lights bring health, peace, and progress to every ward.',
      sponsorName: 'Jubilee Hills Citizens Forum',
      targetConstituencyId: 'TS-AC-61',
      flightStartDate: '2026-11-01',
      flightEndDate: '2026-11-05',
      dailyBudgetInr: 1000,
      totalBudgetInr: 5000,
    });

    assert.ok(ad.id);
    greetingAdId = ad.id;
    assert.equal(ad.status, 'pending_review');
    assert.ok(ad.disclaimerText.includes('Section 127A RPA 1951') || ad.disclaimerText.includes('Jubilee Hills Citizens Forum'));

    // Fast-track review approves greeting ad without requiring district MCMC cert
    const approved = await adService.reviewPoliticalAd(greetingAdId, 'approved');
    assert.equal(approved.status, 'active', 'Festival greetings must pass fast-track during routine civics');
  });

  await t.test('JOB 057.2: Category 5 (Election Campaign Ad) requires MCMC Pre-Certification even in routine period', async () => {
    const uncertifiedAd = await adService.createPoliticalAd({
      campaignId,
      category: 'election_campaign',
      title: 'Vote for Progress - Manifesto Appeal',
      headline: 'Vote for Suresh Reddy on Ballot #1 for 24/7 drinking water and youth skills centers!',
      sponsorName: 'Citizens Party of Telangana',
      targetConstituencyId: 'TS-AC-61',
      flightStartDate: '2026-11-15',
      flightEndDate: '2026-12-01',
    });

    // Fails closed without MCMC cert
    await assert.rejects(
      async () => {
        await adService.reviewPoliticalAd(uncertifiedAd.id, 'approved');
      },
      /Election campaign vote-solicitation ads require an ECI MCMC pre-certification number/,
      'Vote solicitation ads must require MCMC certification',
    );
  });

  await t.test('JOB 057.3: Adaptive Governance: Active MCC requires MCMC Pre-Certification across ALL political ads', async () => {
    // Notify election in Jubilee Hills: MCC is now active
    adService.setConstituencyElectoralState('TS-AC-61', 'MCC_ACTIVE');

    const mccAd = await adService.createPoliticalAd({
      campaignId,
      category: 'birthday_congratulatory',
      title: 'Birthday Greetings during Election Window',
      headline: 'Warm birthday wishes to Senior Leader Shri K. Rama Rao',
      sponsorName: 'Youth Wing Jubilee Hills',
      targetConstituencyId: 'TS-AC-61',
      flightStartDate: '2026-11-20',
      flightEndDate: '2026-11-22',
    });

    // Attempting to approve without MCMC upload during MCC fails closed
    await assert.rejects(
      async () => {
        await adService.reviewPoliticalAd(mccAd.id, 'approved');
      },
      /ECI MCMC Pre-Certification is strictly mandatory.*during active Model Code of Conduct/,
      'During MCC, all political ads must strictly fail closed without MCMC cert',
    );

    // Provide verified MCMC Certificate
    mccAd.mcmcCertificateId = 'ECI/MCMC/2026/TS-AC-61/0491';
    mccAd.mcmcCertificatePdfUrl = 'https://mcmc.eci.gov.in/certificates/2026/TS/0491.pdf';

    const approvedMccAd = await adService.reviewPoliticalAd(mccAd.id, 'approved');
    assert.equal(approvedMccAd.status, 'active');
    electionAdId = approvedMccAd.id;

    // Reset back to routine civics for remaining tests
    adService.setConstituencyElectoralState('TS-AC-61', 'ROUTINE_CIVIC');
  });

  await t.test('JOB 057.4: Public Ad Transparency Ledger (Section 127A RPA 1951) exposes all political ads publicly', async () => {
    const ledger = await adService.getPublicTransparencyLedger({ constituencyId: 'TS-AC-61' });
    assert.ok(ledger.length >= 2, 'Transparency ledger must index all active political promotions');
    const greeting = ledger.find((a) => a.id === greetingAdId);
    assert.ok(greeting);
    assert.equal(greeting?.sponsorName, 'Jubilee Hills Citizens Forum');
    assert.ok(greeting?.disclaimerText.includes('Jubilee Hills Citizens Forum'));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // JOB 058 & 061: COMMERCIAL ADS V1 & SELF-SERVE MERCHANT PORTAL
  // ─────────────────────────────────────────────────────────────────────────
  let merchantAccountId = '';
  let commercialAdId = '';

  await t.test('JOB 058.1 & 061.1: Local merchant registers account with GSTIN & business category', async () => {
    const merchant = await adService.createCommercialAccount({
      businessName: 'Chutneys Restaurant & Sweets',
      tradeName: 'Chutneys Jubilee Hills',
      gstin: '36AAACC1206P1ZU',
      businessCategory: 'dining',
      contactName: 'Ramesh Varma',
      contactPhone: '+919848099999',
      contactEmail: 'manager@chutneysjh.com',
      addressStreet: 'Road No 3, Banjara Hills / Jubilee Hills Junction',
      mandalName: 'Shaikpet',
      constituencyId: 'TS-AC-61',
      stateCode: 'TS',
    });

    assert.ok(merchant.id);
    merchantAccountId = merchant.id;
    assert.equal(merchant.businessName, 'Chutneys Restaurant & Sweets');
    assert.equal(merchant.businessCategory, 'dining');
    assert.equal(merchant.isVerified, true, 'GSTIN provided marks account verified');
    assert.equal(merchant.walletBalanceInr, 0);
  });

  await t.test('JOB 058.2 & 061.2: Merchant creates Commercial Ad Creative with CTA', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const ad = await adService.createCommercialAd({
      accountId: merchantAccountId,
      headline: 'Authentic South Indian Breakfast & Unlimited Filter Coffee',
      bodyText: 'Special 15% discount for Jubilee Hills residents on family breakfast thalis this weekend!',
      ctaType: 'directions',
      ctaTarget: 'https://maps.google.com/?q=Chutneys+Jubilee+Hills',
      placementSlot: 'feed_inline',
      pricingModel: 'cpm',
      targetConstituencyId: 'TS-AC-61',
      startDate: today,
      endDate: nextMonth,
      dailyBudgetInr: 500,
      totalBudgetInr: 2500,
    });

    assert.ok(ad.id);
    commercialAdId = ad.id;
    assert.equal(ad.status, 'active');
    assert.equal(ad.placementSlot, 'feed_inline');
    assert.equal(ad.pricingModel, 'cpm');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // JOB 058 & 059: DETERMINISTIC AD SERVING & TELEMETRY
  // ─────────────────────────────────────────────────────────────────────────
  let servedViewToken = '';

  await t.test('JOB 058.3: Deterministic Ad Serving Engine serves active ad matching constituency', async () => {
    const result = await adService.serveAd('TS-AC-61', 'feed_inline', 'session-citizen-101');
    assert.ok(result, 'Must serve an ad matching target AC');
    assert.equal(result.adType, 'commercial');
    assert.equal(result.headline, 'Authentic South Indian Breakfast & Unlimited Filter Coffee');
    assert.ok(result.viewToken, 'Must generate signed viewToken');
    servedViewToken = result.viewToken;
  });

  await t.test('JOB 059.1: Record verified ad impression using signed viewToken', async () => {
    const impResult = await adService.recordImpression({
      adId: commercialAdId,
      adType: 'commercial',
      eventType: 'impression',
      targetConstituencyId: 'TS-AC-61',
      viewToken: servedViewToken,
      userSessionHash: 'session-citizen-101',
    });

    assert.equal(impResult.recorded, true);
    assert.ok(impResult.effectiveDebitInr > 0, 'CPM micropayment debit must be computed (e.g. ₹0.15)');
  });

  await t.test('JOB 059.2: Negative Test: Tampered or forged viewToken strictly rejected with 401', async () => {
    await assert.rejects(
      async () => {
        await adService.recordImpression({
          adId: commercialAdId,
          adType: 'commercial',
          eventType: 'impression',
          targetConstituencyId: 'TS-AC-61',
          viewToken: 'forged-fake-view-token-xyz',
          userSessionHash: 'session-hacker',
        });
      },
      /Invalid or forged viewToken/,
      'Must reject forged viewToken fail-closed',
    );
  });

  await t.test('JOB 059.3: Anti-Fraud IVT Click Deduplication filters repeat clicks within 5 seconds', async () => {
    // 1. First valid click
    const click1 = await adService.recordClick({
      adId: commercialAdId,
      adType: 'commercial',
      eventType: 'click',
      targetConstituencyId: 'TS-AC-61',
      viewToken: servedViewToken,
      userSessionHash: 'session-citizen-101',
    });
    assert.equal(click1.recorded, true);
    assert.equal(click1.ivtFiltered, false);

    // 2. Second rapid click within 1 second -> Filtered out by IVT engine
    const click2 = await adService.recordClick({
      adId: commercialAdId,
      adType: 'commercial',
      eventType: 'click',
      targetConstituencyId: 'TS-AC-61',
      viewToken: servedViewToken,
      userSessionHash: 'session-citizen-101',
    });
    assert.equal(click2.recorded, false, 'Rapid repeat click must not be recorded');
    assert.equal(click2.ivtFiltered, true, 'Repeat click must be marked as invalid traffic (IVT)');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // JOB 060: HYBRID AD BILLING, INVOICING & FINANCIAL LEDGER
  // ─────────────────────────────────────────────────────────────────────────
  await t.test('JOB 060.1: Prepaid wallet top-up and double-entry 18% GST invoice generation', async () => {
    const updatedAccount = await adService.rechargeCommercialWallet(merchantAccountId, 5000);
    assert.equal(updatedAccount.walletBalanceInr, 5000);
    assert.equal(updatedAccount.totalRechargedInr, 5000);

    // Verify GST invoice
    const invoices = await adService.getInvoices(merchantAccountId);
    assert.equal(invoices.length, 1);
    const invoice = invoices[0];
    assert.ok(invoice.invoiceNumber.startsWith('INV-PANIN-'));
    assert.equal(invoice.taxableAmountInr, 5000);
    assert.equal(invoice.cgstInr, 450); // 9% CGST
    assert.equal(invoice.sgstInr, 450); // 9% SGST
    assert.equal(invoice.totalAmountInr, 5900); // 5000 + 450 + 450
    assert.equal(invoice.hsnSacCode, '998311');
    assert.equal(invoice.status, 'paid');
  });

  await t.test('JOB 060.2: Dynamic Admin Pricing Configuration updates take effect immediately', async () => {
    const configs = await adService.listPricingConfigs();
    assert.ok(configs.length >= 10, 'Default pricing configurations must be seeded');

    const updated = await adService.updatePricingConfig('cpm_feed_inline_commercial_tier_1_metro', {
      baseRateInr: 180,
      seasonalMultiplier: 1.2, // Festival multiplier
    });

    assert.equal(updated.baseRateInr, 180);
    assert.equal(updated.seasonalMultiplier, 1.2);
    assert.equal(updated.effectiveRateInr, 216); // 180 * 1.2
  });

  await t.test('JOB 060.3: Negative Test: Negative wallet recharge rejected fail-closed', async () => {
    await assert.rejects(
      async () => {
        await adService.rechargeCommercialWallet(merchantAccountId, -500);
      },
      /Recharge amount must be positive/,
      'Cannot recharge wallet with negative amount',
    );
  });
});
