import Fastify from 'fastify';
import { localBodyRoutes } from '../routes/localBodies';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

const rpc = jest.mocked(supabase.rpc);
const app = Fastify();

beforeAll(async () => {
  await app.register(localBodyRoutes);
  await app.ready();
});

beforeEach(() => rpc.mockReset());
afterAll(async () => app.close());

it('rejects unsupported directory selections without querying Supabase', async () => {
  const response = await app.inject('/api/v1/local-bodies?view=districts&state=IN');
  expect(response.statusCode).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});

it('groups the official panchayat returns without changing their election year or tenure', async () => {
  const winner = {
    district: 'Adilabad',
    gramPanchayat: 'Example Panchayat',
    electionYear: 2025,
    isCurrent: false,
  };
  rpc.mockResolvedValue({
    data: [
      { ...winner, gpKey: 'seat', officeType: 'sarpanch', id: 'gp' },
      { ...winner, gpKey: 'seat', officeType: 'gp_ward_member', id: 'ward' },
    ],
    error: null,
  } as never);
  const response = await app.inject(
    '/api/v1/local-bodies?view=panchayats&state=TS&district=adilabad&mandal=mandal',
  );
  expect(response.statusCode).toBe(200);
  expect(response.json().data).toEqual([
    {
      key: 'seat',
      district: 'Adilabad',
      mandal: null,
      gramPanchayat: 'Example Panchayat',
      sarpanch: { ...winner, officeType: 'sarpanch', id: 'gp' },
      wards: [{ ...winner, officeType: 'gp_ward_member', id: 'ward' }],
    },
  ]);
});

it('returns a service error when the directory database cannot answer', async () => {
  rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } } as never);
  const response = await app.inject('/api/v1/local-bodies?view=coverage&state=AP');
  expect(response.statusCode).toBe(503);
});
