import {
  buildNotificationMessage,
  sendExpoPush,
  TRIGGER_CONFIG,
  type NotificationTrigger,
} from '../services/notifications';
import {
  getAllStatesInfo,
  getStateInfo,
  isStateSupported,
  getConstituencies,
  getConstituency,
  searchConstituencies,
} from '../services/stateData';
import { chatWithAI, smartSearch } from '../services/ai';

describe('notifications service', () => {
  it('builds a message for every trigger type', () => {
    const triggers = Object.keys(TRIGGER_CONFIG) as NotificationTrigger[];
    for (const trigger of triggers) {
      const msg = buildNotificationMessage(trigger, {});
      expect(typeof msg.title).toBe('string');
      expect(msg.title.length).toBeGreaterThan(0);
      expect(typeof msg.body).toBe('string');
    }
  });

  it('uses context values when provided', () => {
    const msg = buildNotificationMessage('post_reply', { authorName: 'Asha', preview: 'Nice point' });
    expect(msg.title).toContain('Asha');
    expect(msg.body).toBe('Nice point');
  });

  it('falls back for an unknown trigger', () => {
    const msg = buildNotificationMessage('not_a_trigger' as NotificationTrigger, {});
    expect(msg.title).toBe('Kshetra');
  });

  it('returns zero counts for an empty token list', async () => {
    await expect(sendExpoPush([], { title: 't', body: 'b' })).resolves.toEqual({
      successCount: 0,
      failCount: 0,
    });
  });

  it('counts successes from the Expo API', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [{ status: 'ok' }, { status: 'error' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    const result = await sendExpoPush(['ExponentPushToken[a]', 'ExponentPushToken[b]'], {
      title: 't',
      body: 'b',
    });
    expect(result.successCount).toBe(1);
    expect(result.failCount).toBe(1);
    fetchMock.mockRestore();
  });

  it('treats network failures as failed sends', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const result = await sendExpoPush(['ExponentPushToken[a]'], { title: 't', body: 'b' });
    expect(result.failCount).toBe(1);
    fetchMock.mockRestore();
  });
});

describe('stateData service', () => {
  it('lists all states and looks up by code', () => {
    expect(getAllStatesInfo().length).toBeGreaterThan(0);
    expect(getStateInfo('ts')?.code).toBe('TS');
    expect(getStateInfo('ZZ')).toBeNull();
  });

  it('reports support status by data tier', () => {
    expect(isStateSupported('TS')).toBe(true);
    expect(isStateSupported('MH')).toBe(false); // planned, no data
    expect(isStateSupported('ZZ')).toBe(false);
  });

  it('adapts constituencies for supported states', () => {
    const ts = getConstituencies('TS');
    expect(ts.length).toBe(119);
    expect(ts[0].stateCode).toBe('TS');
    expect(getConstituencies('AP').length).toBeGreaterThan(0);
    expect(getConstituencies('KA').length).toBeGreaterThan(0);
    expect(getConstituencies('ZZ')).toEqual([]);
  });

  it('finds a single constituency and searches', () => {
    const one = getConstituency('TS', 1);
    expect(one?.acNo).toBe(1);
    expect(getConstituency('TS', 99999)).toBeNull();
    expect(searchConstituencies('TS', one!.name).length).toBeGreaterThan(0);
  });
});

describe('ai service — graceful degradation without API key', () => {
  const original = process.env.OPENAI_API_KEY;
  beforeAll(() => {
    delete process.env.OPENAI_API_KEY;
  });
  afterAll(() => {
    if (original) process.env.OPENAI_API_KEY = original;
  });

  it('chatWithAI explains the missing key', async () => {
    const res = await chatWithAI({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res).toContain('API key');
  });

  it('smartSearch returns an empty list without a key', async () => {
    await expect(smartSearch('safest BRS seat')).resolves.toEqual([]);
  });
});
