/**
 * Notification Trigger Service
 *
 * Handles creating notification records and dispatching push notifications
 * via Expo Push API. Works with Supabase service role for server-side inserts.
 *
 * In production, this would be called from:
 * - Supabase database webhooks/triggers
 * - API route handlers (post reply, issue update, etc.)
 * - Scheduled jobs (poll expiry, daily digest)
 */

export type NotificationTrigger =
  | 'post_reply'
  | 'comment_reply'
  | 'reaction'
  | 'poll_closed'
  | 'issue_status_change'
  | 'issue_upvote_milestone'
  | 'new_headline'
  | 'constituency_alert'
  | 'system';

export interface NotificationPayload {
  userId: string;
  trigger: NotificationTrigger;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sourcePostId?: string;
  sourceCommentId?: string;
  sourceIssueId?: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
  channelId?: string;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications via Expo Push API.
 * Accepts an array of Expo push tokens and a message payload.
 */
export async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<{ successCount: number; failCount: number }> {
  if (tokens.length === 0) return { successCount: 0, failCount: 0 };

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: 'default',
    channelId: 'default',
  }));

  // Expo Push API accepts batches of up to 100
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  let successCount = 0;
  let failCount = 0;

  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (res.ok) {
        const json = (await res.json()) as { data: Array<{ status: string }> };
        for (const ticket of json.data) {
          if (ticket.status === 'ok') successCount++;
          else failCount++;
        }
      } else {
        failCount += chunk.length;
      }
    } catch {
      failCount += chunk.length;
    }
  }

  return { successCount, failCount };
}

/**
 * Build notification messages for specific trigger types.
 * Returns the title and body for the push notification.
 */
export function buildNotificationMessage(
  trigger: NotificationTrigger,
  context: Record<string, string>,
): { title: string; body: string } {
  switch (trigger) {
    case 'post_reply':
      return {
        title: `${context.authorName ?? 'Someone'} replied to your post`,
        body: context.preview ?? 'Tap to see the reply',
      };
    case 'comment_reply':
      return {
        title: `${context.authorName ?? 'Someone'} replied to your comment`,
        body: context.preview ?? 'Tap to see the reply',
      };
    case 'reaction':
      return {
        title: `${context.authorName ?? 'Someone'} reacted to your post`,
        body: `${context.reactionType ?? 'like'} on "${context.postPreview ?? 'your post'}"`,
      };
    case 'poll_closed':
      return {
        title: 'Poll Results Are In!',
        body: `"${context.pollQuestion ?? 'A poll you voted on'}" has closed. See the results.`,
      };
    case 'issue_status_change':
      return {
        title: `Issue Update: ${context.newStatus ?? 'Updated'}`,
        body: `"${context.issueTitle ?? 'An issue you reported'}" status changed to ${context.newStatus ?? 'updated'}.`,
      };
    case 'issue_upvote_milestone':
      return {
        title: `Your issue is gaining traction!`,
        body: `"${context.issueTitle ?? 'Your issue'}" reached ${context.milestone ?? '50'} upvotes.`,
      };
    case 'new_headline':
      return {
        title: `Breaking: ${context.category ?? 'News'}`,
        body: context.headlineTitle ?? 'New headline in your area',
      };
    case 'constituency_alert':
      return {
        title: `Alert: ${context.constituencyName ?? 'Your Constituency'}`,
        body: context.alertMessage ?? 'New update in your constituency',
      };
    case 'system':
      return {
        title: context.title ?? 'Kshetra Update',
        body: context.body ?? 'Check out the latest updates',
      };
    default:
      return { title: 'Kshetra', body: 'You have a new notification' };
  }
}

/**
 * Notification trigger config — used by the mobile app to show
 * user-friendly names and defaults for notification preferences.
 */
export const TRIGGER_CONFIG: Record<NotificationTrigger, { label: string; description: string; defaultPush: boolean; defaultInApp: boolean }> = {
  post_reply: { label: 'Post Replies', description: 'When someone replies to your post', defaultPush: true, defaultInApp: true },
  comment_reply: { label: 'Comment Replies', description: 'When someone replies to your comment', defaultPush: true, defaultInApp: true },
  reaction: { label: 'Reactions', description: 'When someone reacts to your content', defaultPush: false, defaultInApp: true },
  poll_closed: { label: 'Poll Results', description: 'When a poll you voted on closes', defaultPush: true, defaultInApp: true },
  issue_status_change: { label: 'Issue Updates', description: 'When an issue you reported changes status', defaultPush: true, defaultInApp: true },
  issue_upvote_milestone: { label: 'Issue Milestones', description: 'When your issue reaches upvote milestones', defaultPush: true, defaultInApp: true },
  new_headline: { label: 'Headlines', description: 'Breaking news in your state', defaultPush: false, defaultInApp: true },
  constituency_alert: { label: 'Constituency Alerts', description: 'Important updates in your constituency', defaultPush: true, defaultInApp: true },
  system: { label: 'System Updates', description: 'App updates and announcements', defaultPush: true, defaultInApp: true },
};
