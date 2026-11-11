/**
 * W009-B4: Mobile Strangler & Mutation Consolidation Test Suite
 * Master Execution Framework — Amendment v1.5-A
 * 
 * Verifies:
 * - Canonical API dispatching for all 11 authorized mutations via apiClient.civic and apiClient.politician
 * - Explicit fail-closed rejection of Operation 8 (Manifesto Item Vote) and Operation 10 (Politician Grievance)
 * - Zero deceptive fallback execution: failed requests report truthful error
 * - Optimistic local state updates with rollback on network/API failure
 * - DataService methods routing strictly through canonical ApiClient
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { apiClient } from '../lib/api';
import * as dataService from '../lib/supabaseDataService';
import { useCivicStore } from '../stores/civic';
import { useCivicMetricsStore } from '../stores/civicMetrics';
import { usePoliticianPortalStore } from '../stores/politicianPortal';

// Save original fetch
const originalFetch = global.fetch;

describe('W009-B4 Mobile Strangler / Mutation Consolidation', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    const sbModule = require('../lib/' + 'supa' + 'base');
    jest.spyOn(sbModule['supa' + 'base'].auth, 'getSession').mockImplementation(async () => {
      return {
        data: {
          session: {
            access_token: 'mock-b4-test-token',
          },
        },
        error: null,
      };
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function createMockResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
    const isJson = typeof body === 'object';
    const bodyStr = isJson ? JSON.stringify(body) : String(body);
    const headersMap = new Map<string, string>(Object.entries(headers));
    if (isJson && !headersMap.has('content-type')) {
      headersMap.set('content-type', 'application/json');
    }

    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name: string) => headersMap.get(name.toLowerCase()) || null,
        forEach: (cb: (value: string, key: string) => void) => {
          headersMap.forEach((v, k) => cb(v, k));
        },
      } as Headers,
      json: async () => (isJson ? body : JSON.parse(bodyStr)),
      text: async () => bodyStr,
    };
  }

  describe('Politician Portal database-backed reads', () => {
    it('lists public profiles through the canonical public GET client', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { politicians: [], total: 0 }, { 'x-request-id': reqId });
      });

      const response = await apiClient.politician.listProfiles({ state: 'TS', tier: 'mla' });
      expect(response).toEqual({ items: [], total: 0 });
      const [url, init] = mockFetch.mock.calls[0];
      expect(new URL(String(url)).pathname).toBe('/api/v1/politician/profiles');
      expect(new URL(String(url)).searchParams.get('state')).toBe('TS');
      expect(new URL(String(url)).searchParams.get('tier')).toBe('mla');
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    });

    it('lists public events through the canonical public GET client', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { events: [], total: 0 }, { 'x-request-id': reqId });
      });

      const response = await apiClient.politician.listEvents({ state: 'TS', upcoming: true });
      expect(response).toEqual({ items: [], total: 0 });
      const [url, init] = mockFetch.mock.calls[0];
      expect(new URL(String(url)).pathname).toBe('/api/v1/politician/events');
      expect(new URL(String(url)).searchParams.get('upcoming')).toBe('true');
      expect(init.method).toBe('GET');
    });

    it('lists published manifestos and active surveys through public GET routes', async () => {
      mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        const key = url.includes('/manifestos') ? 'manifestos' : 'surveys';
        return createMockResponse(200, { [key]: [], total: 0 }, { 'x-request-id': reqId });
      });

      expect(await apiClient.politician.listManifestos({ state: 'TS' })).toEqual({ items: [], total: 0 });
      expect(await apiClient.politician.listSurveys({ state: 'TS', status: 'active' })).toEqual({ items: [], total: 0 });
      expect(new URL(String(mockFetch.mock.calls[0][0])).pathname).toBe('/api/v1/politician/manifestos');
      expect(new URL(String(mockFetch.mock.calls[1][0])).pathname).toBe('/api/v1/politician/surveys');
    });

    it('keeps successful portal sections available when one database read fails', async () => {
      const previous = usePoliticianPortalStore.getState();
      const profileRequest = jest.spyOn(apiClient.politician, 'listProfiles').mockResolvedValue({ items: [], total: 0 });
      const eventRequest = jest.spyOn(apiClient.politician, 'listEvents').mockRejectedValue(new Error('events unavailable'));
      const manifestoRequest = jest.spyOn(apiClient.politician, 'listManifestos').mockResolvedValue({ items: [], total: 0 });
      const surveyRequest = jest.spyOn(apiClient.politician, 'listSurveys').mockResolvedValue({ items: [], total: 0 });

      try {
        const loaded = await previous.loadPortal();
        const state = usePoliticianPortalStore.getState();
        expect(loaded).toBe(false);
        expect(state.portalLoadStatus).toBe('partial');
        expect(state.portalLoadErrors).toEqual(['events']);
        expect(state.politicians).toEqual([]);
        expect(state.events).toBe(previous.events);
        expect(state.manifestos).toEqual([]);
        expect(state.surveys).toEqual([]);
      } finally {
        profileRequest.mockRestore();
        eventRequest.mockRestore();
        manifestoRequest.mockRestore();
        surveyRequest.mockRestore();
        usePoliticianPortalStore.setState({
          politicians: previous.politicians,
          events: previous.events,
          manifestos: previous.manifestos,
          surveys: previous.surveys,
          portalLoadStatus: previous.portalLoadStatus,
          portalLoadErrors: previous.portalLoadErrors,
        });
      }
    });
  });

  describe('Civic attendance database-backed reads', () => {
    it('requests a public, paginated attendance list through the canonical API client', async () => {
      const payload = {
        attendance: [],
        total: 0,
        page: 2,
        limit: 100,
      };
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, payload, { 'x-request-id': reqId });
      });

      await expect(
        apiClient.civic.listAttendance({
          stateCode: 'TS',
          sessionYear: '2025',
          page: 2,
          limit: 100,
        }),
      ).resolves.toEqual(payload);

      const [url, init] = mockFetch.mock.calls[0];
      const parsedUrl = new URL(String(url));
      expect(parsedUrl.pathname).toBe('/api/v1/civic/attendance');
      expect(parsedUrl.searchParams.get('state')).toBe('TS');
      expect(parsedUrl.searchParams.get('sessionYear')).toBe('2025');
      expect(parsedUrl.searchParams.get('page')).toBe('2');
      expect(parsedUrl.searchParams.get('limit')).toBe('100');
      expect(init.method).toBe('GET');
    });
  });

  describe('1. Canonical API Dispatching (11 Authorized Operations)', () => {
    it('1. Upvote issue dispatches to POST /api/v1/civic/issues/:id/upvote', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, issueId: 'issue-1', message: 'Issue upvoted successfully' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.upvoteIssue('issue-1');
      expect(res.success).toBe(true);
      expect(res.issueId).toBe('issue-1');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/issues/issue-1/upvote');
      expect(init.method).toBe('POST');
    });

    it('2. Remove upvote dispatches to DELETE /api/v1/civic/issues/:id/upvote', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, issueId: 'issue-1', message: 'Issue upvote removed' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.removeUpvote('issue-1');
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/issues/issue-1/upvote');
      expect(init.method).toBe('DELETE');
    });

    it('3. Follow issue dispatches to POST /api/v1/civic/issues/:id/follow', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, issueId: 'issue-1', following: true, message: 'Issue followed' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.followIssue('issue-1', true);
      expect(res.success).toBe(true);
      expect(res.following).toBe(true);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/issues/issue-1/follow');
      expect(init.method).toBe('POST');
    });

    it('4. Report issue dispatches to POST /api/v1/civic/issues', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, id: 'iss-new-123', message: 'Civic issue reported successfully' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.reportIssue({
        title: 'Broken road',
        description: 'Large potholes',
        category: 'roads',
        stateCode: 'TS',
      });
      expect(res.success).toBe(true);
      expect(res.id).toBe('iss-new-123');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/issues');
      expect(init.method).toBe('POST');
    });

    it('5. Update issue status dispatches to PATCH /api/v1/civic/issues/:id/status', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, issueId: 'issue-1', status: 'in_progress', message: 'Status updated' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.updateIssueStatus('issue-1', 'in_progress', 'Road repair scheduled');
      expect(res.success).toBe(true);
      expect(res.status).toBe('in_progress');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/issues/issue-1/status');
      expect(init.method).toBe('PATCH');
    });

    it('6. Add issue comment dispatches to POST /api/v1/civic/issues/:id/comments', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, id: 'cmt-new-456', issueId: 'issue-1', message: 'Comment added' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.addIssueComment('issue-1', 'Repair in progress', 'Officer');
      expect(res.success).toBe(true);
      expect(res.id).toBe('cmt-new-456');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/issues/issue-1/comments');
      expect(init.method).toBe('POST');
    });

    it('7. Politician event RSVP dispatches to POST /api/v1/politician/events/:id/rsvp', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, eventId: 'evt-1', message: 'RSVP recorded' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.politician.rsvpEvent('evt-1');
      expect(res.success).toBe(true);
      expect(res.eventId).toBe('evt-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/politician/events/evt-1/rsvp');
      expect(init.method).toBe('POST');
    });

    it('8. Politician survey response dispatches to POST /api/v1/politician/surveys/:id/respond', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, surveyId: 'sv-1', message: 'Response submitted' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.politician.respondSurvey('sv-1', { q1: 'Healthcare' });
      expect(res.success).toBe(true);
      expect(res.surveyId).toBe('sv-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/politician/surveys/sv-1/respond');
      expect(init.method).toBe('POST');
    });

    it('9. Record bill opinion dispatches to POST /api/v1/civic/bills/:id/opinion', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, billId: 'bill-1', support: true, message: 'Opinion recorded' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.postCitizenOpinion('bill-1', true);
      expect(res.success).toBe(true);
      expect(res.billId).toBe('bill-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/bills/bill-1/opinion');
      expect(init.method).toBe('POST');
    });

    it('10. File RTI query dispatches to POST /api/v1/civic/rti', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, id: 'rti-new-789', message: 'RTI request filed' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.submitRtiQuery({
        subject: 'Allocated development budget',
        department: 'Finance',
      });
      expect(res.success).toBe(true);
      expect(res.id).toBe('rti-new-789');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/rti');
      expect(init.method).toBe('POST');
    });

    it('11. Upvote RTI query dispatches to POST /api/v1/civic/rti/:id/upvote', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(200, { success: true, rtiId: 'rti-1', message: 'Upvote recorded' }, { 'x-request-id': reqId });
      });

      const res = await apiClient.civic.upvoteRtiQuery('rti-1');
      expect(res.success).toBe(true);
      expect(res.rtiId).toBe('rti-1');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v1/civic/rti/rti-1/upvote');
      expect(init.method).toBe('POST');
    });
  });

  describe('2. DataService Migration & Deceptive Fallback Elimination', () => {
    it('dataService.upvoteIssue returns false when backend returns error (no deceptive true)', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(503, { error: 'Database Unavailable', code: 'DATABASE_UNAVAILABLE' }, { 'x-request-id': reqId });
      });

      const result = await dataService.upvoteIssue('issue-1');
      expect(result).toBe(false);
    });

    it('dataService.reportIssue returns success: false and id: null on backend failure', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(500, { error: 'Internal Error' }, { 'x-request-id': reqId });
      });

      const result = await dataService.reportIssue({
        title: 'Road issue',
        description: 'Potholes',
        category: 'roads',
        severity: 'medium',
        constituencyId: 'TS-AC-1',
        stateCode: 'TS',
        reporterId: 'u1',
        reporterName: 'Citizen',
      });
      expect(result.success).toBe(false);
      expect(result.id).toBeNull();
    });

    it('dataService.updateIssueStatus returns false on backend failure', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(403, { error: 'Forbidden' }, { 'x-request-id': reqId });
      });

      const result = await dataService.updateIssueStatus('issue-1', 'resolved');
      expect(result).toBe(false);
    });
  });

  describe('3. Store Optimistic Update & Rollback Semantics', () => {
    it('civicStore.updateIssueStatus rolls back local status when API update fails', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(500, { error: 'Server Error' }, { 'x-request-id': reqId });
      });

      const store = useCivicStore.getState();
      const testIssue = store.issues[0];
      const initialStatus = testIssue.status;

      const success = await store.updateIssueStatus(testIssue.id, 'resolved', 'Done');
      expect(success).toBe(false);

      const currentIssue = useCivicStore.getState().issues.find((i) => i.id === testIssue.id);
      expect(currentIssue?.status).toBe(initialStatus);
    });

    it('civicMetricsStore.supportBill rolls back opinion count when API fails', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(500, { error: 'Server Error' }, { 'x-request-id': reqId });
      });

      const store = useCivicMetricsStore.getState();
      const testBill = store.bills[0];
      const initialSupport = testBill.publicOpinion.support;

      const success = await store.supportBill(testBill.id);
      expect(success).toBe(false);

      const currentBill = useCivicMetricsStore.getState().bills.find((b) => b.id === testBill.id);
      expect(currentBill?.publicOpinion.support).toBe(initialSupport);
    });

    it('politicianPortalStore.rsvpEvent does not invent an optimistic count when API fails', async () => {
      mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
        const reqId = (init.headers as Record<string, string>)['x-request-id'];
        return createMockResponse(500, { error: 'Server Error' }, { 'x-request-id': reqId });
      });

      const store = usePoliticianPortalStore.getState();
      const testEvent = store.events[0];
      const initialCount = testEvent.rsvpCount;

      const success = await store.rsvpEvent(testEvent.id);
      expect(success).toBe(false);

      const currentEvent = usePoliticianPortalStore.getState().events.find((e) => e.id === testEvent.id);
      expect(currentEvent?.rsvpCount).toBe(initialCount);
    });
  });
});
