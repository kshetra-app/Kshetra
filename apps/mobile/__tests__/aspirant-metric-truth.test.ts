import { getAspirantMetricAvailability } from '@kshetra/shared';
import type { AspirantProfile } from '../lib/aspirantTypes';
import { hasCompleteCivicMetrics, isAspirantMetricAvailable } from '../lib/aspirantTypes';

const completeProfile: AspirantProfile = {
  id: 'profile-1',
  userId: 'user-1',
  displayName: 'Asha Rao',
  stateCode: 'KA',
  isIndependent: true,
  civicScore: 0,
  issuesReported: 0,
  issuesResolved: 0,
  commentsCount: 0,
  evidenceSubmitted: 0,
  promisesTracked: 0,
  communityEndorsements: 0,
  modulesCompleted: 0,
  challengesCompleted: 0,
  isPublic: true,
};

describe('aspirant metric truth', () => {
  it('treats persisted zero as available while missing and null values are unavailable', () => {
    expect(
      getAspirantMetricAvailability({
        civic_score: 0,
        issues_reported: null,
      }),
    ).toMatchObject({ civicScore: true, issuesReported: false });
  });

  it('rejects malformed persisted counts and retains explicit unavailable metadata', () => {
    expect(
      getAspirantMetricAvailability({
        civic_score: -1,
        issues_reported: 1.5,
        issues_resolved: 0,
        metricAvailability: { issuesResolved: false },
      }),
    ).toMatchObject({
      civicScore: false,
      issuesReported: false,
      issuesResolved: false,
    });
  });

  it('keeps a civic score available only when every source counter is available', () => {
    expect(hasCompleteCivicMetrics(completeProfile)).toBe(true);
    expect(
      hasCompleteCivicMetrics({
        ...completeProfile,
        metricAvailability: { commentsCount: false },
      }),
    ).toBe(false);
  });

  it('does not mislabel an unavailable fallback zero as a real zero', () => {
    expect(
      isAspirantMetricAvailable(
        { ...completeProfile, metricAvailability: { civicScore: false } },
        'civicScore',
      ),
    ).toBe(false);
    expect(isAspirantMetricAvailable(completeProfile, 'civicScore')).toBe(true);
  });
});
