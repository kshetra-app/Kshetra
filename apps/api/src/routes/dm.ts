import type { FastifyPluginAsync } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface RateLimitBucket {
  hourTimestamp: number;
  hourlyCount: number;
  dayTimestamp: number;
  dailyStrangerCount: number;
}

// In-memory rate limiting state per user
const RATE_LIMIT_CACHE = new Map<string, RateLimitBucket>();

/**
 * Check and increment tiered rate limits for conversation creation:
 * 1. Hard ceiling for all accounts: max 15 new conversations per hour
 * 2. Accounts < 7 days old: max 10 new stranger conversations per 24 hours
 * 3. Verified Page accounts: max 100 new stranger conversations per 24 hours
 * 4. Regular older accounts: max 40 new stranger conversations per 24 hours
 */
export function checkConversationRateLimit(
  userId: string,
  userCreatedAt: Date,
  isVerifiedPage: boolean,
  isMutualFollow: boolean,
): { allowed: boolean; error?: string; retryAfterSeconds?: number } {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  let bucket = RATE_LIMIT_CACHE.get(userId);
  if (!bucket) {
    bucket = {
      hourTimestamp: now,
      hourlyCount: 0,
      dayTimestamp: now,
      dailyStrangerCount: 0,
    };
    RATE_LIMIT_CACHE.set(userId, bucket);
  }

  // Reset hourly window if expired
  if (now - bucket.hourTimestamp > ONE_HOUR) {
    bucket.hourTimestamp = now;
    bucket.hourlyCount = 0;
  }

  // Reset daily window if expired
  if (now - bucket.dayTimestamp > ONE_DAY) {
    bucket.dayTimestamp = now;
    bucket.dailyStrangerCount = 0;
  }

  // 1. Hard Hourly Ceiling (15/hr)
  const HOURLY_MAX = 15;
  if (bucket.hourlyCount >= HOURLY_MAX) {
    const retryAfter = Math.ceil((bucket.hourTimestamp + ONE_HOUR - now) / 1000);
    return {
      allowed: false,
      error: `Hourly conversation creation limit of ${HOURLY_MAX} reached. Please try again later.`,
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  // 2. Daily Stranger Limits (exempt if mutual follow)
  if (!isMutualFollow) {
    const accountAgeDays = (now - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    let dailyMax = 40;

    if (isVerifiedPage) {
      dailyMax = 100;
    } else if (accountAgeDays < 7) {
      dailyMax = 10;
    }

    if (bucket.dailyStrangerCount >= dailyMax) {
      const retryAfter = Math.ceil((bucket.dayTimestamp + ONE_DAY - now) / 1000);
      return {
        allowed: false,
        error: `Daily new conversation limit of ${dailyMax} reached for your account tier.`,
        retryAfterSeconds: Math.max(1, retryAfter),
      };
    }

    bucket.dailyStrangerCount += 1;
  }

  bucket.hourlyCount += 1;
  return { allowed: true };
}

export const dmRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Helper: Resolve authenticated user from Bearer token or non-production x-user-id
   */
  async function resolveAuthUser(request: any): Promise<{ userId: string; role?: string; verificationStatus?: string; createdAt?: Date } | null> {
    let userId: string | null = null;
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId && process.env.NODE_ENV !== 'production' && (request.headers['x-user-id'] as string)) {
      userId = request.headers['x-user-id'] as string;
    }

    if (!userId) return null;

    if (!isSupabaseConfigured) {
      return { userId, role: 'citizen', verificationStatus: 'unverified', createdAt: new Date() };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, verification_status, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      userId,
      role: profile?.role ?? 'citizen',
      verificationStatus: profile?.verification_status ?? 'unverified',
      createdAt: profile?.created_at ? new Date(profile.created_at) : new Date(),
    };
  }

  /**
   * POST /api/v1/dm/conversations
   * Start or retrieve a direct conversation between two users
   */
  app.post<{
    Body: { recipientId: string; initialMessage?: string };
  }>('/api/v1/dm/conversations', async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }

    const { recipientId, initialMessage } = request.body || {};
    if (!recipientId || recipientId === auth.userId) {
      return reply.status(400).send({ error: 'Valid recipientId is required and cannot be self' });
    }

    if (!isSupabaseConfigured) {
      // Mock mode fallback for local testing
      return reply.send({
        success: true,
        conversation: {
          id: `conv-${auth.userId}-${recipientId}`,
          participant_one: auth.userId,
          participant_two: recipientId,
          status: 'accepted',
          initiated_by: auth.userId,
          last_message_preview: initialMessage ?? null,
        },
      });
    }

    // 1. Blocklist check (bidirectional)
    const { data: isBlocked } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${auth.userId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${auth.userId})`)
      .maybeSingle();

    if (isBlocked) {
      return reply.status(403).send({
        error: 'Direct messaging is unavailable between these accounts.',
        code: 'USER_BLOCKED',
      });
    }

    // Order participants deterministically to satisfy UNIQUE constraint
    const [p1, p2] = [auth.userId, recipientId].sort();

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_one', p1)
      .eq('participant_two', p2)
      .maybeSingle();

    if (existing) {
      return reply.send({ success: true, conversation: existing });
    }

    // 2. Check follow relationship: does recipient follow sender?
    const { data: followRel } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', recipientId)
      .eq('followed_id', auth.userId)
      .maybeSingle();

    const isMutualFollow = !!followRel;

    // 3. Enforce Tiered Rate Limits (Ticket 3.5)
    const isVerifiedPage = ['politician', 'party', 'journalist'].includes(auth.role || '') &&
      auth.verificationStatus === 'verified';

    const rateCheck = checkConversationRateLimit(
      auth.userId,
      auth.createdAt || new Date(),
      isVerifiedPage,
      isMutualFollow,
    );

    if (!rateCheck.allowed) {
      if (rateCheck.retryAfterSeconds) {
        reply.header('Retry-After', rateCheck.retryAfterSeconds);
      }
      return reply.status(429).send({
        error: rateCheck.error,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateCheck.retryAfterSeconds,
      });
    }

    // Status: if recipient follows sender, accepted; otherwise pending (lands in Requests)
    const initialStatus = isMutualFollow ? 'accepted' : 'pending';

    const { data: newConv, error: createErr } = await supabase
      .from('conversations')
      .insert({
        participant_one: p1,
        participant_two: p2,
        status: initialStatus,
        initiated_by: auth.userId,
        last_message_preview: initialMessage ? initialMessage.slice(0, 100) : null,
      })
      .select()
      .single();

    if (createErr) {
      return reply.status(500).send({ error: createErr.message });
    }

    // If initial message provided, insert it
    if (initialMessage && initialMessage.trim()) {
      await supabase.from('messages').insert({
        conversation_id: newConv.id,
        sender_id: auth.userId,
        content: initialMessage.trim(),
      });
    }

    return reply.status(201).send({ success: true, conversation: newConv });
  });

  /**
   * POST /api/v1/dm/conversations/:id/messages
   * Send a message in an existing conversation
   */
  app.post<{
    Params: { id: string };
    Body: { content: string; mediaUrl?: string; mediaType?: 'image' | 'video' | 'audio' | 'document' };
  }>('/api/v1/dm/conversations/:id/messages', async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }

    const conversationId = request.params.id;
    const { content, mediaUrl, mediaType } = request.body || {};

    if (!content && !mediaUrl) {
      return reply.status(400).send({ error: 'Message content or media is required' });
    }

    if (!isSupabaseConfigured) {
      return reply.send({
        success: true,
        message: {
          id: `msg-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: auth.userId,
          content: content || '',
          media_url: mediaUrl,
          media_type: mediaType,
          is_media_locked: false,
          created_at: new Date().toISOString(),
        },
      });
    }

    // Verify conversation membership
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    if (conv.participant_one !== auth.userId && conv.participant_two !== auth.userId) {
      return reply.status(403).send({ error: 'Not a conversation participant' });
    }

    const recipientId = conv.participant_one === auth.userId ? conv.participant_two : conv.participant_one;

    // Verify blocklist
    const { data: isBlocked } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${auth.userId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${auth.userId})`)
      .maybeSingle();

    if (isBlocked) {
      return reply.status(403).send({ error: 'Cannot message a blocked user', code: 'USER_BLOCKED' });
    }

    // Ticket 3.3: Mutual-accept for unsolicited media
    // If conversation is pending OR recipient has not accepted media, lock media behind consent shield
    const recipientAcceptedMedia = conv.participant_one === recipientId
      ? conv.media_accepted_by_one
      : conv.media_accepted_by_two;

    const isMediaLocked = !!mediaUrl && (conv.status === 'pending' || !recipientAcceptedMedia);

    // Insert message
    const { data: newMsg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: auth.userId,
        content: content ? content.trim() : (mediaUrl ? '[Media Attachment]' : ''),
        media_url: mediaUrl,
        media_type: mediaType,
        is_media_locked: isMediaLocked,
      })
      .select()
      .single();

    if (msgErr) {
      return reply.status(500).send({ error: msgErr.message });
    }

    // Ticket 3.6: Notification dispatch treatment
    let shouldNotify = false;
    let notificationTitle = 'New Message';
    let notificationBody = content ? content.slice(0, 100) : 'Sent an attachment';

    if (conv.status === 'accepted') {
      shouldNotify = true;
    } else if (conv.status === 'pending' && !conv.first_notification_sent) {
      // Single push notification on first message with generic copy (no raw content preview)
      shouldNotify = true;
      notificationTitle = 'New Message Request';
      notificationBody = 'You have received a new message request';

      // Mark first notification as sent so subsequent messages don't buzz
      await supabase
        .from('conversations')
        .update({ first_notification_sent: true })
        .eq('id', conversationId);
    }

    return reply.status(201).send({
      success: true,
      message: newMsg,
      notificationTriggered: shouldNotify,
      notificationDetails: shouldNotify ? { title: notificationTitle, body: notificationBody } : null,
    });
  });

  /**
   * POST /api/v1/dm/conversations/:id/accept
   * Accept a pending message request (moves to Chats and unlocks messaging)
   */
  app.post<{
    Params: { id: string };
  }>('/api/v1/dm/conversations/:id/accept', async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const conversationId = request.params.id;

    if (!isSupabaseConfigured) {
      return reply.send({ success: true, status: 'accepted' });
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (!conv || (conv.participant_one !== auth.userId && conv.participant_two !== auth.userId)) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    // Move to accepted and enable media for this participant
    const updatePayload: Record<string, any> = { status: 'accepted', updated_at: new Date().toISOString() };
    if (conv.participant_one === auth.userId) {
      updatePayload.media_accepted_by_one = true;
    } else {
      updatePayload.media_accepted_by_two = true;
    }

    const { error } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    // Unlock media for messages in this thread
    await supabase
      .from('messages')
      .update({ is_media_locked: false })
      .eq('conversation_id', conversationId);

    return reply.send({ success: true, status: 'accepted' });
  });

  /**
   * POST /api/v1/dm/conversations/:id/decline
   * Decline a pending message request silently
   */
  app.post<{
    Params: { id: string };
  }>('/api/v1/dm/conversations/:id/decline', async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const conversationId = request.params.id;

    if (!isSupabaseConfigured) {
      return reply.send({ success: true, status: 'declined' });
    }

    const { error } = await supabase
      .from('conversations')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .or(`participant_one.eq.${auth.userId},participant_two.eq.${auth.userId}`);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return reply.send({ success: true, status: 'declined' });
  });

  /**
   * POST /api/v1/dm/block-report
   * One-tap Block and Report user (Ticket 3.4)
   */
  app.post<{
    Body: { targetUserId: string; reason?: string; description?: string; conversationId?: string };
  }>('/api/v1/dm/block-report', async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { targetUserId, reason = 'harassment', description, conversationId } = request.body || {};
    if (!targetUserId || targetUserId === auth.userId) {
      return reply.status(400).send({ error: 'Valid targetUserId required' });
    }

    if (isSupabaseConfigured) {
      // 1. Insert into blocked_users
      await supabase
        .from('blocked_users')
        .upsert({ blocker_id: auth.userId, blocked_id: targetUserId }, { onConflict: 'blocker_id,blocked_id' });

      // 2. Feed into Phase 1 moderation queue as pending report awaiting human review
      await supabase
        .from('reports')
        .insert({
          reporter_id: auth.userId,
          reported_user_id: targetUserId,
          conversation_id: conversationId ?? null,
          reason,
          description: description ?? null,
          status: 'pending',
        });

      // 3. Mark conversation declined if conversationId provided
      if (conversationId) {
        await supabase
          .from('conversations')
          .update({ status: 'declined' })
          .eq('id', conversationId);
      }
    }

    return reply.send({
      success: true,
      blocked: true,
      reported: true,
      targetUserId,
    });
  });
};
