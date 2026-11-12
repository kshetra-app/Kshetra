import type {
  DelimitationStatusDTO,
  MathematicalProvenance,
  TimelineEventItem,
} from '@kshetra/shared';

/**
 * Curated timeline of source-backed delimitation and Census milestones.
 * This is the single API source used by the route and query service.
 */
const CANONICAL_TIMELINE: TimelineEventItem[] = [
  {
    id: 'LEG-2002-01',
    date: '2002-06-03',
    title: 'Delimitation Act, 2002 enacted',
    significance: 'critical',
    verified: true,
    category: 'gazette_notification',
    sourceUrl:
      'https://www.legislative.gov.in/static/uploads/2025/07/9114eab35ed1da6c31fa85a82e400b28.pdf',
    instrument: 'The Delimitation Act, 2002 (Act No. 33 of 2002)',
    authority: 'Parliament of India',
    description:
      'The Act provides for readjustment of seat allocation and delimitation of territorial constituencies under the statutory process.',
  },
  {
    id: 'LEG-2008-01',
    date: '2008-02-19',
    title: 'Delimitation of Parliamentary and Assembly Constituencies Order, 2008',
    significance: 'critical',
    verified: true,
    category: 'gazette_notification',
    sourceUrl:
      'https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf',
    instrument: 'Delimitation Order, 2008; composite Andhra Pradesh schedules',
    authority: 'Election Commission of India',
    description:
      'The ECI consolidated order contains the historical seat-allocation and constituency schedules, including the then composite State of Andhra Pradesh.',
  },
  {
    id: 'LEG-2014-01',
    date: '2014-03-01',
    title: 'Andhra Pradesh Reorganisation Act, 2014 enacted',
    significance: 'high',
    verified: false,
    category: 'parliamentary_debate',
    instrument: 'Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014)',
    authority: 'Parliament of India',
    description:
      'The Act provides the statutory framework for the formation of the successor States of Andhra Pradesh and Telangana. The underlying primary document is not yet retained in this repository.',
  },
  {
    id: 'LEG-2014-02',
    date: '2014-06-02',
    title: 'Appointed day for the formation of Telangana',
    significance: 'high',
    verified: false,
    category: 'gazette_notification',
    instrument: 'Andhra Pradesh Reorganisation Act, 2014 and appointed-day notification',
    authority: 'Government of India',
    description:
      'The appointed day under the Reorganisation Act took effect. The primary notification is not yet retained in this repository.',
  },
  {
    id: 'LEG-2015-01',
    date: '2015-04-23',
    title: 'G.S.R. 311(E): Andhra Pradesh Reorganisation (Removal of Difficulties) Order, 2015',
    significance: 'high',
    verified: false,
    category: 'gazette_notification',
    instrument: 'G.S.R. 311(E), dated 23 April 2015',
    authority: 'President of India / Ministry of Home Affairs',
    description:
      'The order provided for specified territorial transfers connected with the Polavaram project. The repository dossier records the instrument, but its primary Gazette document is not retained here.',
    sourceReference:
      'Repository evidence dossier: data/evidence/w020/authoritative/mha_gsr_311e_2015_source_dossier.md',
  },
  {
    id: 'LEG-2018-01',
    date: '2018-09-22',
    title: 'ECI Notification No. 282/AP/2018(DEL)',
    significance: 'high',
    verified: true,
    category: 'gazette_notification',
    sourceUrl:
      'https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIsVIzE4H7zCkL60TDPfde3hSidsZ4fuGUaZAjsPMK3mFe%2FOayCb%2Bc1mgC3WIErfdO%2BA072J7HtGm2kYfstpL5XIZTWrH2JWU7UfZrKWF1BUsH9xccKER%2BJMZVGi7SrzX57%2FMm24zs1eyK2AB5zsjcWKzrILRQG%2FBbbQ%2Fx5bNYVaCn7kX4xoHNibbBVAsqukcOQ%3D%3D',
    instrument: 'Notification No. 282/AP/2018(DEL), dated 22 September 2018',
    authority: 'Election Commission of India',
    description:
      'The retained, hash-verified ECI notification amends the Andhra Pradesh constituency extents for Rampachodavaram and Polavaram. The separate Gazette issue and State Gazette counterpart have not been verified.',
    sourceReference:
      'Repository evidence dossier: data/evidence/w020/authoritative/eci_notification_282_ap_2018_source_dossier.md',
  },
  {
    id: 'LEG-CENSUS-2025-06-16',
    date: '2025-06-16',
    title: 'Census of India 2027 notified',
    significance: 'critical',
    verified: true,
    category: 'census_notification',
    sourceUrl:
      'https://censusindia.gov.in/nada/index.php/catalog/45572/download/49769/GAZ_NOTIFICATION_07.pdf',
    instrument: 'Census of India notification, 16 June 2025',
    authority: 'Office of the Registrar General & Census Commissioner, India',
    description:
      'The Government of India notified that the next decennial Census will be Census 2027.',
  },
  {
    id: 'LEG-CENSUS-2026-01-07',
    date: '2026-01-07',
    title: 'First-phase Census 2027 houselisting period notified',
    significance: 'high',
    verified: true,
    category: 'census_notification',
    sourceUrl:
      'https://censusindia.gov.in/nada/index.php/catalog/47084/download/51329/GAZ_NOTIFICATION_10.pdf',
    instrument: 'Gazette Notification S.O. 99(E), dated 7 January 2026',
    authority: 'Office of the Registrar General & Census Commissioner, India',
    description:
      'The notification sets the first-phase houselisting operations period as 1 April through 30 September 2026, with state and union-territory schedules specified separately and subject to later notifications.',
  },
  {
    id: 'LEG-2026-04-16-BILLS-INTRODUCED',
    date: '2026-04-16',
    title: 'Delimitation-related bills introduced in Lok Sabha',
    significance: 'high',
    verified: true,
    category: 'parliamentary_debate',
    sourceUrl: 'https://elibrary.sansad.in/items/50ee895c-e29c-4d40-bfa0-7f1f6212d8a8',
    instrument:
      'Constitution (131st Amendment), Delimitation, and Union Territories Laws (Amendment) Bills, 2026',
    authority: 'Lok Sabha Secretariat',
    description: 'Official parliamentary records list the bills as introduced on 16 April 2026.',
    eventType: 'INTRODUCTION',
    outcome: 'INTRODUCED',
    classification: 'PROPOSED_LEGISLATIVE',
    houseOfIntroduction: 'LOK_SABHA',
    sourceReference: 'Lok Sabha eLibrary records for 16 April 2026',
  },
  {
    id: 'LEG-2026-04-17-BILLS-NOT-PASSED',
    date: '2026-04-17',
    title: 'Delimitation-related bills not passed',
    significance: 'critical',
    verified: true,
    category: 'parliamentary_debate',
    sourceUrl: 'https://elibrary.sansad.in/items/74504ab2-6fce-4a36-9444-7d3bb041af84',
    instrument: 'Lok Sabha record of proceedings, 17 April 2026',
    authority: 'Lok Sabha Secretariat',
    description:
      'The official record identifies the Constitution (131st Amendment), Delimitation, and Union Territories Laws (Amendment) Bills as not passed. This entry does not infer additional legal consequences or report unverified division figures.',
    eventType: 'TERMINAL_STATUS',
    outcome: 'NOT_PASSED',
    classification: 'HISTORICAL_FACT',
    houseOfIntroduction: 'LOK_SABHA',
    sourceReference: 'Lok Sabha eLibrary record published 17 April 2026',
  },
  {
    id: 'LEG-CENSUS-2026-11-02-POPULATION-ENUMERATION',
    date: '2026-11-02',
    title: 'Census 2027 population-enumeration phase notified',
    significance: 'critical',
    verified: true,
    category: 'census_notification',
    sourceUrl: 'https://censusindia.gov.in/nada/index.php/catalog/47179/study-description',
    instrument:
      'ORGI Gazette Notification_13: Population Enumeration (Phase-II) of Census of India 2027',
    authority: 'Office of the Registrar General & Census Commissioner, India',
    description:
      'The ORGI Digital Library catalogues the Phase-II population-enumeration Gazette notification as published on 2 November 2026. The Census of India website lists self-enumeration from 16 to 30 November 2026, door-to-door enumeration from 1 December 2026 to 4 January 2027, and a revisional round from 5 to 9 January 2027 for Uttar Pradesh, Punjab, Goa, and non-snow-bound areas of Uttarakhand. These are scheduled operations; final population results remain unavailable.',
    sourceReference:
      'ORGI Digital Library GAZ_NOTIFICATION_20 (published 2026-11-02); Census of India official homepage, accessed 2026-11-12',
  },
];

