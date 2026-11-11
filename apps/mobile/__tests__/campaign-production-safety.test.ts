jest.mock('../lib/environment', () => ({
  IS_PRODUCTION: true,
  IS_STAGING: false,
}));

jest.mock('../lib/constants', () => ({
  API_BASE_URL: 'https://api.example.test',
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

  it('does not create live campaign records in local memory', () => {
    const state = useCampaignStore.getState();

    state.createCampaign({ name: 'Example campaign' });
    state.createAd({ name: 'Example ad' });
    state.addVolunteer({ name: 'Example volunteer' });

    expect(useCampaignStore.getState().campaigns).toEqual([]);
    expect(useCampaignStore.getState().ads).toEqual([]);
    expect(useCampaignStore.getState().volunteers).toEqual([]);
  });
});
