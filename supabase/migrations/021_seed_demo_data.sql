-- ============================================================================
-- KSHETRA — Production-Grade Seed Data (021)
-- ============================================================================
-- Realistic demo data for investor presentation.
-- Covers: States, Headlines, Leadership Modules, Community Challenges,
--         Civic Issues (sample), Hashtags.
--
-- NOTE: Election data, legislator profiles, and constituency data are loaded
--       from the shared data package at app level. This seed covers only
--       Supabase-native tables that need server-side data.
-- ============================================================================

-- ─── STATES ──────────────────────────────────────────────────────────────────

INSERT INTO states (code, name, total_seats, ruling_party, centroid_lat, centroid_lng)
VALUES
  ('TS', 'Telangana', 119, 'INC', 17.3850, 78.4867),
  ('AP', 'Andhra Pradesh', 175, 'TDP', 15.9129, 79.7400),
  ('KA', 'Karnataka', 224, 'INC', 15.3173, 75.7139),
  ('MH', 'Maharashtra', 288, 'BJP', 19.7515, 75.7139),
  ('KL', 'Kerala', 140, 'CPIM', 10.8505, 76.2711),
  ('TN', 'Tamil Nadu', 234, 'DMK', 11.1271, 78.6569),
  ('WB', 'West Bengal', 294, 'AITC', 22.9868, 87.8550),
  ('DL', 'Delhi', 70, 'AAP', 28.7041, 77.1025),
  ('RJ', 'Rajasthan', 200, 'BJP', 27.0238, 74.2179),
  ('UP', 'Uttar Pradesh', 403, 'BJP', 26.8467, 80.9462),
  ('GJ', 'Gujarat', 182, 'BJP', 22.2587, 71.1924),
  ('MP', 'Madhya Pradesh', 230, 'BJP', 22.9734, 78.6569),
  ('BR', 'Bihar', 243, 'NDA', 25.0961, 85.3131),
  ('OD', 'Odisha', 147, 'BJD', 20.9517, 85.0985),
  ('JH', 'Jharkhand', 81, 'JMM', 23.6102, 85.2799),
  ('HR', 'Haryana', 90, 'BJP', 29.0588, 76.0856),
  ('PB', 'Punjab', 117, 'AAP', 31.1471, 75.3412),
  ('CG', 'Chhattisgarh', 90, 'BJP', 21.2787, 81.8661),
  ('GA', 'Goa', 40, 'BJP', 15.2993, 74.1240),
  ('AS', 'Assam', 126, 'BJP', 26.2006, 92.9376)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  total_seats = EXCLUDED.total_seats,
  ruling_party = EXCLUDED.ruling_party,
  centroid_lat = EXCLUDED.centroid_lat,
  centroid_lng = EXCLUDED.centroid_lng;

-- ─── HEADLINES (recent, realistic) ───────────────────────────────────────────

