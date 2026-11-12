import type { ApiClient } from '../lib/api/client';
import { ShortsEndpoint } from '../lib/api/endpoints/shorts';

const SHORT_ID = '5bfe8c93-4df2-4cf1-9ed4-1cf58f64c095';

describe('Shorts comments API contract', () => {
  it('loads comments through the explicitly public read path', async () => {
    const response = {
      success: true,
      shortId: SHORT_ID,
      comments: [],
      total: 0,
    };
    const client = {
      get: jest.fn().mockResolvedValue({ data: response }),
      post: jest.fn(),
    } as unknown as ApiClient;
    const endpoint = new ShortsEndpoint(client);

    await expect(endpoint.listComments(SHORT_ID, { offset: 50, limit: 25 })).resolves.toEqual(response);
    expect(client.get).toHaveBeenCalledWith(
      `/api/v1/shorts/${SHORT_ID}/comments?offset=50&limit=25`,
      { authPolicy: 'public' },
    );
  });

  it('submits trimmed comments through the authenticated write path', async () => {
    const response = {
      success: true,
      id: 'a729dc90-5b88-4f09-8c53-0cf18db1eeb8',
      shortId: SHORT_ID,
      comment: {
        id: 'a729dc90-5b88-4f09-8c53-0cf18db1eeb8',
        authorName: 'Verified Citizen',
        text: 'A clear comment',
        createdAt: '2026-11-12T10:00:00.000Z',
      },
    };
    const client = {
      get: jest.fn(),
      post: jest.fn().mockResolvedValue({ data: response }),
    } as unknown as ApiClient;
    const endpoint = new ShortsEndpoint(client);

    await expect(endpoint.addComment(SHORT_ID, '  A clear comment  ')).resolves.toEqual(response);
    expect(client.post).toHaveBeenCalledWith(
      `/api/v1/shorts/${SHORT_ID}/comments`,
      { content: 'A clear comment' },
      { authPolicy: 'authenticated' },
    );
  });

  it('rejects empty or over-limit comments before a network request', async () => {
    const client = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as ApiClient;
    const endpoint = new ShortsEndpoint(client);

    await expect(endpoint.addComment(SHORT_ID, '  ')).rejects.toThrow('Invalid comment');
    await expect(endpoint.addComment(SHORT_ID, 'x'.repeat(501))).rejects.toThrow('Invalid comment');
    expect(client.post).not.toHaveBeenCalled();
  });
});
