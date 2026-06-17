/**
 * Leadership Academy — full module content.
 *
 * Each entry provides reading sections, key takeaways, an optional attributed
 * video, an optional quiz, and citations to the original/authoritative source.
 *
 * IMPORTANT (legal): All prose below is original summary/educational writing.
 * Facts are drawn from public, official sources (Election Commission of India,
 * Government of India statutes, etc.) which are cited per module. Embedded
 * videos are NOT re-hosted — they are linked/streamed from the original
 * publisher's official YouTube channel with on-screen attribution and a source
 * URL, used for educational reference. No third-party copyrighted text is
 * reproduced verbatim.
 */
import type { ModuleContent } from '../lib/aspirantTypes';

export const MODULE_CONTENT: Record<string, ModuleContent> = {
  // ─────────────────────────────────────────────────────────────
  // ELECTORAL PROCESS
  // ─────────────────────────────────────────────────────────────
  'mod-1': {
    sections: [
      {
        heading: 'Who runs elections in India?',
        body: 'Elections to Parliament and State Legislatures are conducted by the Election Commission of India (ECI), a permanent constitutional body created under Article 324 of the Constitution. The ECI is independent of the government of the day and is responsible for superintendence, direction and control of the entire electoral process — from preparing electoral rolls to declaring results.',
      },
      {
        heading: 'The electoral roll & your vote',
        body: 'You can vote only if your name appears on the electoral roll for your constituency. Any Indian citizen aged 18 or above on the qualifying date can register using Form 6 (online via the Voters\u2019 Service Portal or offline with the Booth Level Officer). The voter ID (EPIC) is proof of registration. Rolls are revised periodically and published before every election.',
      },
      {
        heading: 'From notification to counting',
        body: 'A general election runs through fixed legal stages: (1) the ECI announces the schedule and the Model Code of Conduct kicks in; (2) the Returning Officer issues the notification; (3) candidates file nominations; (4) scrutiny and withdrawal; (5) campaigning, which must end 48 hours before polling (the \u201csilence period\u201d); (6) polling using EVMs with VVPAT; and (7) counting and declaration of results.',
      },
      {
        heading: 'EVMs and VVPAT',
        body: 'Votes are cast on Electronic Voting Machines (EVMs). Each EVM is paired with a Voter Verifiable Paper Audit Trail (VVPAT) unit that prints a slip showing the symbol and name of the candidate you voted for, visible for seven seconds, so you can verify your choice. A mandatory count of VVPAT slips from randomly selected booths is matched against the EVM count.',
      },
    ],
    keyTakeaways: [
      'The ECI is a constitutional body under Article 324, independent of the government.',
      'Register with Form 6 on the Voters\u2019 Service Portal; you must be on the roll to vote.',
      'Campaigning ends 48 hours before polling (the silence period).',
      'Every EVM is paired with a VVPAT so voters can verify their vote.',
    ],
    video: {
      youtubeId: 'tfIE2bPkiB4',
      title: 'How do EVMs and VVPAT work?',
      channel: 'Election Commission of India',
      sourceUrl: 'https://www.youtube.com/watch?v=tfIE2bPkiB4',
    },
    quiz: [
      {
        id: 'q1-1',
        question: 'Under which Article is the Election Commission of India established?',
        options: ['Article 324', 'Article 19', 'Article 370', 'Article 14'],
        correctIndex: 0,
        explanation: 'Article 324 vests the superintendence, direction and control of elections in the ECI.',
      },
      {
        id: 'q1-2',
        question: 'How long before polling must public campaigning stop?',
        options: ['24 hours', '48 hours', '72 hours', '1 week'],
        correctIndex: 1,
        explanation: 'The \u201csilence period\u201d begins 48 hours before the close of poll.',
      },
      {
        id: 'q1-3',
        question: 'What is the purpose of the VVPAT?',
        options: [
          'To count votes faster',
          'To let voters verify their vote was recorded correctly',
          'To register new voters',
          'To replace the electoral roll',
        ],
        correctIndex: 1,
        explanation: 'VVPAT prints a verifiable slip so the voter can confirm the vote and enable audits.',
      },
    ],
    citations: [
      { label: 'Functions & powers of the ECI', publisher: 'Election Commission of India', url: 'https://www.eci.gov.in' },
      { label: 'Voter registration (Form 6) — Voters\u2019 Service Portal', publisher: 'ECI', url: 'https://voters.eci.gov.in' },
      { label: 'Constitution of India, Article 324', publisher: 'Government of India', url: 'https://legislative.gov.in/constitution-of-india' },
    ],
  },

  'mod-2': {
    sections: [
      {
        heading: 'When and where to file',
        body: 'Nomination papers are filed with the Returning Officer (RO) of the constituency during the period notified by the ECI, between 11 a.m. and 3 p.m. on working days. The candidate, or a proposer, must submit the papers in person — they cannot be posted. The last date is fixed; late papers are rejected outright.',
      },
      {
        heading: 'Forms, proposers and deposit',
        body: 'A candidate files Form 2A (Lok Sabha) or 2B (Assembly). Candidates set up by a recognised political party need one proposer; independents and candidates of registered-unrecognised parties need ten proposers who are electors of that constituency. A security deposit is required — for example \u20b925,000 for Lok Sabha and \u20b910,000 for an Assembly seat (half for SC/ST candidates). The deposit is forfeited if the candidate fails to secure one-sixth of the valid votes.',
      },
      {
        heading: 'The mandatory affidavit (Form 26)',
        body: 'Every candidate must file a sworn affidavit in Form 26 disclosing criminal antecedents, assets and liabilities, and educational qualifications. Leaving any column blank can lead to rejection. False declarations are punishable. Candidates with criminal cases must also publish them in newspapers and on TV three times during the campaign.',
      },
      {
        heading: 'Scrutiny & common rejection reasons',
        body: 'On the scrutiny date the RO checks each nomination. Papers are commonly rejected for: not being on the electoral roll, defective or unsigned affidavits, insufficient or ineligible proposers, missing security deposit, or the candidate being under the age of 25. A candidate may withdraw by the withdrawal deadline.',
      },
    ],
    keyTakeaways: [
      'File in person with the RO during notified hours; postal filing is not allowed.',
      'Independents need 10 proposers from the constituency; party candidates need 1.',
      'Form 26 affidavit (criminal, assets, education) is mandatory — blanks cause rejection.',
      'Secure at least 1/6th of valid votes or lose your security deposit.',
    ],
    citations: [
      { label: 'Handbook for Candidates', publisher: 'Election Commission of India', url: 'https://www.eci.gov.in/handbook' },
      { label: 'Representation of the People Act, 1951 — s.33, s.34', publisher: 'India Code', url: 'https://www.indiacode.nic.in' },
      { label: 'Form 26 affidavit requirement (Supreme Court directions)', publisher: 'ECI / Supreme Court of India', url: 'https://www.eci.gov.in' },
    ],
  },

  'mod-3': {
    sections: [
      {
        heading: 'Why symbols matter',
        body: 'In a country with high diversity of languages and literacy levels, the election symbol is how millions of voters identify a candidate on the ballot/EVM. Symbols are allotted under the Election Symbols (Reservation and Allotment) Order, 1968, administered by the ECI.',
      },
      {
        heading: 'Reserved vs free symbols',
        body: 'A \u201creserved\u201d symbol belongs exclusively to a recognised national or state party (for example, across the constituencies where it is recognised). A \u201cfree\u201d symbol is drawn from a common pool the ECI maintains and is allotted to independents and registered-unrecognised parties for a single election, on a first-preference basis.',
      },
      {
        heading: 'Disputes and splits',
        body: 'When a recognised party splits, rival factions often claim the same symbol. Under Paragraph 15 of the Symbols Order, the ECI decides who is entitled to the symbol, typically by testing majority support among the party\u2019s elected representatives and organisational wing. Until it decides, it may freeze the symbol and allot both groups new names and symbols.',
      },
    ],
    keyTakeaways: [
      'Symbols are governed by the Election Symbols (Reservation and Allotment) Order, 1968.',
      'Reserved symbols belong to recognised parties; independents get free symbols.',
      'In a party split, the ECI decides symbol ownership under Para 15 of the Order.',
    ],
    quiz: [
      {
        id: 'q3-1',
        question: 'Which order governs the allotment of election symbols?',
        options: [
          'The Symbols Order, 1968',
          'The RPA, 1950',
          'The Anti-Defection Law',
          'The Companies Act, 2013',
        ],
        correctIndex: 0,
        explanation: 'The Election Symbols (Reservation and Allotment) Order, 1968 is the governing instrument.',
      },
      {
        id: 'q3-2',
        question: 'An independent candidate is normally allotted what kind of symbol?',
        options: ['A reserved symbol', 'A free symbol', 'No symbol', 'The national emblem'],
        correctIndex: 1,
        explanation: 'Independents choose from the ECI\u2019s pool of free symbols for that election.',
      },
      {
        id: 'q3-3',
        question: 'Who decides a symbol dispute when a party splits?',
        options: ['The High Court', 'The Election Commission of India', 'Parliament', 'The party president'],
        correctIndex: 1,
        explanation: 'Under Para 15 of the Symbols Order, the ECI adjudicates such disputes.',
      },
    ],
    citations: [
      { label: 'Election Symbols (Reservation and Allotment) Order, 1968', publisher: 'Election Commission of India', url: 'https://www.eci.gov.in' },
      { label: 'List of symbols & recognised parties', publisher: 'ECI', url: 'https://www.eci.gov.in' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // CAMPAIGN STRATEGY
  // ─────────────────────────────────────────────────────────────
  'mod-4': {
    sections: [
      {
        heading: 'Start with the booth',
        body: 'Indian elections are won booth by booth. A polling booth typically covers 1,000\u20131,200 voters. Map every booth in your constituency, study past turnout and results, and appoint a dedicated booth-level team for each. Your goal is a named, reachable contact for every cluster of streets.',
      },
      {
        heading: 'Build a volunteer pyramid',
        body: 'Organise volunteers in tiers: constituency coordinator \u2192 mandal/ward in-charge \u2192 booth in-charge \u2192 page-pramukh (responsible for one page of the voter list, ~30 households). This structure lets a small core scale to thousands of voters and makes accountability measurable.',
      },
      {
        heading: 'Door-to-door canvassing',
        body: 'Face-to-face contact remains the highest-converting form of campaigning. Train volunteers on a short, consistent message, to listen more than they talk, to log every household\u2019s concerns, and to never make promises that violate the Model Code of Conduct. Follow up the most receptive households closer to polling day.',
      },
      {
        heading: 'Get-out-the-vote (GOTV)',
        body: 'A supporter who does not vote is a wasted contact. In the final 72 hours, focus entirely on turnout: distribute voter slips, arrange reminders, help elderly and first-time voters reach the booth, and track who has voted through the day.',
      },
    ],
    keyTakeaways: [
      'Map and staff every polling booth — elections are won booth by booth.',
      'Use a tiered volunteer pyramid down to ~30 households per worker.',
      'Door-to-door contact converts best; listen and log concerns.',
      'Dedicate the last 72 hours to turnout (GOTV), not persuasion.',
    ],
    citations: [
      { label: 'Voter turnout & booth data', publisher: 'Election Commission of India', url: 'https://www.eci.gov.in' },
      { label: 'Political participation handbooks (open access)', publisher: 'International IDEA', url: 'https://www.idea.int' },
    ],
  },

  'mod-5': {
    sections: [
      {
        heading: 'Expenditure ceilings',
        body: 'The ECI caps how much a candidate may legally spend. For a Lok Sabha seat the ceiling is up to \u20b995 lakh (varies by state) and for an Assembly seat up to \u20b940 lakh. Every candidate must maintain a separate bank account for election expenses and file a true account within 30 days of the result. Crossing the ceiling or filing a false account is a corrupt practice and can lead to disqualification.',
      },
      {
        heading: 'Legal sources of funds',
        body: 'Candidates and parties may accept voluntary contributions from individuals and companies subject to law. Cash donations above \u20b92,000 are not permitted from a single source; larger amounts must be by cheque, bank transfer or electoral instruments. Foreign contributions are prohibited. Companies may contribute within the limits set by the Companies Act.',
      },
      {
        heading: 'Crowdfunding & transparency',
        body: 'Many independents fund campaigns through small online donations. If you crowdfund, keep complete records of every donor and amount, route money only through the dedicated election account, and disclose as required. Transparency is both a legal duty and a powerful trust-building message with voters.',
      },
    ],
    keyTakeaways: [
      'Spending ceilings are set by the ECI (e.g., up to \u20b995 lakh for Lok Sabha).',
      'Maintain a separate election bank account and file accounts within 30 days.',
      'No cash donation above \u20b92,000 from one source; foreign funds are banned.',
      'Keep donor records for any crowdfunding and disclose them.',
    ],
    citations: [
      { label: 'Election expenditure limits & monitoring', publisher: 'Election Commission of India', url: 'https://www.eci.gov.in' },
      { label: 'Representation of the People Act, 1951 — s.77, s.78', publisher: 'India Code', url: 'https://www.indiacode.nic.in' },
      { label: 'Political finance in India — explainer', publisher: 'PRS Legislative Research', url: 'https://prsindia.org' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // LEGAL FRAMEWORK
  // ─────────────────────────────────────────────────────────────
  'mod-6': {
    sections: [
      {
        heading: 'Two Acts, two jobs',
        body: 'The Representation of the People Act, 1950 deals mainly with the preparation of electoral rolls and allocation of seats. The Representation of the People Act, 1951 governs the actual conduct of elections — qualifications and disqualifications of candidates, corrupt practices, and election disputes. Together they are the backbone of Indian election law.',
      },
      {
        heading: 'Qualifications & disqualifications',
        body: 'To contest a Lok Sabha or Assembly seat you must be an Indian citizen, a registered elector, and at least 25 years old (Assembly/Lok Sabha). You are disqualified if convicted of certain offences, if you hold an office of profit, are of unsound mind, or are an undischarged insolvent. Under s.8, conviction for specified offences with a sentence of two years or more disqualifies a person for the sentence period plus six years.',
      },
      {
        heading: 'Corrupt practices & election petitions',
        body: 'Section 123 lists corrupt practices — bribery, undue influence, appeals on the grounds of religion/caste, booth capturing and the like. An election can be challenged only through an election petition filed in the High Court within 45 days of the result; the court can declare an election void.',
      },
    ],
    keyTakeaways: [
      'RPA 1950 = electoral rolls/seats; RPA 1951 = conduct of elections.',
      'Minimum age to contest Lok Sabha/Assembly is 25.',
      's.8 disqualifies on conviction (2+ years) for sentence + 6 years.',
      'Challenge an election only via an election petition in the High Court within 45 days.',
    ],
    quiz: [
      {
        id: 'q6-1',
        question: 'Which Act primarily governs the conduct of elections and disqualifications?',
        options: ['RPA, 1950', 'RPA, 1951', 'The Constitution only', 'The IPC'],
        correctIndex: 1,
        explanation: 'The RPA 1951 governs the conduct of elections, qualifications/disqualifications and disputes.',
      },
      {
        id: 'q6-2',
        question: 'What is the minimum age to contest a Lok Sabha seat?',
        options: ['18', '21', '25', '30'],
        correctIndex: 2,
        explanation: 'A candidate must be at least 25 years old for the Lok Sabha and State Assemblies.',
      },
      {
        id: 'q6-3',
        question: 'Within how many days must an election petition be filed?',
        options: ['15 days', '30 days', '45 days', '90 days'],
        correctIndex: 2,
        explanation: 'An election petition must be filed in the High Court within 45 days of the result.',
      },
    ],
    citations: [
      { label: 'Representation of the People Act, 1950', publisher: 'India Code, Government of India', url: 'https://www.indiacode.nic.in' },
      { label: 'Representation of the People Act, 1951', publisher: 'India Code, Government of India', url: 'https://www.indiacode.nic.in' },
      { label: 'Disqualification under s.8 — overview', publisher: 'PRS Legislative Research', url: 'https://prsindia.org' },
    ],
  },

  'mod-7': {
    sections: [
      {
        heading: 'What the MCC is',
        body: 'The Model Code of Conduct (MCC) is a set of guidelines issued by the ECI that governs the conduct of parties and candidates from the moment elections are announced until results are declared. It is not a statute, but the ECI enforces it firmly and it has strong moral and practical force.',
      },
      {
        heading: 'What you must not do',
        body: 'No appeals to caste or communal feelings; no activity that aggravates differences or creates tension between communities; no bribing or intimidating voters; no use of government machinery, vehicles or funds for campaigning; no new schemes, grants or foundation-stone ceremonies once the MCC is in force; and no campaigning within 48 hours before polling.',
      },
      {
        heading: 'Consequences of violations',
        body: 'The ECI can issue notices, censure, order removal of posters, register FIRs for cognizable offences, bar a leader from campaigning for a period, and in serious cases recommend prosecution. Repeated or serious violations damage credibility with both the Commission and voters.',
      },
    ],
    keyTakeaways: [
      'The MCC applies from the election announcement until results.',
      'No communal/caste appeals, no misuse of government machinery, no new schemes.',
      'No campaigning in the 48-hour silence period.',
      'The ECI can censure, bar campaigning, or recommend prosecution.',
    ],
    quiz: [
      {
        id: 'q7-1',
        question: 'When does the Model Code of Conduct come into force?',
        options: [
          'On the day of counting',
          'When elections are announced',
          'One year before elections',
          'Only on polling day',
        ],
        correctIndex: 1,
        explanation: 'The MCC applies from the date the ECI announces the election schedule.',
      },
      {
        id: 'q7-2',
        question: 'Which of these is a clear MCC violation?',
        options: [
          'Holding a peaceful public rally with permission',
          'Announcing a new government scheme after the schedule is declared',
          'Door-to-door canvassing',
          'Publishing your manifesto',
        ],
        correctIndex: 1,
        explanation: 'Announcing new schemes/grants after the MCC is in force is prohibited.',
      },
      {
        id: 'q7-3',
        question: 'Is the MCC a law passed by Parliament?',
        options: [
          'Yes, it is a statute',
          'No, it is an ECI-enforced code of guidelines',
          'Yes, part of the Constitution',
          'No, it has no effect',
        ],
        correctIndex: 1,
        explanation: 'The MCC is not a statute; it is a code the ECI enforces with strong practical force.',
      },
    ],
    citations: [
      { label: 'Model Code of Conduct', publisher: 'Election Commission of India', url: 'https://www.eci.gov.in/mcc' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // PUBLIC SPEAKING
  // ─────────────────────────────────────────────────────────────
  'mod-8': {
    sections: [
      {
        heading: 'One message, repeated',
        body: 'Voters remember a campaign by one clear idea, not ten. Define a single core message that captures why you are running and what changes for the voter. Successful campaigns are remembered by their through-line; muddled ones are forgotten. Say the same thing, in different words, everywhere.',
      },
      {
        heading: 'Ethos, pathos, logos',
        body: 'Persuasion has worked the same way since Aristotle: establish your credibility (ethos), connect emotionally with the lived reality of your audience (pathos), and back it with facts and a plan (logos). A speech that has only one of the three feels hollow; balance all three.',
      },
      {
        heading: 'Speak to values, not just problems',
        body: 'Name the problem, but anchor it to a value the audience already holds \u2014 dignity, fairness, safety, opportunity. Use concrete local examples over abstractions, keep sentences short, and end every speech with a specific call to action: register, attend, volunteer, vote.',
      },
    ],
    keyTakeaways: [
      'Pick ONE core message and repeat it everywhere.',
      'Balance credibility (ethos), emotion (pathos) and evidence (logos).',
      'Tie problems to values the audience already holds.',
      'Always end with a specific, doable call to action.',
    ],
    video: {
      youtubeId: 'bGBamfWasNQ',
      title: 'Speak like a leader',
      channel: 'TEDx Talks (Simon Lancaster, TEDxVerona)',
      sourceUrl: 'https://www.youtube.com/watch?v=bGBamfWasNQ',
    },
    citations: [
      { label: '\u201cSpeak like a leader\u201d — Simon Lancaster (TEDxVerona)', publisher: 'TEDx Talks', url: 'https://www.youtube.com/watch?v=bGBamfWasNQ' },
      { label: '\u201cHow to use rhetoric to get what you want\u201d', publisher: 'TED-Ed (Camille A. Langston)', url: 'https://www.youtube.com/watch?v=3klMM9BkW5o' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // COMMUNITY ORGANIZING
  // ─────────────────────────────────────────────────────────────
  'mod-9': {
    sections: [
      {
        heading: 'The constitutional basis',
        body: 'The 73rd and 74th Constitutional Amendments (1992) created the framework for local self-government \u2014 Panchayati Raj Institutions in rural areas and Municipalities in urban areas. They mandate regular elections, reservation for women and weaker sections, and bodies like the Gram Sabha and Ward Committees through which citizens participate directly.',
      },
      {
        heading: 'Running a ward sabha',
        body: 'A ward/area sabha is your most powerful organising tool. To run an effective one: publicise it widely in advance, fix a single clear agenda, invite the relevant official, keep minutes, and convert grievances into a written, prioritised list with owners and deadlines. Follow up publicly so residents see results.',
      },
      {
        heading: 'Building a standing volunteer network',
        body: 'Move beyond one-off meetings. Maintain a contact list segmented by locality and issue, recognise active volunteers, rotate responsibilities so no one burns out, and use a simple shared tracker for open civic complaints. A network that outlives a single campaign is the foundation of credible local leadership.',
      },
    ],
    keyTakeaways: [
      'The 73rd & 74th Amendments created Panchayats and Municipalities.',
      'The Gram Sabha/Ward Committee is the citizen\u2019s direct participation channel.',
      'Run ward sabhas with one agenda, written minutes and tracked follow-ups.',
      'Build a standing, segmented volunteer network that outlives one election.',
    ],
    citations: [
      { label: '73rd & 74th Constitutional Amendment Acts, 1992', publisher: 'Government of India', url: 'https://legislative.gov.in/constitution-of-india' },
      { label: 'Panchayati Raj — roles & Gram Sabha', publisher: 'Ministry of Panchayati Raj', url: 'https://panchayat.gov.in' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // DIGITAL CAMPAIGNING
  // ─────────────────────────────────────────────────────────────
  'mod-10': {
    sections: [
      {
        heading: 'Pick the right platform for the job',
        body: 'Each channel does a different job: WhatsApp for trusted, last-mile mobilisation through local groups; YouTube for longer explainers and speeches; Instagram/Reels for reach among younger voters; and X for rapid response and news cycles. Don\u2019t spread thin \u2014 master two channels well.',
      },
      {
        heading: 'A simple content calendar',
        body: 'Plan a weekly rhythm: one issue explainer, one ground-report (work done / problem highlighted), one voter testimonial, and timely reactions. Repurpose a single piece of work into multiple formats. Consistency beats volume.',
      },
      {
        heading: 'Rules and responsibility',
        body: 'Pre-certify political advertisements with the ECI\u2019s Media Certification & Monitoring Committee (MCMC) where required, account for digital ad spend in your election expenses, never publish content in the 48-hour silence period, and avoid misinformation or deepfakes \u2014 they invite legal action and destroy trust.',
      },
    ],
    keyTakeaways: [
      'Master 2 channels rather than spreading across all.',
      'Use a weekly calendar; repurpose one piece of work into many formats.',
      'Pre-certify political ads (MCMC) and count digital spend in expenses.',
      'No posting in the 48-hour silence period; never spread misinformation.',
    ],
    citations: [
      { label: 'Instructions on social media & political advertisements', publisher: 'Election Commission of India', url: 'https://www.eci.gov.in' },
      { label: 'Voluntary Code of Ethics for the General Election', publisher: 'ECI / IAMAI', url: 'https://www.eci.gov.in' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // POLICY MAKING
  // ─────────────────────────────────────────────────────────────
  'mod-11': {
    sections: [
      {
        heading: 'What a policy brief is',
        body: 'A policy brief is a short (1\u20134 page) document that frames a problem and recommends a course of action for a decision-maker. It is not an essay \u2014 it is built for a busy reader who needs the bottom line quickly, with evidence available to back it up.',
      },
      {
        heading: 'A reliable structure',
        body: 'Use this skeleton: (1) Title and one-line summary; (2) the Problem, with data; (3) Background/context; (4) Options, each with pros, cons and cost; (5) a clear Recommendation; (6) Implementation steps and who is responsible; and (7) Sources. Lead with the recommendation if your reader is senior.',
      },
      {
        heading: 'Evidence and feasibility',
        body: 'Every claim should be traceable to a credible source \u2014 government data, audited reports, peer-reviewed studies. Test each option for administrative feasibility, budget, legal authority and political acceptability. A brilliant idea that cannot be funded or implemented is not a recommendation.',
      },
    ],
    keyTakeaways: [
      'A policy brief is short and decision-oriented, not an essay.',
      'Structure: problem \u2192 context \u2192 options (cost/pros/cons) \u2192 recommendation \u2192 implementation \u2192 sources.',
      'Every claim must be traceable to credible evidence.',
      'Test options for feasibility, budget, legality and acceptability.',
    ],
    citations: [
      { label: 'How to write a policy brief (open access guide)', publisher: 'International IDEA', url: 'https://www.idea.int' },
      { label: 'Evidence & budget data for India', publisher: 'PRS Legislative Research', url: 'https://prsindia.org' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // ETHICS & GOVERNANCE
  // ─────────────────────────────────────────────────────────────
  'mod-12': {
    sections: [
      {
        heading: 'The seven principles of public life',
        body: 'The widely cited \u201cNolan Principles\u201d set the standard for anyone holding public office: Selflessness, Integrity, Objectivity, Accountability, Openness, Honesty and Leadership. They are a simple, memorable test you can apply to any decision: would it survive public scrutiny on each of these seven counts?',
      },
      {
        heading: 'Conflict of interest & disclosure',
        body: 'A conflict of interest arises when a personal interest could improperly influence a public duty. The remedy is disclosure and recusal: declare the interest, step back from the decision, and document it. In India, candidates already disclose assets and liabilities via the Form 26 affidavit; elected representatives should keep disclosures current.',
      },
      {
        heading: 'Building and keeping public trust',
        body: 'Trust is earned through consistent, transparent conduct: publish how funds are used, hold regular open interactions, admit mistakes, and avoid even the appearance of impropriety. India\u2019s Second Administrative Reforms Commission (ARC) stressed transparency and citizen-centric governance as the core of ethical public administration.',
      },
    ],
    keyTakeaways: [
      'Apply the seven Nolan Principles as a decision test.',
      'Manage conflicts of interest by disclosing and recusing yourself.',
      'Candidates disclose assets/criminal cases via Form 26 — keep it current.',
      'Transparency and admitting mistakes are how public trust is built.',
    ],
    citations: [
      { label: 'The 7 Principles of Public Life (Nolan Principles)', publisher: 'UK Committee on Standards in Public Life', url: 'https://www.gov.uk/government/publications/the-7-principles-of-public-life' },
      { label: 'Ethics in Governance — 4th Report', publisher: 'Second Administrative Reforms Commission, Government of India', url: 'https://darpg.gov.in' },
    ],
  },
};