INSERT INTO headlines (state_code, title, summary, source_name, source_url, category, published_at)
VALUES
  -- Telangana
  ('TS', 'Telangana Assembly Passes Musi River Rejuvenation Bill 2026',
   'The bill allocates ₹15,000 crore for the cleanup and beautification of the Musi River, drawing both praise from environmentalists and criticism from opposition over displacement concerns.',
   'The Hindu', 'https://thehindu.com', 'governance', now() - INTERVAL '2 hours'),

  ('TS', 'BRS Demands White Paper on Telangana Farm Loan Waiver Implementation',
   'BRS working president KT Rama Rao alleges that only 23% of eligible farmers have received loan waiver benefits despite the Congress government''s 2023 election promise.',
   'Deccan Chronicle', 'https://deccanchronicle.com', 'politics', now() - INTERVAL '5 hours'),

  ('TS', 'GHMC Plans 200 New EV Charging Stations Across Hyderabad by Q3 2026',
   'Part of the Telangana EV Policy 2.0, the initiative aims to make Hyderabad India''s most EV-friendly city with public-private partnerships.',
   'Telangana Today', 'https://telanganatoday.com', 'development', now() - INTERVAL '8 hours'),

  ('TS', 'Hyderabad Metro Phase 2: Old City Extension Gets Centre''s Nod',
   'The ₹8,500 crore Phase 2 will connect Falaknuma to MGBS, serving an estimated 3 lakh daily commuters in the densely populated Old City area.',
   'Times of India', 'https://timesofindia.com', 'development', now() - INTERVAL '12 hours'),

  -- Andhra Pradesh
  ('AP', 'AP Cabinet Approves Amaravati Master Plan 3.0 with Singapore Partnership',
   'Chief Minister Chandrababu Naidu unveils the revised capital development plan with a ₹50,000 crore investment roadmap spanning 5 years.',
   'Eenadu', 'https://eenadu.net', 'governance', now() - INTERVAL '3 hours'),

  ('AP', 'YSRCP Stages Walkout Over Polavaram Project Cost Escalation',
   'Opposition alleges the project cost has doubled to ₹72,000 crore with minimal progress since the TDP-JSP alliance took power.',
   'Sakshi', 'https://sakshi.com', 'politics', now() - INTERVAL '6 hours'),

  ('AP', 'Vizag Steel Plant: Centre Agrees to 51% Government Stake Retention',
   'After years of privatization protests, the Union Cabinet approves a restructured ownership model keeping 51% public sector control.',
   'NDTV', 'https://ndtv.com', 'economy', now() - INTERVAL '10 hours'),

  -- Karnataka
  ('KA', 'Karnataka Guarantee Schemes: 2.1 Crore Beneficiaries in First Year',
   'Shakti, Gruha Jyothi, Anna Bhagya, Gruha Lakshmi, and Yuva Nidhi have collectively disbursed ₹45,000 crore, but fiscal concerns mount.',
   'Deccan Herald', 'https://deccanherald.com', 'governance', now() - INTERVAL '4 hours'),

  ('KA', 'Bengaluru Traffic: BBMP Announces ₹12,000 Crore Signal-Free Corridor Plan',
   'The ambitious plan targets 15 major junctions with grade separators and underpass networks to reduce average commute time by 40%.',
   'Bangalore Mirror', 'https://bangaloremirror.com', 'development', now() - INTERVAL '7 hours'),

  -- Maharashtra
  ('MH', 'Mumbai Coastal Road South Phase Opens: 10.5 km in 12 Minutes',
   'The ₹12,721 crore project connecting Marine Drive to Kandivali is now partially operational, reducing travel time from 45 to 12 minutes.',
   'Mumbai Mirror', 'https://mumbaimirror.com', 'development', now() - INTERVAL '1 hour'),

  ('MH', 'Maharashtra Farm Distress: 847 Farmer Suicides Reported in H1 2026',
   'Opposition demands special legislative session as Vidarbha and Marathwada regions bear the brunt of a below-normal monsoon.',
   'Indian Express', 'https://indianexpress.com', 'governance', now() - INTERVAL '9 hours'),

  ('MH', 'Shiv Sena (UBT) Announces Statewide Agitation Over Maratha Reservation',
   'Uddhav Thackeray accuses the Mahayuti government of using the reservation issue as a political tool ahead of the BMC elections.',
   'Loksatta', 'https://loksatta.com', 'politics', now() - INTERVAL '14 hours');

-- ─── LEADERSHIP ACADEMY MODULES ─────────────────────────────────────────────

