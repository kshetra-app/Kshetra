jest.mock('../lib/environment', () => ({
  IS_PRODUCTION: true,
  IS_STAGING: false,
  IS_LIVE_ENVIRONMENT: true,
}));

jest.mock('../lib/constants', () => ({
  API_BASE_URL: 'https://api.example.test',
}));

jest.mock('../lib/api', () => ({
  apiClient: {
    request: jest.fn().mockRejectedValue(new Error('Campaign service unavailable in test')),
  },
}));

import { useCampaignStore } from '../stores/campaign';

describe('campaign workspace live-environment safety', () => {
  it('does not expose seeded campaigns, audience figures, balances, or revenue', () => {
    const state = useCampaignStore.getState();

    expect(state.campaigns).toEqual([]);
    expect(state.ads).toEqual([]);
    expect(state.volunteers).toEqual([]);
    expect(state.booths).toEqual([]);
    expect(state.wallet.balanceINR).toBe(0);
    expect(state.walletTransactions).toEqual([]);
    expect(state.obdBroadcasts).toEqual([]);
    expect(state.getRevenueFlow()).toBeNull();
    expect(state.getCampaignAnalytics('missing')).toBeNull();
  });

  it('does not credit a wallet or claim to dispatch outreach without live providers', async () => {
    const state = useCampaignStore.getState();
    const startingBalance = state.wallet.balanceINR;

    const recharge = await state.rechargeWallet(2500);
    const voice = await state.dispatchVoiceOBD('Test', { type: 'ward', voterCount: 1000 });
    const broadcast = await state.dispatchObdBroadcast('Test', 1000);

    expect(recharge.success).toBe(false);
    expect(voice.success).toBe(false);
    expect(broadcast.success).toBe(false);
    expect(useCampaignStore.getState().wallet.balanceINR).toBe(startingBalance);
    expect(useCampaignStore.getState().walletTransactions).toEqual([]);
    expect(useCampaignStore.getState().obdBroadcasts).toEqual([]);
  });

  it('does not create live campaign records in local memory', async () => {
    const state = useCampaignStore.getState();
    useCampaignStore.setState({ selectedCampaignId: 'persisted-campaign' });

    await expect(state.createCampaign({
      name: 'Example campaign',
      stateCode: 'TS',
      startDate: '2026-11-12',
      endDate: '2026-12-12',
    })).rejects.toThrow('Campaign service unavailable in test');
    await expect(state.createAd({
      format: 'promoted_post',
      name: 'Example ad',
      headline: 'Example headline',
      paidForBy: 'Example sponsor',
      disclosureText: 'Paid political advertisement',
    })).rejects.toThrow('Campaign service unavailable in test');
    expect(() => state.addVolunteer({ name: 'Example volunteer' })).toThrow(
      'Use the persisted campaign cadre workflow to add a worker.',
    );

    expect(useCampaignStore.getState().campaigns).toEqual([]);
    expect(useCampaignStore.getState().ads).toEqual([]);
    expect(useCampaignStore.getState().volunteers).toEqual([]);
  });
});
