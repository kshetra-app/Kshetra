jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useAuthStore } from '../stores/auth';
import { useContributorVerificationStore } from '../stores/contributorVerification';
import * as dataService from '../lib/supabaseDataService';
import { hydrateContributorKYC } from '../lib/contributorKycService';
import type { ContributorKYCStatusRecord } from '../lib/contentAccountabilityTypes';

const recordFor = (userId: string): ContributorKYCStatusRecord => ({
  id: `record-${userId}`,
  userId,
  status: 'verified',
  verifiedAt: '2026-11-01T00:00:00.000Z',
  rejectionReason: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
});

describe('Contributor verification account isolation', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    useContributorVerificationStore.getState().setOwnerUserId(null);
    jest.restoreAllMocks();
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
    useContributorVerificationStore.getState().setOwnerUserId(null);
    jest.restoreAllMocks();
  });

  it('clears the prior account status and ignores stale responses after an account switch', () => {
    const store = useContributorVerificationStore.getState();
    store.setOwnerUserId('account-a');
    store.setKYCRecord(recordFor('account-a'));

    store.setOwnerUserId('account-b');
    store.setKYCRecord(recordFor('account-a'));

    expect(useContributorVerificationStore.getState().kycRecord).toBeNull();
    expect(useContributorVerificationStore.getState().ownerUserId).toBe('account-b');
    expect(useContributorVerificationStore.getState().requestAction('create_post')).toEqual({
      allowed: false,
      reason: 'verification_loading',
    });
  });

  it('hydrates only the active account status from the server service', async () => {
    const record = recordFor('account-a');
    useAuthStore.setState({ user: { id: 'account-a' } as any });
    useContributorVerificationStore.getState().setOwnerUserId('account-a');
    jest.spyOn(dataService, 'getContributorKYCStatus').mockResolvedValue({ success: true, record });

    await hydrateContributorKYC('account-a');

    expect(useContributorVerificationStore.getState().kycRecord).toEqual(record);
    expect(useContributorVerificationStore.getState().kycLoadState).toBe('ready');
    expect(useContributorVerificationStore.getState().requestAction('create_post')).toEqual({
      allowed: true,
      reason: 'verified',
    });
  });

  it('does not apply a delayed response after the signed-in account changes', async () => {
    let resolveStatus!: (value: { success: boolean; record: ContributorKYCStatusRecord | null }) => void;
    jest.spyOn(dataService, 'getContributorKYCStatus').mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    useAuthStore.setState({ user: { id: 'account-a' } as any });
    useContributorVerificationStore.getState().setOwnerUserId('account-a');
    const hydration = hydrateContributorKYC('account-a');

    useAuthStore.setState({ user: { id: 'account-b' } as any });
    useContributorVerificationStore.getState().setOwnerUserId('account-b');
    resolveStatus({ success: true, record: recordFor('account-a') });
    await hydration;

    expect(useContributorVerificationStore.getState().ownerUserId).toBe('account-b');
    expect(useContributorVerificationStore.getState().kycRecord).toBeNull();
  });

  it('does not open a submission form while status is unavailable', () => {
    const store = useContributorVerificationStore.getState();
    store.setOwnerUserId('account-a');
    store.setKYCLoadState('account-a', 'unavailable');

    expect(store.requestAction('create_post')).toEqual({
      allowed: false,
      reason: 'verification_unavailable',
    });
    expect(useContributorVerificationStore.getState().showKYCSheet).toBe(false);
  });
});
