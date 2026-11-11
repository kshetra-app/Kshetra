const mockListAttendance = jest.fn();

jest.mock('../lib/environment', () => ({ IS_LIVE_ENVIRONMENT: true }));
jest.mock('../lib/api', () => ({
  apiClient: {
    civic: {
      listAttendance: (...args: unknown[]) => mockListAttendance(...args),
    },
  },
}));

import type { LegislatorAttendance } from '../lib/civicMetricsTypes';
import { useCivicMetricsStore } from '../stores/civicMetrics';

const attendanceRow = (index: number): LegislatorAttendance => ({
  legislatorId: `attendance-${index}`,
  legislatorName: `Representative ${index}`,
  party: 'ABC',
  stateCode: 'TS',
  constituencyAcNo: index,
  sessionYear: '2025',
  type: 'assembly_session',
  totalSessions: 10,
  attended: 8,
  attendancePercent: 80,
  questionsAsked: null,
  debatesParticipated: 2,
  privateMemberBills: null,
  ranking: null,
  totalLegislators: null,
});

describe('live civic attendance loading', () => {
  beforeEach(() => {
    mockListAttendance.mockReset();
    useCivicMetricsStore.setState({
      attendance: [],
      attendanceLoading: false,
      attendanceError: false,
    });
  });

  it('loads all API pages and replaces the state snapshot with persisted records', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => attendanceRow(index + 1));
    const secondPage = [attendanceRow(101)];
    mockListAttendance
      .mockResolvedValueOnce({ attendance: firstPage, total: 101, page: 1, limit: 100 })
      .mockResolvedValueOnce({ attendance: secondPage, total: 101, page: 2, limit: 100 });

    await useCivicMetricsStore.getState().loadAttendance('ts');

    expect(mockListAttendance).toHaveBeenNthCalledWith(1, {
      stateCode: 'TS',
      page: 1,
      limit: 100,
    });
    expect(mockListAttendance).toHaveBeenNthCalledWith(2, {
      stateCode: 'TS',
      page: 2,
      limit: 100,
    });
    expect(useCivicMetricsStore.getState().attendance).toHaveLength(101);
    expect(useCivicMetricsStore.getState().attendanceLoading).toBe(false);
    expect(useCivicMetricsStore.getState().attendanceError).toBe(false);
  });

  it('preserves last known records and reports a fetch failure instead of inventing values', async () => {
    const existing = attendanceRow(1);
    useCivicMetricsStore.setState({ attendance: [existing] });
    mockListAttendance.mockRejectedValue(new Error('API unavailable'));

    await useCivicMetricsStore.getState().loadAttendance('TS');

    expect(useCivicMetricsStore.getState().attendance).toEqual([existing]);
    expect(useCivicMetricsStore.getState().attendanceError).toBe(true);
    expect(useCivicMetricsStore.getState().attendanceLoading).toBe(false);
  });
});