export function getCanonicalDelimitationTimeline(): TimelineEventItem[] {
  return CANONICAL_TIMELINE.map((event) => ({ ...event }));
}

export function getCanonicalDelimitationTimelineProvenance(): MathematicalProvenance {
  const { provenance } = getCanonicalDelimitationStatus();

  return {
    ...provenance,
    dataStatus: 'UNVERIFIED',
    inputDatasetVersions: provenance.inputDatasetVersions.map((dataset) => ({
      ...dataset,
      evidenceStatus:
        'Mixed evidence: official-source-linked entries are marked per event; repository-only entries remain explicitly unverified.',
    })),
  };
}

export function getCanonicalDelimitationStatus(): DelimitationStatusDTO {
  const now = new Date().toISOString();
  const lastReviewedAt = '2026-11-12T00:00:00.000Z';

  return {
    nationalStatus: 'census_underway',
    statusLabel: 'Census 2027 operations',
    description:
      'The current constituency framework remains under the constitutional freeze until the first census taken after 2026 has been completed and its relevant figures officially published. Census 2027 is proceeding under phased official notifications. The current published schedule covers population enumeration in Uttar Pradesh, Punjab, Goa, and non-snow-bound areas of Uttarakhand from December 2026 through January 2027; final population results have not been published.',
    constitutionalFramework: 'Constitution of India Articles 81, 82, 170, 330, and 332',
    nextMilestone:
      'Completion of Census 2027 population enumeration and official publication of final results',
    censusTracking: {
      constitutionalTrigger: 'First census taken after 2026 (Articles 82 and 170)',
      currentExpectedCensusOperation:
        'Phased Census of India 2027; population enumeration is scheduled in Uttar Pradesh, Punjab, Goa, and non-snow-bound Uttarakhand from December 2026 to January 2027',
      finalPopulationAvailable: false,
    },
    lastUpdated: lastReviewedAt,
    provenance: {
      inputDatasetVersions: [
        {
          datasetId: 'official_delimitation_census_and_parliamentary_records',
          versionTag: 'source-review-2026-11-12',
          sourceAuthority:
            'Election Commission of India; Legislative Department; Census of India; Lok Sabha Secretariat',
          publicationDate: '2026-11-12',
          evidenceStatus:
            'Linked claims use official publications; repository-only items are explicitly marked unverified.',
        },
      ],
      methodology: 'CURATED_PRIMARY_SOURCE_STATUS_REVIEW',
      modelVersion: '1.0.0',
      calculatedAt: now,
      legalStatus: 'CURRENT_LEGAL_REGIME',
      outputClassification: 'STATUTORY_FACT',
      dataStatus: 'OFFICIAL',
      evidenceReferences: [
        'https://censusindia.gov.in/census.website/en',
        'https://censusindia.gov.in/nada/index.php/catalog/47179/study-description',
        'https://elibrary.sansad.in/items/74504ab2-6fce-4a36-9444-7d3bb041af84',
      ],
    },
  };
}
