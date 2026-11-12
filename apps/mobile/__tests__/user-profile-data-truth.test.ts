jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
  isSupabaseConfigured: true,
}));
jest.mock('../lib/errorReporting', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

import { supabase } from '../lib/supabase';
import { fetchPostsByAuthor, fetchUserProfile } from '../lib/supabaseDataService';

const mockFrom = supabase.from as jest.Mock;

describe('public user profile data truth', () => {
  afterEach(() => jest.resetAllMocks());

  it('distinguishes a profile that exists from a confirmed missing profile', async () => {
    const profile = { user_id: 'user-1', display_name: 'A Citizen', role: 'citizen' };
    const maybeSingle = jest.fn().mockResolvedValue({ data: profile, error: null });
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    });

    await expect(fetchUserProfile('user-1')).resolves.toEqual({ status: 'found', profile });

    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(fetchUserProfile('user-1')).resolves.toEqual({ status: 'not_found' });
  });

  it('reports profile query failures as unavailable rather than not found', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database unavailable' } });
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    });

    await expect(fetchUserProfile('user-1')).resolves.toEqual({ status: 'unavailable' });
  });

  it('distinguishes a confirmed empty post list from an unavailable post query', async () => {
    const query: any = {
      eq: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue({ select: () => query });

    await expect(fetchPostsByAuthor('user-1')).resolves.toEqual({ status: 'loaded', posts: [] });

    query.limit.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(fetchPostsByAuthor('user-1')).resolves.toEqual({ status: 'unavailable' });
  });
});
