import type { AspirantProfile } from '../lib/aspirantTypes';
import type { Post } from '../lib/feedTypes';
import {
  canManageLeaderProfile,
  getLeaderProfilePosts,
} from '../lib/leaderProfileTruth';

const profile: AspirantProfile = {
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

function makePost(id: string, authorId: string, displayName: string): Post {
  return {
    id,
    author: { id: authorId, displayName },
    stateCode: 'KA',
    content: id,
    type: 'discussion',
    replyCount: 0,
    reactionCount: 0,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('leader profile production truth', () => {
  it('requires the authenticated account to own a profile in live environments', () => {
    expect(canManageLeaderProfile(profile, 'user-1', true, true)).toBe(true);
    expect(canManageLeaderProfile(profile, 'user-2', true, true)).toBe(false);
    expect(canManageLeaderProfile(profile, null, true, true)).toBe(false);
  });

  it('keeps the explicit owner and demo shortcuts limited to non-live previews', () => {
    expect(canManageLeaderProfile(profile, 'user-2', true, false)).toBe(true);
    expect(canManageLeaderProfile(profile, null, true, false)).toBe(true);
    expect(canManageLeaderProfile(profile, 'demo-aspirant-1', false, false)).toBe(true);
    expect(canManageLeaderProfile(profile, 'user-2', true, true)).toBe(false);
    expect(canManageLeaderProfile(profile, null, true, true)).toBe(false);
  });

  it('matches live profile posts by the account id, never by a shared display name', () => {
    const posts = [
      makePost('owned', 'user-1', 'Asha Rao'),
      makePost('same-name', 'unrelated-user', 'Asha Rao'),
      makePost('same-profile-id', 'profile-1', 'Other name'),
    ];

    expect(getLeaderProfilePosts(posts, profile, true).map((post) => post.id)).toEqual(['owned']);
  });

  it('retains fixture identity matching in non-live previews', () => {
    const posts = [
      makePost('owned', 'user-1', 'Asha Rao'),
      makePost('same-name', 'unrelated-user', ' Asha Rao '),
    ];

    expect(getLeaderProfilePosts(posts, profile, false).map((post) => post.id)).toEqual([
      'owned',
      'same-name',
    ]);
  });
});
