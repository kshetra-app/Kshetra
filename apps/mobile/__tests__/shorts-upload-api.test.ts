import type { ApiClient } from '../lib/api/client';
import { ShortsEndpoint } from '../lib/api/endpoints/shorts';

const SHORT_ID = '5bfe8c93-4df2-4cf1-9ed4-1cf58f64c095';

describe('Shorts upload API contract', () => {
  it('uses authenticated upload and forwards an existing UUID only for a queued retry', async () => {
    const response = {
      success: true,
      id: SHORT_ID,
      short: {
        id: SHORT_ID,
        channel_name: 'Public Creator',
        uploaded_by: '7bd6b9b1-aed6-43e8-aac4-a7bf6d2662cb',
      },
    };
    const client = {
      post: jest.fn().mockResolvedValue({ data: response }),
    } as unknown as ApiClient;
    const endpoint = new ShortsEndpoint(client);
    const payload = {
      id: SHORT_ID,
      title: 'A civic update',
      videoUrl: 'https://www.youtube.com/embed/abcdefghijk',
      stateCode: 'TS',
      durationSeconds: 45,
      hashtags: ['CivicUpdate'],
    };

    await expect(endpoint.uploadShort(payload)).resolves.toEqual(response);
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/shorts',
      payload,
      { authPolicy: 'authenticated' },
    );
  });

  it('trims titles and rejects title lengths outside the database limit before posting', async () => {
    const client = {
      post: jest.fn().mockResolvedValue({ data: { success: true, id: SHORT_ID } }),
    } as unknown as ApiClient;
    const endpoint = new ShortsEndpoint(client);

    await endpoint.uploadShort({
      title: '  A civic update  ',
      videoUrl: 'https://www.youtube.com/embed/abcdefghijk',
      stateCode: 'TS',
    });
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/shorts',
      {
        title: 'A civic update',
        videoUrl: 'https://www.youtube.com/embed/abcdefghijk',
        stateCode: 'TS',
      },
      { authPolicy: 'authenticated' },
    );

    await expect(endpoint.uploadShort({
      title: 'x'.repeat(201),
      videoUrl: 'https://www.youtube.com/embed/abcdefghijk',
      stateCode: 'TS',
    })).rejects.toThrow('Invalid upload short');
    expect(client.post).toHaveBeenCalledTimes(1);
  });
});
