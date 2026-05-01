/**
 * Smart Notification Triggers
 *
 * Dispatches local notifications based on data changes.
 * Checks user preferences before firing.
 */

import { useNotificationsStore } from '../stores/notifications';
import { scheduleLocalNotification } from './notifications';
import type { AlertCategory } from './notifications';

interface TriggerPayload {
  category: AlertCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Check if user has enabled this category, then dispatch.
 */
async function dispatchIfEnabled(payload: TriggerPayload): Promise<boolean> {
  const { enabled, categories, addNotification } = useNotificationsStore.getState();

  if (!enabled) return false;
  if (!categories[payload.category]) return false;

  // Add to in-app inbox
  addNotification({
    title: payload.title,
    body: payload.body,
    category: payload.category,
    data: payload.data,
  });

  // Fire OS-level notification
  try {
    await scheduleLocalNotification(payload.title, payload.body, {
      category: payload.category,
      ...payload.data,
    });
  } catch {
    // Notification API may not be available
  }

  return true;
}

// ─── CIVIC ISSUE TRIGGERS ───

export function notifyCivicIssueNearYou(issueName: string, constituency: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'civic_issue',
    title: 'New Issue Reported',
    body: `"${issueName}" reported in ${constituency}`,
    data: { route: '/(tabs)/dashboard' },
  });
}

export function notifyCivicIssueStatusChange(issueName: string, newStatus: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'civic_issue',
    title: 'Issue Status Updated',
    body: `"${issueName}" is now ${newStatus}`,
    data: { route: '/(tabs)/dashboard' },
  });
}

export function notifyMLAResponse(issueTitle: string, mlaName: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'civic_issue',
    title: 'MLA Responded!',
    body: `${mlaName} responded to "${issueTitle}"`,
    data: { route: '/(tabs)/dashboard' },
  });
}

// ─── PROMISE TRIGGERS ───

export function notifyPromiseStatusChange(promiseTitle: string, newStatus: string, party: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'promise_update',
    title: `Promise ${newStatus}`,
    body: `${party}: "${promiseTitle}"`,
    data: { route: '/(tabs)/dashboard' },
  });
}

export function notifyPromiseMilestone(promiseTitle: string, milestone: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'promise_update',
    title: 'Promise Milestone',
    body: `"${promiseTitle}" — ${milestone}`,
  });
}

// ─── DELIMITATION TRIGGERS ───

export function notifyDelimitationUpdate(headline: string, stateCode?: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'delimitation_alert',
    title: 'Delimitation Update',
    body: headline,
    data: { route: '/delimitation' },
  });
}

export function notifyGazettePublication(title: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'delimitation_alert',
    title: 'Official Gazette Published',
    body: title,
    data: { route: '/delimitation' },
  });
}

// ─── ELECTION / CONSTITUENCY TRIGGERS ───

export function notifyElectionResult(constituency: string, winner: string, party: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'election_results',
    title: 'Election Result Declared',
    body: `${constituency}: ${winner} (${party}) wins`,
    data: { route: '/(tabs)/explore' },
  });
}

export function notifyConstituencyUpdate(constituency: string, update: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'constituency_updates',
    title: constituency,
    body: update,
  });
}

// ─── ANALYTICS TRIGGERS ───

export function notifyAnalyticsInsight(insight: string, stateCode: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'analytics_insight',
    title: 'New Insight',
    body: insight,
    data: { route: '/analytics' },
  });
}

// ─── COMMUNITY TRIGGERS ───

export function notifyCommunityReply(postAuthor: string, snippet: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'community_activity',
    title: `${postAuthor} replied`,
    body: snippet.slice(0, 80),
    data: { route: '/(tabs)/feed' },
  });
}

export function notifyCommunityMention(mentioner: string): Promise<boolean> {
  return dispatchIfEnabled({
    category: 'community_activity',
    title: 'You were mentioned',
    body: `${mentioner} mentioned you in a post`,
    data: { route: '/(tabs)/feed' },
  });
}
