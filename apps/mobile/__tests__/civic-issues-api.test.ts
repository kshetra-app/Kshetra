import { CivicEndpoint } from '../lib/api/endpoints/civic';
import { ApiValidationError } from '../lib/api/errors';

describe('Civic issue list API', () => {
  it('requests the selected state and constituency with bounded pagination', async () => {
    const client = {
      get: jest.fn(async () => ({
        data: {
          issues: [{
            id: 'issue-1',
            state_code: 'TS',
            constituency_id: 'TS-AC-67',
            title: 'Road repair needed',
            category: 'roads',
            status: 'open',
          }],
          total: 61,
          page: 2,
          limit: 25,
        },
      })),
    };
    const endpoint = new CivicEndpoint(client as any);

    const result = await endpoint.listIssues({
      scope: 'constituency',
      stateCode: 'TS',
      constituencyId: 'TS-AC-67',
      page: 2,
      limit: 25,
    });

    expect(client.get).toHaveBeenCalledWith('/api/v1/civic/issues', {
      authPolicy: 'public',
      query: {
        stateCode: 'TS',
        constituencyId: 'TS-AC-67',
        page: 2,
        limit: 25,
      },
    });
    expect(result).toMatchObject({ total: 61, page: 2, limit: 25 });
    expect(result.issues).toHaveLength(1);
  });

  it('rejects a record outside the requested state scope', async () => {
    const endpoint = new CivicEndpoint({
      get: jest.fn(async () => ({
        data: {
          issues: [{
            id: 'issue-1',
            state_code: 'AP',
            constituency_id: 'AP-AC-1',
            title: 'Road repair needed',
            category: 'roads',
            status: 'open',
          }],
          total: 1,
          page: 1,
          limit: 50,
        },
      })),
    } as any);

    await expect(endpoint.listIssues({ scope: 'state', stateCode: 'TS' }))
      .rejects.toBeInstanceOf(ApiValidationError);
  });
});
