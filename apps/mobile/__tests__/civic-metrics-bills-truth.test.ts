import { apiClient } from '../lib/api';
import { useCivicMetricsStore } from '../stores/civicMetrics';

const billRow = {
  id: 'bill-ts-1',
  title: 'State Budget Bill',
  short_title: 'Budget Bill',
  type: 'ordinary',
  status: 'introduced',
  introduced_by: 'Example Member',
  introduced_by_party: null,
  house_introduced: 'state_assembly',
  state_code: 'TS',
  introduced_date: '2026-10-20',
  last_action_date: null,
  summary: 'A filed bill record.',
  full_text_url: null,
  committee_report_url: null,
  related_departments: ['Finance'],
  tags: ['budget'],
  affected_constituencies: [1, 2],
  votes_for: null,
  votes_against: null,
  votes_abstain: null,
  public_opinion: { support: '12', oppose: null, neutral: 0 },
  amendments: [],
  timeline: [{ date: '2026-10-20', action: 'Introduced' }],
  created_at: null,
  updated_at: null,
};

describe('production civic legislation data', () => {
  it('loads public state-filtered records, maps database fields, and preserves unknown metrics', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { bills: [billRow], total: 51 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'bill-test',
    } as any);

    try {
      const response = await apiClient.civic.listBills('TS', 2, 25);
      expect(get).toHaveBeenCalledWith('/api/v1/civic/bills', {
        authPolicy: 'public',
        query: { state: 'TS', page: 2, limit: 25 },
      });
      expect(response.total).toBe(51);
      expect(response.items[0]).toMatchObject({
        id: 'bill-ts-1',
        shortTitle: 'Budget Bill',
        introducedByParty: null,
        stateCode: 'TS',
        introducedDate: '2026-10-20',
        lastActionDate: null,
        votesFor: null,
        publicOpinion: { support: 12, oppose: null, neutral: 0 },
        createdAt: null,
        updatedAt: null,
      });
    } finally {
      get.mockRestore();
    }
  });

  it('rejects records that do not match the requested state or contain an unsupported status', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { bills: [{ ...billRow, state_code: 'KA' }], total: 1 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'bill-state-mismatch',
    } as any);

    try {
      await expect(apiClient.civic.listBills('TS')).rejects.toThrow(
        'A public legislation record contains invalid fields or does not match the requested state',
      );
      get.mockResolvedValueOnce({
        data: { bills: [{ ...billRow, status: 'fabricated_status' }], total: 1 },
        statusCode: 200,
        headers: new Headers(),
        requestId: 'bill-invalid-count',
      } as any);
      await expect(apiClient.civic.listBills('TS')).rejects.toThrow(
        'A public legislation record contains invalid fields or does not match the requested state',
      );
    } finally {
      get.mockRestore();
    }
  });

  it('validates state and pagination inputs before making a request', async () => {
    const get = jest.spyOn(apiClient, 'get');

    try {
      await expect(apiClient.civic.listBills('Telangana')).rejects.toThrow('Invalid stateCode');
      await expect(apiClient.civic.listBills('TS', 0)).rejects.toThrow('Invalid page');
      await expect(apiClient.civic.listBills('TS', 1, 101)).rejects.toThrow('Invalid limit');
      expect(get).not.toHaveBeenCalled();
    } finally {
      get.mockRestore();
    }
  });

  it('replaces a user opinion count with the server aggregate and does not invent an optimistic count', async () => {
    const previousBills = useCivicMetricsStore.getState().bills;
    const bill = { ...previousBills[0], id: 'bill-opinion', stateCode: 'TS' };
    useCivicMetricsStore.setState({ bills: [bill] });
    const opinion = jest.spyOn(apiClient.civic, 'postCitizenOpinion').mockResolvedValue({
      success: true,
      billId: bill.id,
      support: true,
      publicOpinion: { support: 7, oppose: 4, neutral: 0 },
    });

    try {
      const pending = useCivicMetricsStore.getState().supportBill(bill.id);
      expect(useCivicMetricsStore.getState().bills[0].publicOpinion.support).toBe(bill.publicOpinion.support);
      await expect(pending).resolves.toBe(true);
      expect(useCivicMetricsStore.getState().bills[0].publicOpinion).toEqual({
        support: 7,
        oppose: 4,
        neutral: 0,
      });
    } finally {
      opinion.mockRestore();
      useCivicMetricsStore.setState({ bills: previousBills });
    }
  });

  it('replaces only the selected state and merges later pages without duplicate bill IDs', async () => {
    const previous = useCivicMetricsStore.getState();
    const seeded = previous.bills[0];
    const staleStateBill = { ...seeded, id: 'stale-ts', stateCode: 'TS' };
    const otherStateBill = { ...seeded, id: 'keep-ka', stateCode: 'KA' };
    const firstPageBill = { ...seeded, id: 'page-one-ts', stateCode: 'TS' };
    const secondPageBill = { ...seeded, id: 'page-two-ts', stateCode: 'TS' };
    useCivicMetricsStore.setState({
      bills: [staleStateBill, otherStateBill],
      billLoadStatus: 'idle',
      billLoadStateCode: null,
      billTotal: 0,
      billPage: 0,
    });
    const list = jest.spyOn(apiClient.civic, 'listBills')
      .mockResolvedValueOnce({ items: [firstPageBill], total: 2 })
      .mockResolvedValueOnce({ items: [firstPageBill, secondPageBill], total: 2 });

    try {
      await useCivicMetricsStore.getState().loadBillsByState('TS');
      expect(useCivicMetricsStore.getState().getBillsByState('TS')).toEqual([firstPageBill]);
      expect(useCivicMetricsStore.getState().getBillsByState('KA')).toEqual([otherStateBill]);
      await useCivicMetricsStore.getState().loadMoreBillsByState('TS');
      expect(list).toHaveBeenNthCalledWith(2, 'TS', 2);
      expect(useCivicMetricsStore.getState().getBillsByState('TS').map((bill) => bill.id)).toEqual([
        'page-one-ts',
        'page-two-ts',
      ]);
      expect(useCivicMetricsStore.getState().billPage).toBe(2);
      expect(useCivicMetricsStore.getState().billLoadStatus).toBe('loaded');
    } finally {
      list.mockRestore();
      useCivicMetricsStore.setState({
        bills: previous.bills,
        billLoadStatus: previous.billLoadStatus,
        billLoadStateCode: previous.billLoadStateCode,
        billTotal: previous.billTotal,
        billPage: previous.billPage,
      });
    }
  });
});
