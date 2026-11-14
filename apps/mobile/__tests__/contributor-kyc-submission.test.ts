jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    size: 1024,
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  })),
}));

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    storage: {
      from: jest.fn(() => ({ upload: jest.fn().mockResolvedValue({ error: null }) })),
    },
  },
}));

import { Alert } from 'react-native';
import { useAuthStore } from '../stores/auth';
import { useContributorVerificationStore } from '../stores/contributorVerification';
import * as dataService from '../lib/supabaseDataService';
import { submitKYC } from '../lib/contentAccountability';
import type { ContributorKYCStatusRecord } from '../lib/contentAccountabilityTypes';

const pendingRecord: ContributorKYCStatusRecord = {
  id: 'server-kyc-row',
  userId: 'account-a',
  status: 'pending',
  verifiedAt: null,
  rejectionReason: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const rejectedRecord: ContributorKYCStatusRecord = {
  ...pendingRecord,
  status: 'rejected',
  rejectionReason: 'Please provide a clearer selfie image.',
};

describe('Contributor KYC server-backed submission', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    useAuthStore.setState({ user: { id: 'account-a' } as any });
    useContributorVerificationStore.getState().setOwnerUserId('account-a');
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
    useContributorVerificationStore.getState().setOwnerUserId(null);
    jest.restoreAllMocks();
  });

  it('sets local status only after the server confirms a persisted pending record', async () => {
    const getStatus = jest.spyOn(dataService, 'getContributorKYCStatus').mockResolvedValue({
      success: true,
      record: null,
    });
    const submit = jest.spyOn(dataService, 'submitKYC').mockResolvedValue({
      id: pendingRecord.id,
      success: true,
      record: pendingRecord,
    });

    const success = await submitKYC('account-a', {
      fullLegalName: 'Asha Rao',
      phoneNumber: '9876543210',
      selfieUri: 'file://selfie.jpg',
      selfieMimeType: 'image/jpeg',
      termsAccepted: true,
    });

    expect(success).toBe(true);
    expect(getStatus).toHaveBeenCalledWith('account-a');
    expect(submit).toHaveBeenCalledWith('account-a', expect.objectContaining({ termsAccepted: true }));
    expect(useContributorVerificationStore.getState().kycRecord).toEqual(pendingRecord);
  });

  it('does not claim success or set a local record when the server rejects persistence', async () => {
    jest.spyOn(dataService, 'getContributorKYCStatus').mockResolvedValue({ success: true, record: null });
    jest.spyOn(dataService, 'submitKYC').mockResolvedValue({ id: null, success: false });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const success = await submitKYC('account-a', {
      fullLegalName: 'Asha Rao',
      phoneNumber: '9876543210',
      selfieUri: 'file://selfie.jpg',
      selfieMimeType: 'image/jpeg',
      termsAccepted: true,
    });

    expect(success).toBe(false);
    expect(useContributorVerificationStore.getState().kycRecord).toBeNull();
    expect(useContributorVerificationStore.getState().kycLoading).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Submission Not Saved',
      'Verification submission could not be saved',
      [{ text: 'OK' }],
    );
  });

  it('uses an existing server record without uploading a duplicate selfie', async () => {
    const getStatus = jest.spyOn(dataService, 'getContributorKYCStatus').mockResolvedValue({
      success: true,
      record: pendingRecord,
    });
    const submit = jest.spyOn(dataService, 'submitKYC');

    const success = await submitKYC('account-a', {
      fullLegalName: 'Asha Rao',
      phoneNumber: '9876543210',
      selfieUri: 'file://selfie.jpg',
      selfieMimeType: 'image/jpeg',
      termsAccepted: true,
    });

    expect(success).toBe(true);
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(useContributorVerificationStore.getState().kycRecord).toEqual(pendingRecord);
  });

  it('allows a rejected submission to be corrected and sent back to the server', async () => {
    const updatedRecord = { ...pendingRecord, updatedAt: '2026-11-02T00:00:00.000Z' };
    jest.spyOn(dataService, 'getContributorKYCStatus').mockResolvedValue({
      success: true,
      record: rejectedRecord,
    });
    const submit = jest.spyOn(dataService, 'submitKYC').mockResolvedValue({
      id: pendingRecord.id,
      success: true,
      record: updatedRecord,
    });

    const success = await submitKYC('account-a', {
      fullLegalName: 'Asha Rao',
      phoneNumber: '9876543210',
      selfieUri: 'file://new-selfie.jpg',
      selfieMimeType: 'image/jpeg',
      termsAccepted: true,
    });

    expect(success).toBe(true);
    expect(submit).toHaveBeenCalledWith('account-a', expect.objectContaining({
      fullLegalName: 'Asha Rao',
      phoneNumber: '9876543210',
    }));
    expect(useContributorVerificationStore.getState().kycRecord).toEqual(updatedRecord);
  });

  it('does not allow suspended or revoked records to be resubmitted', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(dataService, 'getContributorKYCStatus').mockResolvedValue({
      success: true,
      record: { ...pendingRecord, status: 'suspended' },
    });
    const submit = jest.spyOn(dataService, 'submitKYC');

    const success = await submitKYC('account-a', {
      fullLegalName: 'Asha Rao',
      phoneNumber: '9876543210',
      selfieUri: 'file://selfie.jpg',
      selfieMimeType: 'image/jpeg',
      termsAccepted: true,
    });

    expect(success).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Submission Not Saved',
      expect.stringContaining('cannot be resubmitted'),
      [{ text: 'OK' }],
    );
    expect(useContributorVerificationStore.getState().kycLoading).toBe(false);
  });
});
