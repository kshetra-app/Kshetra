import { apiClient } from '../lib/api';
import { parseStateBudgetSummary } from '../lib/civicMetricsTypes';
import { useCivicMetricsStore } from '../stores/civicMetrics';

describe('production civic budget data', () => {
  it('keeps absent financial fields unavailable instead of converting them to zero', () => {
    const summary = parseStateBudgetSummary({
      state_code: 'TS',
      fiscal_year: '2025-26',
      total_budget_crores: '1000.5',
      total_revised_crores: null,
      total_spent_crores: null,
      overall_utilization: null,
      category_breakdown: [{ category: 'education', allocated: '125', spent: null, utilization: null }],
      top_schemes: [],
      fiscal_deficit_crores: null,
      revenue_deficit_crores: null,
      debt_to_gdp_ratio: null,
    }, 'TS');

    expect(summary).toMatchObject({
      stateCode: 'TS',
      fiscalYear: '2025-26',
      totalBudgetCrores: 1000.5,
      totalRevisedCrores: null,
      totalSpentCrores: null,
      overallUtilization: null,
      categoryBreakdown: [{ allocated: 125, spent: null, utilization: null }],
      fiscalDeficitCrores: null,
      revenueDeficitCrores: null,
      debtToGDPRatio: null,
    });
  });

  it('rejects a stored row without the required total budget instead of showing a partial card as complete', () => {
    expect(parseStateBudgetSummary({ fiscal_year: '2025-26', total_budget_crores: null }, 'TS')).toBeNull();
  });

  it('requests the stored summary through the public API and maps its database fields', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        stateCode: 'TS',
        message: 'Budget summary loaded from stored records.',
        budget: {
          state_code: 'TS',
          fiscal_year: '2025-26',
          total_budget_crores: '1000',
          total_revised_crores: null,
          total_spent_crores: '350',
          overall_utilization: '35',
          category_breakdown: [],
          top_schemes: [],
          fiscal_deficit_crores: null,
          revenue_deficit_crores: null,
          debt_to_gdp_ratio: null,
        },
      },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'budget-test',
    } as any);

    try {
      const summary = await apiClient.civic.getStateBudgetSummary('TS');
      expect(get).toHaveBeenCalledWith('/api/v1/civic/budget/TS', { authPolicy: 'public' });
      expect(summary).toMatchObject({ totalBudgetCrores: 1000, totalSpentCrores: 350, overallUtilization: 35 });
    } finally {
      get.mockRestore();
    }
  });

  it('loads and replaces the state summary from the canonical API', async () => {
    const previous = useCivicMetricsStore.getState().budgetSummaries;
    const loadedSummary = {
      stateCode: 'TS',
      fiscalYear: '2026-27',
      totalBudgetCrores: 1200,
      totalRevisedCrores: null,
      totalSpentCrores: null,
      overallUtilization: null,
      categoryBreakdown: [],
      topSchemes: [],
      fiscalDeficitCrores: null,
      revenueDeficitCrores: null,
      debtToGDPRatio: null,
      updatedAt: null,
    };
    const request = jest.spyOn(apiClient.civic, 'getStateBudgetSummary').mockResolvedValue(loadedSummary);

    try {
      await useCivicMetricsStore.getState().loadBudgetSummary('TS');
      expect(request).toHaveBeenCalledWith('TS');
      expect(useCivicMetricsStore.getState().getBudgetSummary('TS')).toEqual(loadedSummary);
      expect(useCivicMetricsStore.getState().budgetLoadStatus).toBe('loaded');
    } finally {
      request.mockRestore();
      useCivicMetricsStore.setState({
        budgetSummaries: previous,
        budgetLoadStatus: 'idle',
        budgetLoadStateCode: null,
      });
    }
  });
});