INSERT INTO leadership_modules (title, description, category, content_type, content_body, duration_minutes, difficulty, is_premium, sort_order)
VALUES
  -- Electoral Process
  ('How Indian Elections Work',
   'Understand the complete election process — from nominations to counting day. Learn about ECI, EVMs, VVPATs, and electoral rolls.',
   'electoral_process', 'article',
   E'# How Indian Elections Work\n\n## The Election Commission of India (ECI)\n\nThe ECI is an autonomous constitutional body responsible for administering elections in India. Established on 25 January 1950, it supervises elections to the Lok Sabha, Rajya Sabha, State Legislative Assemblies, and the offices of the President and Vice President.\n\n## The Electoral Process\n\n### 1. Announcement & Schedule\nThe ECI announces election dates, following the **Model Code of Conduct (MCC)** which comes into effect immediately.\n\n### 2. Nominations\nCandidates file nominations with:\n- Security deposit (₹25,000 for general, ₹12,500 for SC/ST)\n- Affidavit declaring criminal cases, assets, education\n- Signatures of proposers from the constituency\n\n### 3. Campaigning\n- Campaigning ends 48 hours before polling\n- Expenditure limits: ₹40 lakh (Assembly), ₹95 lakh (Lok Sabha)\n- No appeals to caste, religion, or use of government machinery\n\n### 4. Polling\n- Electronic Voting Machines (EVMs) with VVPAT slips\n- Polling from 7 AM to 6 PM typically\n- Security forces deployed at sensitive booths\n\n### 5. Counting\n- Postal ballots counted first\n- EVM votes counted round by round\n- Results declared constituency by constituency\n\n## Key Facts\n- India has **~950 million** registered voters\n- **543** Lok Sabha constituencies\n- **4,120+** Assembly constituencies across 28 states and 8 UTs\n- Average constituency has **~15-20 lakh** voters',
   15, 'beginner', false, 1),

  ('Filing Your Nomination',
   'Step-by-step guide to filing nomination papers, required documents, security deposits, affidavits, and common rejection reasons.',
   'electoral_process', 'article',
   E'# Filing Your Nomination\n\n## Required Documents\n\n1. **Form 2A** (Nomination paper) — available at Returning Officer''s office\n2. **Affidavit (Form 26)** — criminal cases, assets, liabilities, education\n3. **Proof of age** — Birth certificate, school leaving certificate, or passport\n4. **Electoral roll entry** — Must be registered voter in ANY constituency\n5. **Party authorization letter** (if contesting on party symbol)\n\n## Security Deposit\n- **General candidates**: ₹25,000 (Assembly), ₹25,000 (Lok Sabha)\n- **SC/ST candidates**: ₹12,500 (Assembly), ₹12,500 (Lok Sabha)\n- Forfeited if candidate gets less than 1/6th of total valid votes\n\n## Common Rejection Reasons\n- Incomplete affidavit\n- Wrong constituency\n- Insufficient proposers\n- Security deposit not paid\n- Filing after deadline\n\n## Pro Tips\n- File **4 sets** of nomination papers (maximum allowed) as insurance\n- Get your affidavit notarized by a First Class Magistrate\n- Attend scrutiny hearing personally',
   20, 'intermediate', false, 2),

  ('Understanding Election Symbols',
   'How party symbols work, reserved vs free symbols, how independents get symbols, and the legal framework.',
   'electoral_process', 'quiz',
   NULL, 10, 'beginner', false, 3),

  -- Campaign Strategy
  ('Building a Grassroots Campaign',
   'Learn how to build a winning ground-level campaign — booth-level strategy, volunteer networks, and door-to-door canvassing.',
   'campaign_strategy', 'case_study',
   E'# Building a Grassroots Campaign\n\n## The Booth-Level Strategy\n\nEvery Assembly constituency in India has approximately **200-350 polling booths**, each serving about 1,000-1,500 voters. A winning campaign needs a presence at every booth.\n\n## The Pyramid Structure\n\n```\n        Candidate\n            |\n    Constituency Manager\n         /     \\\n    Sector Heads (10-15)\n      /           \\\n  Booth Agents (200-350)\n    /                 \\\nVolunteers (2000-5000)\n```\n\n## Case Study: How a First-Timer Won in Karnataka 2023\n\n**Constituency**: Rajarajeshwari Nagar, Bengaluru\n**Candidate**: First-time contestant, urban professional\n**Margin**: Won by 12,847 votes\n\n### What Worked:\n1. **Mapped every apartment complex** — 450+ complexes with 2 lakh+ residents\n2. **WhatsApp network** — Booth-level groups with daily updates\n3. **Issue-based outreach** — Water supply, traffic, BBMP complaints\n4. **Door-to-door** — 60 days, 15,000 homes personally visited\n5. **Social media** — Instagram reels in Kannada reaching 40 lakh views',
   25, 'intermediate', false, 4),

  ('Fundraising for Independents',
   'Legal ways to raise campaign funds, crowdfunding, transparency requirements, and election expenditure limits.',
   'campaign_strategy', 'article',
   E'# Fundraising for Independent Candidates\n\n## Legal Framework\n\nUnder Section 29C of the Representation of the People Act, 1951, all candidates must maintain a day-to-day account of election expenditure.\n\n## Expenditure Limits (2024 Revised)\n- **Assembly**: ₹40 lakh\n- **Lok Sabha**: ₹95 lakh\n\n## Legitimate Funding Sources\n\n### 1. Personal Funds\n- Most common for independents\n- Must be declared in expenditure statement\n\n### 2. Crowdfunding\n- Platforms like Milaap, Ketto can be used\n- Each donor''s identity must be recorded if donation > ₹20,000\n- Anonymous donations above ₹2,000 are prohibited\n\n### 3. Electoral Bonds (Pre-2024)\n- Supreme Court struck down in February 2024\n- Now replaced by transparent digital donation system\n\n### 4. In-Kind Contributions\n- Volunteer time, venue usage, vehicle lending\n- Must be valued and reported at market rate\n\n## Transparency Requirements\n- File expenditure statement within 30 days of results\n- All donations above ₹20,000 must be reported with donor details\n- Failure to file = disqualification for 3 years',
   20, 'intermediate', false, 5),

  -- Legal Framework
  ('Constitutional Rights of Legislators',
   'Parliamentary privileges, immunity, anti-defection law (10th Schedule), and the legal boundaries of legislative power.',
   'legal_framework', 'article',
   E'# Constitutional Rights of Legislators\n\n## Parliamentary Privileges\n\n### Freedom of Speech (Article 105/194)\n- MLAs/MPs cannot be sued for anything said in the House\n- Extends to committee proceedings\n- Does NOT cover statements outside the House\n\n### Freedom from Arrest (Article 105(3)/194(3))\n- Cannot be arrested in civil cases during session\n- Criminal arrests ARE allowed (with Speaker''s notification)\n- 40 days before and after session: immunity in civil matters\n\n## Anti-Defection Law (10th Schedule)\n\n### What Constitutes Defection:\n1. Voluntarily giving up party membership\n2. Voting against party whip without prior permission\n3. Abstaining from vote against party direction\n\n### Exceptions:\n- **Merger**: If 2/3rds of a party''s legislators merge with another party\n- **Speaker/Chairman**: Can resign from party upon election to Chair\n\n### Consequences:\n- Disqualification from House membership\n- Cannot be re-appointed as Minister\n- Can contest fresh elections\n\n## Key Supreme Court Judgments\n- **Kihoto Hollohan (1992)**: Upheld 10th Schedule\n- **Nabam Rebia (2016)**: Speaker cannot decide disqualification if their own removal is pending',
   30, 'advanced', false, 6),

  -- Public Speaking
  ('Addressing a Public Rally',
   'Techniques for engaging large crowds, voice projection, handling hecklers, and cultural sensitivity in Indian political rallies.',
   'public_speaking', 'video',
   NULL, 15, 'beginner', false, 7),

  -- Community Organizing
  ('Building a Ward-Level Committee',
   'How to identify community leaders, structure local committees, hold productive meetings, and track action items.',
   'community_organizing', 'article',
   E'# Building a Ward-Level Committee\n\n## Why Ward Committees Matter\n\nThe 74th Amendment mandates Ward Committees in every municipality with 3+ lakh population. As an aspiring leader, building an effective ward committee is your first step toward organized community governance.\n\n## Structure\n\n### Core Team (5-7 members)\n- **Ward Convenor** — You or your trusted associate\n- **Secretary** — Minutes, communications\n- **Treasurer** — Funds, accounts\n- **Women''s Representative** — At least 1/3 representation\n- **Youth Representative** — Under 30\n- **Senior Citizen Representative** — Above 60\n- **SC/ST/OBC Representative** — Inclusive representation\n\n## Monthly Meeting Agenda Template\n1. Previous minutes & action item review (10 min)\n2. New issues collection from residents (15 min)\n3. Prioritization & assignment (10 min)\n4. Government scheme awareness (10 min)\n5. Next steps & date (5 min)\n\n## Success Metrics\n- Issues resolved per month\n- Meeting attendance rate\n- Government response rate to escalated issues\n- Resident satisfaction (quarterly survey)',
   20, 'beginner', false, 8),

  -- Ethics & Governance
  ('Ethics in Public Life: The Indian Context',
   'Corruption challenges, RTI as a tool, Lokpal and Lokayukta, asset declaration norms, and building an ethical political career.',
   'ethics_governance', 'article',
   E'# Ethics in Public Life\n\n## The Corruption Challenge\n\nIndia ranks 93rd on Transparency International''s Corruption Perceptions Index (2024). As an aspiring leader, understanding and combating corruption is fundamental.\n\n## Key Anti-Corruption Laws\n\n### Prevention of Corruption Act, 1988 (Amended 2018)\n- Criminalizes bribe-giving AND bribe-taking\n- Special courts for speedy trials\n- Assets disproportionate to known income = offense\n\n### Right to Information Act, 2005\n- Any citizen can request information from public bodies\n- Response within 30 days mandatory\n- Powerful tool for transparency\n\n### Lokpal & Lokayukta Act, 2013\n- Lokpal: Anti-corruption ombudsman at Centre\n- Lokayukta: State-level equivalent\n- Can investigate PM (with safeguards), Ministers, MPs\n\n## Building an Ethical Career\n1. **Declare assets voluntarily** — Even before required by law\n2. **Publish expenditure statements** — Monthly, publicly\n3. **Hold open office hours** — Weekly, documented\n4. **Support RTI applications** — Don''t obstruct, facilitate\n5. **Zero tolerance for middlemen** — Direct citizen access',
   25, 'intermediate', false, 9);

