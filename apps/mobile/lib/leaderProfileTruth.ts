import type { AspirantProfile } from './aspirantTypes';
import type { Post } from './feedTypes';

export function canManageLeaderProfile(
  profile: AspirantProfile | null,
  authUserId: string | null | undefined,
  requestedOwner: boolean,
  isLiveEnvironment: boolean,
): boolean {
  if (!profile) return false;
  if (isLiveEnvironment) {
    return Boolean(authUserId && profile.userId && authUserId === profile.userId);
  }
  if (requestedOwner) return true;
  if (!authUserId) return false;
  return authUserId === profile.userId || authUserId === 'demo-aspirant-1';
}

export function getLeaderProfilePosts(
  posts: Post[],
  profile: AspirantProfile | null,
  isLiveEnvironment: boolean,
): Post[] {
  if (!profile) return [];
  if (isLiveEnvironment) {
    if (!profile.userId) return [];
    return posts.filter((post) => post.author?.id === profile.userId);
  }

  const nameMatch = profile.displayName.toLowerCase().trim();
  return posts.filter((post) => {
    const authorId = post.author?.id;
    const authorName = (post.author?.displayName || '').toLowerCase().trim();
    return (
      authorId === profile.userId ||
      authorId === profile.id ||
      authorName === nameMatch
    );
  });
}
