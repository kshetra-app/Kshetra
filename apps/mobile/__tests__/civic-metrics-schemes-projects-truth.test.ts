import { apiClient } from '../lib/api';
import { useCivicMetricsStore } from '../stores/civicMetrics';

const schemeRow = {
  id: 'scheme-ts-1',
  name: 'Public Education Support',
  short_name: 'Education Support',
  category: 'education',
  status: 'active',
  launched_date: '2025-04-01',
  ministry: 'Education Department',
  level: 'state',
  state_code: 'TS',
  description: 'A persisted scheme record.',
  eligibility: 'Eligible households',
  benefits: 'Support as notified',
  application_url: null,
  budget_crores: '12.5',
  beneficiaries_target: null,
  beneficiaries_actual: '200',
  coverage_percent: null,
  district_wise_coverage: [],
  constituency_wise_coverage: [],
  documents: [{ title: 'Guideline', url: 'https://example.org/guideline.pdf' }],
  updated_at: null,
};

const projectRow = {
  id: 'project-ts-1',
  name: 'District Road Improvement',
  category: 'road',
  phase: 'under_construction',
  state_code: 'TS',
  district_name: 'Hyderabad',
  constituency_ac_no: 12,
  ward_no: null,
  description: 'A persisted project record.',
  contractor: null,
  sanctioned_cost_crores: '50',
  revised_cost_crores: null,
  expenditure_crores: null,
  sanctioned_date: '2025-01-10',
  expected_completion: null,
  actual_completion: null,
  delay_days: null,
  physical_progress: null,
  financial_progress: '35.5',
  gps_lat: null,
  gps_lng: null,
  photos: [],
  milestones: [],
  issues: [],
  last_inspection: null,
  source: null,
  updated_at: null,
};

const scheme = (id: string, stateCode?: string, level: 'central' | 'state' = 'state') => ({
  id,
  name: id,
  shortName: id,
  category: 'education',
  status: 'active',
  launchedDate: '2025-04-01',
  ministry: 'Education Department',
  level,
  stateCode,
  description: '',
  eligibility: '',
  benefits: '',
  applicationUrl: undefined,
  budgetCrores: null,
  beneficiariesTarget: null,
  beneficiariesActual: null,
  coveragePercent: null,
  districtWiseCoverage: [],
  constituencyWiseCoverage: [],
  documents: [],
  updatedAt: null,
} as any);

const project = (id: string, stateCode: string) => ({
  id,
  name: id,
  category: 'road',
  phase: 'approved',
  stateCode,
  districtName: 'Hyderabad',
  description: '',
  sanctionedCostCrores: null,
  revisedCostCrores: null,
  expenditureCrores: null,
  sanctionedDate: null,
  expectedCompletion: null,
  delayDays: null,
  physicalProgress: null,
  financialProgress: null,
  photos: [],
  milestones: [],
  issues: [],
  source: null,
  updatedAt: null,
} as any);