-- ─── COMMUNITY CHALLENGES ────────────────────────────────────────────────────

INSERT INTO community_challenges (title, description, category, points, target_count, state_code, is_active, starts_at, ends_at)
VALUES
  ('Report 3 Local Issues',
   'Document and report 3 civic issues in your constituency with photos and descriptions. Help make local problems visible!',
   'civic', 30, 3, NULL, true, now(), now() + INTERVAL '30 days'),

  ('Attend a Gram Sabha / Ward Meeting',
   'Attend your local governance meeting and share a summary of what was discussed. Active participation starts here.',
   'civic', 20, 1, NULL, true, now(), now() + INTERVAL '30 days'),

  ('Verify 5 Election Promises',
   'Track and verify the status of 5 election promises made by your local MLA. Submit evidence for each.',
   'accountability', 50, 5, NULL, true, now(), now() + INTERVAL '60 days'),

  ('Complete 3 Leadership Modules',
   'Learn about the Indian electoral process by completing any 3 modules from the Leadership Academy.',
   'awareness', 30, 3, NULL, true, now(), now() + INTERVAL '45 days'),

  ('Start a Constituency Discussion',
   'Create a meaningful discussion post about a local issue that gets at least 5 replies from community members.',
   'community', 25, 1, NULL, true, now(), now() + INTERVAL '30 days'),

  ('Telangana Water Audit Challenge',
   'Survey and document the status of public water supply in your ward. Report broken taps, dry borewells, or contamination.',
   'civic', 40, 5, 'TS', true, now(), now() + INTERVAL '45 days'),

  ('Karnataka Guarantee Tracker',
   'Verify whether 3 households in your area have received benefits under Karnataka''s 5 Guarantee schemes.',
   'accountability', 35, 3, 'KA', true, now(), now() + INTERVAL '30 days');

