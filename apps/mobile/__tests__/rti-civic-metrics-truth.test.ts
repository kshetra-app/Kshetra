import { apiClient } from '../lib/api';
import { useCivicMetricsStore } from '../stores/civicMetrics';

const publicRtiRow = {
  id: 'rti-public-1',
  status: 'filed',
  department: 'Public Works',
  authority: 'Public Information Officer',
  subject: 'Road repair expenditure',
  question_text: 'Please provide the sanctioned and spent amount.',
  state_code: 'TS',
  district_name: 'Hyderabad',
  constituency_ac_no: 12,
  filed_date: '2026-11-10',
  acknowledged_date: null,
  response_date: null,
  response_text: null,
  first_appeal_date: null,
  second_appeal_date: null,
  fees: 10,
  is_public: true,
  upvotes: 3,
  views: 25,
  tags: ['roads'],
  created_at: '2026-11-10T10:00:00.000Z',
  user_id: 'must-not-reach-the-client',
};

describe('public RTI Civic Metrics data', () => {
  it('loads only through the public API and discards owner identifiers', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { rtiRequests: [publicRtiRow], total: 1 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'rti-test',
    } as any);

    try {
      const response = await apiClient.civic.listPublicRtiRequests('TS');
      expect(get).toHaveBeenCalledWith('/api/v1/civic/rti', {
        authPolicy: 'public',
        query: { state: 'TS', page: 1, limit: 50 },
      });
      expect(response.items[0]).toMatchObject({
        id: 'rti-public-1',
        stateCode: 'TS',
        filedDate: '2026-11-10',
        userId: '',
      });
      expect(response.total).toBe(1);
      expect(JSON.stringify(response.items)).not.toContain('must-not-reach-the-client');
    } finally {
      get.mockRestore();
    }
  });

  it('rejects draft records if a server response violates the public-list contract', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { rtiRequests: [{ ...publicRtiRow, status: 'draft' }], total: 1 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'rti-draft-test',
    } as any);

    try {
      await expect(apiClient.civic.listPublicRtiRequests('TS')).rejects.toThrow(
        'A public RTI record contains invalid or incomplete fields',
      );
    } finally {
      get.mockRestore();
    }
  });

  it('rejects a non-public record if it appears in the public API response', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { rtiRequests: [{ ...publicRtiRow, is_public: false }], total: 1 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'rti-private-test',
    } as any);

    try {
      await expect(apiClient.civic.listPublicRtiRequests('TS')).rejects.toThrow(
        'A public RTI record contains invalid or incomplete fields',
      );
    } finally {
      get.mockRestore();
    }
  });

  it('filters drafts and other states from the public request selector', () => {
    const previous = useCivicMetricsStore.getState().rtiRequests;
    useCivicMetricsStore.setState({
      rtiRequests: [
        { id: 'public-ts', stateCode: 'TS', status: 'filed', isPublic: true } as any,
        { id: 'draft-ts', stateCode: 'TS', status: 'draft', isPublic: true } as any,
        { id: 'private-ts', stateCode: 'TS', status: 'filed', isPublic: false } as any,
        { id: 'public-ka', stateCode: 'KA', status: 'filed', isPublic: true } as any,
      ],
    });

    try {
      expect(useCivicMetricsStore.getState().getPublicRTIs('TS').map((item) => item.id)).toEqual(['public-ts']);
    } finally {
      useCivicMetricsStore.setState({ rtiRequests: previous });
    }
  });

  it('refreshes the selected state from the API without keeping stale public rows', async () => {
    const previous = useCivicMetricsStore.getState();
    const requests = [
      {
        id: 'live-rti',
        userId: '',
        status: 'filed' as const,
        department: 'Public Works',
        authority: 'PIO',
        subject: 'Road repair expenditure',
        questionText: 'Request details',
        stateCode: 'TS',
        filedDate: '2026-11-10',
        attachmentUrls: [],
        responseAttachmentUrls: [],
        fees: 10,
        isPublic: true,
        upvotes: 3,
        views: 25,
        tags: [],
        createdAt: '2026-11-10T10:00:00.000Z',
      },
    ];
    const list = jest.spyOn(apiClient.civic, 'listPublicRtiRequests').mockResolvedValue({ items: requests, total: 1 });

    try {
      await useCivicMetricsStore.getState().loadPublicRTIs('TS');
      expect(list).toHaveBeenCalledWith('TS');
      expect(useCivicMetricsStore.getState().getPublicRTIs('TS')).toEqual(requests);
      expect(useCivicMetricsStore.getState().rtiLoadStatus).toBe('loaded');
    } finally {
      list.mockRestore();
      useCivicMetricsStore.setState({
        rtiRequests: previous.rtiRequests,
        rtiLoadStatus: previous.rtiLoadStatus,
        rtiLoadStateCode: previous.rtiLoadStateCode,
        rtiTotal: previous.rtiTotal,
        rtiPage: previous.rtiPage,
      });
    }
  });

  it('loads the next RTI page and prevents duplicate records', async () => {
    const previous = useCivicMetricsStore.getState();
    const first = {
      id: 'page-one',
      userId: '',
      status: 'filed' as const,
      department: 'Public Works',
      authority: 'PIO',
      subject: 'First request',
      questionText: 'First request text',
      stateCode: 'TS',
      filedDate: '2026-11-09',
      attachmentUrls: [],
      responseAttachmentUrls: [],
      fees: 10,
      isPublic: true,
      upvotes: 0,
      views: 0,
      tags: [],
      createdAt: '2026-11-09T10:00:00.000Z',
    };
    const second = { ...first, id: 'page-two', subject: 'Second request' };
    useCivicMetricsStore.setState({
      rtiRequests: [first],
      rtiLoadStateCode: 'TS',
      rtiLoadStatus: 'loaded',
      rtiTotal: 51,
      rtiPage: 1,
    });
    const list = jest.spyOn(apiClient.civic, 'listPublicRtiRequests').mockResolvedValue({
      items: [first, second],
      total: 51,
    });

    try {
      await useCivicMetricsStore.getState().loadMorePublicRTIs('TS');
      expect(list).toHaveBeenCalledWith('TS', 2);
      expect(useCivicMetricsStore.getState().getPublicRTIs('TS').map((item) => item.id)).toEqual([
        'page-one',
        'page-two',
      ]);
      expect(useCivicMetricsStore.getState().rtiPage).toBe(2);
    } finally {
      list.mockRestore();
      useCivicMetricsStore.setState({
        rtiRequests: previous.rtiRequests,
        rtiLoadStatus: previous.rtiLoadStatus,
        rtiLoadStateCode: previous.rtiLoadStateCode,
        rtiTotal: previous.rtiTotal,
        rtiPage: previous.rtiPage,
      });
    }
  });
});
