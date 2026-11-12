import { apiClient } from '../lib/api';
import { useCivicMetricsStore } from '../stores/civicMetrics';
import type { PublicHearing } from '../lib/civicMetricsTypes';

const hearingRow = {
  id: 'hearing-1',
  type: 'environment_clearance',
  title: 'Public water review',
  description: 'A persisted public hearing record.',
  organizer: 'State Pollution Board',
  state_code: 'TS',
  district_name: 'Hyderabad',
  constituency_ac_no: 66,
  venue: 'Public Hall',
  date: '2099-06-15',
  time: '10:00 AM',
  is_open: true,
  registration_url: 'https://example.org/register',
  agenda_items: ['Project review'],
  attendee_count: 999,
  minutes_url: null,
  outcome: null,
  related_project_id: null,
  created_at: '2026-10-01T09:00:00.000Z',
};

describe('production civic public hearing data', () => {
  it('requests state-filtered persisted hearings and maps fields without exposing attendance counts', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { hearings: [hearingRow], total: 1 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'hearing-test',
    } as any);

    try {
      const response = await apiClient.civic.listPublicHearings('TS', 2, 25);
      expect(get).toHaveBeenCalledWith('/api/v1/civic/hearings', {
        authPolicy: 'public',
        query: { state: 'TS', upcoming: 'true', page: 2, limit: 25 },
      });
      expect(response.total).toBe(1);
      expect(response.items[0]).toMatchObject({
        id: 'hearing-1',
        type: 'environment_clearance',
        stateCode: 'TS',
        constituencyAcNo: 66,
        isOpen: true,
        date: '2099-06-15',
      });
      expect(response.items[0]).not.toHaveProperty('attendeeCount');
    } finally {
      get.mockRestore();
    }
  });

  it('rejects invalid inputs and records from a different state', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: { hearings: [{ ...hearingRow, state_code: 'KA' }], total: 1 },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'hearing-state-mismatch',
    } as any);

    try {
      await expect(apiClient.civic.listPublicHearings('Telangana')).rejects.toThrow('Invalid stateCode');
      await expect(apiClient.civic.listPublicHearings('TS', 0)).rejects.toThrow('Invalid page');
      await expect(apiClient.civic.listPublicHearings('TS', 1, 101)).rejects.toThrow('Invalid limit');
      expect(get).not.toHaveBeenCalled();

      await expect(apiClient.civic.listPublicHearings('TS')).rejects.toThrow(
        'A public hearing record contains invalid fields or does not match the requested state',
      );
    } finally {
      get.mockRestore();
    }
  });

  it('preserves missing registration and ingestion metadata as unknown', async () => {
    const get = jest.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        hearings: [{ ...hearingRow, is_open: null, created_at: null }],
        total: 1,
      },
      statusCode: 200,
      headers: new Headers(),
      requestId: 'hearing-null-metadata',
    } as any);

    try {
      const response = await apiClient.civic.listPublicHearings('TS');
      expect(response.items[0].isOpen).toBeNull();
      expect(response.items[0].createdAt).toBeNull();
    } finally {
      get.mockRestore();
    }
  });

  it('loads the selected state and merges later pages without duplicate records', async () => {
    const previous = useCivicMetricsStore.getState();
    const first: PublicHearing = {
      id: 'hearing-page-1',
      type: 'environment_clearance',
      title: 'Public water review',
      description: '',
      organizer: 'State Pollution Board',
      stateCode: 'TS',
      districtName: 'Hyderabad',
      venue: 'Public Hall',
      date: '2099-06-15',
      time: '10:00 AM',
      isOpen: true,
      agendaItems: [],
      createdAt: '2026-10-01T09:00:00.000Z',
    };
    const second = { ...first, id: 'hearing-page-2' };
    useCivicMetricsStore.setState({
      hearings: [],
      hearingLoadStatus: 'idle',
      hearingLoadStateCode: null,
      hearingTotal: 0,
      hearingPage: 0,
    });
    const list = jest.spyOn(apiClient.civic, 'listPublicHearings')
      .mockResolvedValueOnce({ items: [first], total: 2 })
      .mockResolvedValueOnce({ items: [first, second], total: 2 });

    try {
      await useCivicMetricsStore.getState().loadHearingsByState('TS');
      expect(useCivicMetricsStore.getState().getUpcomingHearings('TS')).toEqual([first]);
      await useCivicMetricsStore.getState().loadMoreHearingsByState('TS');
      expect(list).toHaveBeenNthCalledWith(2, 'TS', 2);
      expect(useCivicMetricsStore.getState().getUpcomingHearings('TS').map((item) => item.id)).toEqual([
        'hearing-page-1',
        'hearing-page-2',
      ]);
      expect(useCivicMetricsStore.getState().hearingPage).toBe(2);
    } finally {
      list.mockRestore();
      useCivicMetricsStore.setState({
        hearings: previous.hearings,
        hearingLoadStatus: previous.hearingLoadStatus,
        hearingLoadStateCode: previous.hearingLoadStateCode,
        hearingTotal: previous.hearingTotal,
        hearingPage: previous.hearingPage,
      });
    }
  });
});