-- ─── HASHTAGS ────────────────────────────────────────────────────────────────

INSERT INTO hashtags (tag, post_count)
VALUES
  ('telangana', 45), ('hyderabad', 38), ('warangal', 12),
  ('andhrapradesh', 32), ('amaravati', 22), ('vizag', 18),
  ('karnataka', 28), ('bengaluru', 35), ('mysuru', 8),
  ('maharashtra', 30), ('mumbai', 42), ('pune', 15),
  ('elections', 55), ('governance', 40), ('infrastructure', 35),
  ('education', 20), ('healthcare', 18), ('agriculture', 12),
  ('corruption', 25), ('development', 30), ('budget', 15),
  ('mla', 22), ('mp', 18), ('parliament', 20),
  ('defections', 10), ('manifesto', 8), ('delimitation', 12),
  ('watercrisis', 15), ('roads', 20), ('traffic', 18),
  ('farmerloan', 12), ('womenssafety', 10), ('youthpolitics', 8),
  ('rti', 6), ('lokpal', 4), ('evmpolitics', 7),
  ('smartcity', 12), ('metrorail', 15), ('cleanindia', 10)
ON CONFLICT (tag) DO UPDATE SET post_count = EXCLUDED.post_count;

-- ─── REFRESH MATERIALIZED VIEWS ──────────────────────────────────────────────

-- Will fail gracefully if underlying data isn't present yet
DO $$
BEGIN
  PERFORM refresh_materialized_views();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Materialized view refresh skipped — run manually after full data load.';
END $$;

-- ============================================================================
-- DONE. Seed data loaded.
-- ============================================================================
