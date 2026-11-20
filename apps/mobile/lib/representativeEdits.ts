import { apiClient } from './api';
import { captureForensicSnapshot } from './deviceFingerprint';

interface RepresentativeEditInput {
  representativeId: string;
  sourceUrl: string;
  citation?: string;
  diff: Record<string, { from: string | null; to: string | null }>;
}

export async function submitRepresentativeEdit(input: RepresentativeEditInput): Promise<void> {
  const fingerprint = await captureForensicSnapshot().catch(() => undefined);
  const result = await apiClient.post<{ success: boolean; id: number }>(
    '/api/v1/local-bodies/corrections',
    { ...input, fingerprint },
    { authPolicy: 'authenticated' },
  );
  if (!result.data.success || !result.data.id) {
    throw new Error('The correction queue did not confirm the submission.');
  }
}