describe('production civic scheme and project data', () => {
  it('maps persisted scheme fields and keeps unavailable counts null', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { schemes: [schemeRow], total: 61 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'scheme-test',
    } as any);

    try {
      const response = await apiClient.civic.listGovernmentSchemes('TS', 2, 25);
      expect(get).toHaveBeenCalledWith('/api/v1/civic/schemes', {
        authPolicy: 'public',
        query: { state: 'TS', page: 2, limit: 25 },
      });
      expect(response.total).toBe(61);
      expect(response.items[0]).toMatchObject({
        id: 'scheme-ts-1',
        shortName: 'Education Support',
        stateCode: 'TS',
        budgetCrores: 12.5,
        beneficiariesTarget: null,
        beneficiariesActual: 200,
        coveragePercent: null,
        updatedAt: null,
      });
    } finally {
      get.mockRestore();
    }
  });

  it('maps project rows and preserves missing expenditure, progress, completion, and delay values', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { projects: [projectRow], total: 1 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'project-test',
    } as any);

    try {
      const response = await apiClient.civic.listDevelopmentProjects('TS');
      expect(get).toHaveBeenCalledWith('/api/v1/civic/projects', {
        authPolicy: 'public',
        query: { state: 'TS', page: 1, limit: 50 },
      });
      expect(response.items[0]).toMatchObject({
        id: 'project-ts-1',
        constituencyAcNo: 12,
        sanctionedCostCrores: 50,
        expenditureCrores: null,
        expectedCompletion: null,
        delayDays: null,
        physicalProgress: null,
        financialProgress: 35.5,
      });
    } finally {
      get.mockRestore();
    }
  });

  it('rejects records from another state instead of showing them under the selected state', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { projects: [{ ...projectRow, state_code: 'KA' }], total: 1 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'project-state-mismatch',
    } as any);

    try {
      await expect(apiClient.civic.listDevelopmentProjects('TS')).rejects.toThrow(
        'A public project record contains invalid fields or does not match the requested state',
      );
    } finally {
      get.mockRestore();
    }
  });

  it('loads schemes and projects by state and merges additional pages without duplicates', async () => {
    const previous = useCivicMetricsStore.getState();
    useCivicMetricsStore.setState({
      schemes: [scheme('stale-ts', 'TS'), scheme('keep-ka', 'KA')],
      projects: [project('stale-ts-project', 'TS'), project('keep-ka-project', 'KA')],
      schemeLoadStatus: 'idle',
      schemeLoadStateCode: null,
      schemeTotal: 0,
      schemePage: 0,
      projectLoadStatus: 'idle',
      projectLoadStateCode: null,
      projectTotal: 0,
      projectPage: 0,
    });
    const listSchemes = jest.spyOn(apiClient.civic, 'listGovernmentSchemes')
      .mockResolvedValueOnce({ items: [scheme('central-1', undefined, 'central'), scheme('ts-page-1', 'TS')], total: 52 })
      .mockResolvedValueOnce({ items: [scheme('ts-page-1', 'TS'), scheme('ts-page-2', 'TS')], total: 52 });
    const listProjects = jest.spyOn(apiClient.civic, 'listDevelopmentProjects')
      .mockResolvedValueOnce({ items: [project('ts-project-1', 'TS')], total: 52 })
      .mockResolvedValueOnce({ items: [project('ts-project-1', 'TS'), project('ts-project-2', 'TS')], total: 52 });

    try {
      await useCivicMetricsStore.getState().loadSchemesByState('TS');
      await useCivicMetricsStore.getState().loadProjectsByState('TS');
      expect(useCivicMetricsStore.getState().getSchemesByState('TS').map((item) => item.id)).toEqual(['central-1', 'ts-page-1']);
      expect(useCivicMetricsStore.getState().getProjectsByState('TS').map((item) => item.id)).toEqual(['ts-project-1']);
      await useCivicMetricsStore.getState().loadMoreSchemesByState('TS');
      await useCivicMetricsStore.getState().loadMoreProjectsByState('TS');
      expect(listSchemes).toHaveBeenNthCalledWith(2, 'TS', 2);
      expect(listProjects).toHaveBeenNthCalledWith(2, 'TS', 2);
      expect(useCivicMetricsStore.getState().getSchemesByState('TS').map((item) => item.id)).toEqual([
        'central-1', 'ts-page-1', 'ts-page-2',
      ]);
      expect(useCivicMetricsStore.getState().getProjectsByState('TS').map((item) => item.id)).toEqual([
        'ts-project-1', 'ts-project-2',
      ]);
    } finally {
      listSchemes.mockRestore();
      listProjects.mockRestore();
      useCivicMetricsStore.setState({
        schemes: previous.schemes,
        projects: previous.projects,
        schemeLoadStatus: previous.schemeLoadStatus,
        schemeLoadStateCode: previous.schemeLoadStateCode,
        schemeTotal: previous.schemeTotal,
        schemePage: previous.schemePage,
        projectLoadStatus: previous.projectLoadStatus,
        projectLoadStateCode: previous.projectLoadStateCode,
        projectTotal: previous.projectTotal,
        projectPage: previous.projectPage,
      });
    }
  });
});
