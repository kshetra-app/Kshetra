import { useAuthStore } from '../stores/auth';
import { useContributorVerificationStore } from '../stores/contributorVerification';
import { getContributorKYCStatus } from './supabaseDataService';

/** Hydrate only the signed-in user's non-sensitive review state from the API. */
export async function hydrateContributorKYC(userId: string): Promise<void> {
  const store = useContributorVerificationStore.getState();
  if (store.ownerUserId !== userId) return;

  store.setKYCLoadState(userId, 'loading');
  const result = await getContributorKYCStatus(userId);

  if (
    useAuthStore.getState().user?.id !== userId ||
    useContributorVerificationStore.getState().ownerUserId !== userId
  ) {
    return;
  }

  if (!result.success) {
    useContributorVerificationStore.getState().setKYCLoadState(userId, 'unavailable');
    return;
  }

  if (result.record) {
    useContributorVerificationStore.getState().setKYCRecord(result.record);
  } else {
    useContributorVerificationStore.getState().setKYCLoadState(userId, 'ready');
  }
}
