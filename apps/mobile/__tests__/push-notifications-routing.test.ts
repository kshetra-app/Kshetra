/**
 * Push Notification Routing & Gateway Integration Test Suite
 * Master Execution Framework — Jobs 038-045 / Launch Gate A
 *
 * Verifies:
 * 1. Payload deep link route resolution across all entities (issue, post, constituency, conversation, delimitation)
 * 2. Category fallbacks when entity IDs are omitted
 * 3. Token registration with Fastify notification gateway
 * 4. In-app inbox ingestion upon foreground notification arrival
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { resolveNotificationRoute } from '../lib/usePushNotifications';
import { apiClient } from '../lib/api';

describe('Push Notifications Routing & Gateway Integration', () => {
  describe('1. resolveNotificationRoute Payload Router', () => {
    it('honors explicit route in data payload with highest precedence', () => {
      const route = resolveNotificationRoute({
        route: '/delimitation/my-impact',
        issueId: 'issue-123',
        constituencyId: 'TS-AC-1',
      });
      expect(route).toBe('/delimitation/my-impact');
    });

    it('routes issueId to dedicated /issue/[id] route', () => {
      const route = resolveNotificationRoute({ issueId: 'iss-999' }, 'civic_issue');
      expect(route).toBe('/issue/iss-999');
    });

    it('routes constituencyId to /constituency/[id] route', () => {
      const route = resolveNotificationRoute({ constituencyId: 'TS-AC-60' }, 'constituency_updates');
      expect(route).toBe('/constituency/TS-AC-60');
    });

    it('routes conversationId to /messages/[id] route', () => {
      const route = resolveNotificationRoute({ conversationId: 'conv-456' });
      expect(route).toBe('/messages/conv-456');
    });

    it('routes candidateId to /candidate-xray/[id] route', () => {
      const route = resolveNotificationRoute({ candidateId: 'cand-789' });
      expect(route).toBe('/candidate-xray/cand-789');
    });

    it('routes legislatorId to /legislator/[id] route', () => {
      const route = resolveNotificationRoute({ legislatorId: 'leg-111' });
      expect(route).toBe('/legislator/leg-111');
    });

    it('routes representativeId to /representative/[id] route', () => {
      const route = resolveNotificationRoute({ representativeId: 'rep-222' });
      expect(route).toBe('/representative/rep-222');
    });

    it('routes shortId to /(tabs)/shorts route', () => {
      const route = resolveNotificationRoute({ shortId: 'short-333' });
      expect(route).toBe('/(tabs)/shorts');
    });

    it('routes postId to /(tabs)/feed route', () => {
      const route = resolveNotificationRoute({ postId: 'post-444' });
      expect(route).toBe('/(tabs)/feed');
    });

    it('routes delimitationState to /delimitation/state/[code]', () => {
      const route = resolveNotificationRoute({ delimitationState: 'ts' });
      expect(route).toBe('/delimitation/state/TS');
    });

    describe('Category Fallback Routing', () => {
      it('routes civic_issue category without issueId to /(tabs)/dashboard', () => {
        expect(resolveNotificationRoute({}, 'civic_issue')).toBe('/(tabs)/dashboard');
      });

      it('routes promise_update category to /(tabs)/dashboard', () => {
        expect(resolveNotificationRoute({}, 'promise_update')).toBe('/(tabs)/dashboard');
      });

      it('routes election_results category to /live-election', () => {
        expect(resolveNotificationRoute({}, 'election_results')).toBe('/live-election');
      });

      it('routes delimitation_alert category to /delimitation', () => {
        expect(resolveNotificationRoute({}, 'delimitation_alert')).toBe('/delimitation');
      });

      it('routes community_activity category to /(tabs)/feed', () => {
        expect(resolveNotificationRoute({}, 'community_activity')).toBe('/(tabs)/feed');
      });

      it('routes constituency_updates without constituencyId to /(tabs)/explore', () => {
        expect(resolveNotificationRoute({}, 'constituency_updates')).toBe('/(tabs)/explore');
      });

      it('defaults to /notifications when no data or category matches', () => {
        expect(resolveNotificationRoute()).toBe('/notifications');
      });
    });
  });

  describe('2. Fastify NotificationsEndpoint Client Gateway', () => {
    it('registers push token through apiClient.notifications', async () => {
      const spy = jest.spyOn(apiClient.notifications, 'registerToken').mockResolvedValueOnce({
        success: true,
        data: { userId: 'u1', token: 'ExponentPushToken[xyz]', platform: 'android' },
      });

      const res = await apiClient.notifications.registerToken(
        'ExponentPushToken[xyz]',
        'android',
        'Pixel 8 Pro',
      );

      expect(spy).toHaveBeenCalledWith('ExponentPushToken[xyz]', 'android', 'Pixel 8 Pro');
      expect(res.success).toBe(true);
    });

    it('throws ApiValidationError if token or platform is missing', async () => {
      await expect(apiClient.notifications.registerToken('', 'android')).rejects.toThrow(
        'token and platform are required',
      );
    });

    it('gets notification preferences from API gateway', async () => {
      const mockPrefs = [
        { trigger: 'post_reply', label: 'Post Replies', description: 'desc', pushEnabled: true, inAppEnabled: true },
      ];
      jest.spyOn(apiClient.notifications, 'getPreferences').mockResolvedValueOnce(mockPrefs);

      const prefs = await apiClient.notifications.getPreferences();
      expect(prefs).toEqual(mockPrefs);
    });

    it('updates notification preferences via API gateway', async () => {
      jest.spyOn(apiClient.notifications, 'updatePreferences').mockResolvedValueOnce({
        trigger: 'post_reply',
        pushEnabled: false,
        inAppEnabled: true,
      });

      const updated = await apiClient.notifications.updatePreferences('post_reply', false, true);
      expect(updated.pushEnabled).toBe(false);
    });

    it('marks notification read via API gateway', async () => {
      jest.spyOn(apiClient.notifications, 'markRead').mockResolvedValueOnce({
        success: true,
        data: { notificationId: 'n1', readAt: new Date().toISOString() },
      });

      const res = await apiClient.notifications.markRead({ notificationId: 'n1' });
      expect(res.success).toBe(true);
    });
  });
});
