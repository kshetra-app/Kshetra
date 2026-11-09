/**
 * Feed & Social Routes
 * Fastify route handlers for Posts, Polls, Comments, and Reactions.
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 */

import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';

export async function feedRoutes(app: FastifyInstance) {
  /**
   * 1. POST /api/v1/feed/posts — Compose post
   */
  app.post<{
    Body: {
      content: string;
      type?: 'discussion' | 'news' | 'opinion' | 'question' | 'alert' | 'poll';
      stateCode: string;
      constituencyId?: string;
      authorId?: string;
      parentId?: string;
      language?: string;
      hashtags?: string[];
      pollOptions?: string[];
      clientToken?: string;
    };
  }>(
    '/api/v1/feed/posts',
    {
      schema: {
        body: {
          type: 'object',
          required: ['content', 'stateCode'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 2000 },
            type: {
              type: 'string',
              enum: ['discussion', 'news', 'opinion', 'question', 'alert', 'poll'],
            },
            stateCode: { type: 'string', minLength: 2, maxLength: 2 },
            constituencyId: { type: 'string' },
            authorId: { type: 'string' },
            parentId: { type: 'string' },
            language: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            clientToken: { type: 'string', minLength: 1, maxLength: 128 },
            pollOptions: {
              type: 'array',
              minItems: 2,
              maxItems: 5,
              items: { type: 'string', minLength: 1, maxLength: 200 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.authorId, 'authorId')) {
        return;
      }

      const {
        content,
        type = 'discussion',
        stateCode,
        constituencyId,
        parentId,
        language = 'en',
        hashtags,
        pollOptions,
        clientToken,
      } = request.body;

      const normalizedPollOptions = pollOptions?.map((option) => option.trim());
      if (
        type === 'poll' &&
        (!normalizedPollOptions || normalizedPollOptions.length < 2 || normalizedPollOptions.length > 5 ||
          normalizedPollOptions.some((option) => !option || option.length > 200) ||
          new Set(normalizedPollOptions.map((option) => option.toLocaleLowerCase())).size !== normalizedPollOptions.length)
      ) {
        return sendApiError(
          reply,
          request,
          400,
          'Bad Request',
          'Polls require 2–5 distinct, non-empty options of at most 200 characters.',
          { code: 'VALIDATION_ERROR' },
        );
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const normalizedHashtags = [...new Set((hashtags ?? [])
        .map((tag) => tag.replace(/^#/, '').toLowerCase().trim())
        .filter(Boolean))].sort();
      const requestHash = createHash('sha256').update(JSON.stringify({
        content,
        type,
        stateCode,
        constituencyId: constituencyId ?? null,
        parentId: parentId ?? null,
        language,
        hashtags: normalizedHashtags,
        pollOptions: normalizedPollOptions ?? null,
      })).digest('hex');

      try {
        const lookupExistingPost = async () => {
          if (!clientToken) return { kind: 'missing' as const };
          const { data: existing, error: existingErr } = await supabase
            .from('posts')
            .select('*')
            .eq('author_id', auth.userId)
            .eq('client_token', clientToken)
            .maybeSingle();
          if (existingErr) return { kind: 'error' as const, message: existingErr.message };
          if (!existing) return { kind: 'missing' as const };
          if (existing.request_hash !== requestHash) return { kind: 'conflict' as const };

          let existingPoll: {
            id: string;
            question: string;
            totalVotes: number;
            isClosed: boolean;
            options: { id: string; label: string; voteCount: number; sortOrder: number }[];
          } | undefined;
          if (existing.type === 'poll') {
            const { data: poll, error: pollErr } = await supabase
              .from('polls')
              .select('id, question, total_votes, is_closed')
              .eq('post_id', existing.id)
              .maybeSingle();
            if (pollErr || !poll) return { kind: 'pending' as const, message: pollErr?.message || 'Persisted poll is not visible yet' };
            const { data: options, error: optionsErr } = await supabase
              .from('poll_options')
              .select('id, label, vote_count, sort_order')
              .eq('poll_id', poll.id)
              .order('sort_order', { ascending: true });
            if (optionsErr || !options || options.length < 2) {
              return { kind: 'pending' as const, message: optionsErr?.message || 'Persisted poll options are not visible yet' };
            }
            existingPoll = {
              id: poll.id,
              question: poll.question,
              totalVotes: poll.total_votes ?? 0,
              isClosed: Boolean(poll.is_closed),
              options: options.map((option) => ({
                id: option.id,
                label: option.label,
                voteCount: option.vote_count ?? 0,
                sortOrder: option.sort_order ?? 0,
              })),
            };
          }
          return { kind: 'found' as const, post: existing, poll: existingPoll };
        };

        const sendReplay = (result: Awaited<ReturnType<typeof lookupExistingPost>>) => {
          if (result.kind === 'missing') return null;
          if (result.kind === 'conflict') {
            return sendApiError(reply, request, 409, 'Conflict', 'This post retry token was already used for different content.', {
              code: 'IDEMPOTENCY_KEY_REUSE',
            });
          }
          if (result.kind === 'error') {
            return sendApiError(reply, request, 503, 'Service Unavailable', 'Could not safely reconcile this post retry.', {
              code: 'POST_RECONCILIATION_UNAVAILABLE',
            });
          }
          if (result.kind === 'pending') {
            return sendApiError(reply, request, 503, 'Service Unavailable', 'The original post is still finishing persistence. Retry this same request shortly.', {
              code: 'POST_RECONCILIATION_PENDING',
            });
          }
          return reply.send({ success: true, id: result.post.id, post: result.post, poll: result.poll });
        };

        if (clientToken) {
          const replay = sendReplay(await lookupExistingPost());
          if (replay) return replay;
        }

        const { data: post, error: postErr } = await supabase
          .from('posts')
          .insert({
            content,
            type,
            state_code: stateCode,
            author_id: auth.userId,
            constituency_id: constituencyId ?? null,
            parent_id: parentId ?? null,
            language,
            ...(clientToken ? { client_token: clientToken, request_hash: requestHash } : {}),
          })
          .select('*')
          .single();

        if (postErr || !post) {
          if (clientToken && postErr?.code === '23505') {
            const replay = sendReplay(await lookupExistingPost());
            if (replay) return replay;
          }
          app.log.error({ err: postErr?.message }, 'Failed to insert post');
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            postErr?.message || 'Failed to create post',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }

        let persistedPoll: {
          id: string;
          question: string;
          totalVotes: number;
          isClosed: boolean;
          options: { id: string; label: string; voteCount: number; sortOrder: number }[];
        } | undefined;

        // Create polls and options from the validated request. Remove the parent post
        // if either child write fails so a partially-created poll is not reported.
        if (type === 'poll') {
          const { data: poll, error: pollErr } = await supabase
            .from('polls')
            .insert({
              post_id: post.id,
              question: content,
            })
            .select('id, question, total_votes, is_closed')
            .single();

          if (pollErr || !poll) {
            const { error: cleanupError } = await supabase.from('posts').delete().eq('id', post.id);
            if (cleanupError) app.log.error({ err: cleanupError.message, postId: post.id }, 'Failed to roll back post after poll creation error');
            return sendApiError(reply, request, 500, 'Internal Server Error', pollErr?.message || 'Failed to create poll', {
              code: 'DATABASE_ERROR',
            });
          }

          const optionRows = normalizedPollOptions!.map((label, idx) => ({
            poll_id: poll.id,
            label,
            sort_order: idx,
          }));
          const { data: options, error: optionsErr } = await supabase
            .from('poll_options')
            .insert(optionRows)
            .select('id, label, vote_count, sort_order');

          if (optionsErr || !options || options.length !== optionRows.length) {
            const { error: cleanupError } = await supabase.from('posts').delete().eq('id', post.id);
            if (cleanupError) app.log.error({ err: cleanupError.message, postId: post.id }, 'Failed to roll back post after poll options error');
            return sendApiError(reply, request, 500, 'Internal Server Error', optionsErr?.message || 'Failed to create poll options', {
              code: 'DATABASE_ERROR',
            });
          }

          persistedPoll = {
            id: poll.id,
            question: poll.question,
            totalVotes: poll.total_votes ?? 0,
            isClosed: Boolean(poll.is_closed),
            options: options.map((option) => ({
              id: option.id,
              label: option.label,
              voteCount: option.vote_count ?? 0,
              sortOrder: option.sort_order ?? 0,
            })),
          };
        }

        // Sync hashtags if present
        if (normalizedHashtags.length > 0) {
          for (const normalized of normalizedHashtags) {
            const { data: tagRow } = await supabase
              .from('hashtags')
              .upsert({ tag: normalized }, { onConflict: 'tag' })
              .select('id')
              .single();

            if (tagRow) {
              await supabase
                .from('post_hashtags')
                .upsert(
                  { post_id: post.id, hashtag_id: tagRow.id },
                  { onConflict: 'post_id,hashtag_id' },
                );
            }
          }
        }

        return reply.status(201).send({
          success: true,
          id: post.id,
          post,
          poll: persistedPoll,
        });
      } catch (err: any) {
        app.log.error({ err: err?.message }, 'Exception in compose post');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error creating post',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 2. PATCH /api/v1/feed/posts/:id — Edit post
   */
  app.patch<{
    Params: { id: string };
    Body: { content: string; authorId?: string };
  }>(
    '/api/v1/feed/posts/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 2000 },
            authorId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.authorId, 'authorId')) {
        return;
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id } = request.params;
      const { content } = request.body;

      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('posts')
          .select('author_id')
          .eq('id', id)
          .maybeSingle();

        if (fetchErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        if (!existing) {
          return sendApiError(reply, request, 404, 'Not Found', `Post ${id} not found`, {
            code: 'NOT_FOUND',
          });
        }

        if (existing.author_id !== auth.userId) {
          return sendApiError(
            reply,
            request,
            403,
            'Forbidden',
            'Only the post author may edit this post',
            {
              code: 'FORBIDDEN',
            },
          );
        }

        const { error: updateErr } = await supabase
          .from('posts')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', updateErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, id, message: 'Post updated successfully' });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error updating post',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 3. DELETE /api/v1/feed/posts/:id — Soft-delete post
   */
  app.delete<{
    Params: { id: string };
  }>(
    '/api/v1/feed/posts/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id } = request.params;

      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('posts')
          .select('author_id')
          .eq('id', id)
          .maybeSingle();

        if (fetchErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        if (!existing) {
          return sendApiError(reply, request, 404, 'Not Found', `Post ${id} not found`, {
            code: 'NOT_FOUND',
          });
        }

        const isAuthor = existing.author_id === auth.userId;
        const isPrivileged = ['admin', 'moderator'].includes(auth.role);
        if (!isAuthor && !isPrivileged) {
          return sendApiError(
            reply,
            request,
            403,
            'Forbidden',
            'Only author or moderator may delete this post',
            {
              code: 'FORBIDDEN',
            },
          );
        }

        const { error: deleteErr } = await supabase
          .from('posts')
          .update({ is_deleted: true, content: '[Deleted]' })
          .eq('id', id);

        if (deleteErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', deleteErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, id, message: 'Post deleted successfully' });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error deleting post',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 4. POST /api/v1/feed/posts/:id/react — React to post
   */
  app.post<{
    Params: { id: string };
    Body: { type: string; userId?: string };
  }>(
    '/api/v1/feed/posts/:id/react',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: postId } = request.params;
      const { type: reactionType } = request.body;

      try {
        const { error: upsertErr } = await supabase
          .from('reactions')
          .upsert(
            { post_id: postId, user_id: auth.userId, type: reactionType },
            { onConflict: 'user_id,post_id' },
          );

        if (upsertErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', upsertErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        // Async notification to author if reacting to someone else's post
        supabase
          .from('posts')
          .select('author_id')
          .eq('id', postId)
          .maybeSingle()
          .then(({ data: postData }) => {
            if (postData?.author_id && postData.author_id !== auth.userId) {
              void supabase.from('notification_log').insert({
                user_id: postData.author_id,
                trigger_type: 'reaction',
                title: 'New Reaction',
                body: `Someone reacted with ${reactionType} to your post.`,
                source_post_id: postId,
                read: false,
              });
            }
          });

        return reply.send({ success: true, postId, reaction: reactionType });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error recording reaction',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 5. DELETE /api/v1/feed/posts/:id/react — Remove post reaction
   */
  app.delete<{
    Params: { id: string };
    Body?: { userId?: string };
  }>(
    '/api/v1/feed/posts/:id/react',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: postId } = request.params;

      try {
        const { error: deleteErr } = await supabase
          .from('reactions')
          .delete()
          .match({ post_id: postId, user_id: auth.userId });

        if (deleteErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', deleteErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, postId });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error removing reaction',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 6. POST /api/v1/feed/polls/:id/vote — Vote in poll
   */
  app.post<{
    Params: { id: string };
    Body: { optionId: string; userId?: string };
  }>(
    '/api/v1/feed/polls/:id/vote',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['optionId'],
          properties: {
            optionId: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: pollId } = request.params;
      const { optionId } = request.body;

      try {
        const { error: voteErr } = await supabase
          .from('poll_votes')
          .insert({ poll_id: pollId, option_id: optionId, user_id: auth.userId });

        if (voteErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', voteErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, pollId, optionId });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error casting poll vote',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 7. POST /api/v1/feed/posts/:id/comments — Add comment to post
   */
  app.post<{
    Params: { id: string };
    Body: { content: string; language?: string; authorId?: string; clientToken?: string };
  }>(
    '/api/v1/feed/posts/:id/comments',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 1000 },
            language: { type: 'string' },
            authorId: { type: 'string' },
            clientToken: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.authorId, 'authorId')) {
        return;
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: postId } = request.params;
      const { content, language = 'en', clientToken } = request.body;

      try {
        if (clientToken) {
          const { data: existing, error: existingErr } = await supabase
            .from('comments')
            .select('*')
            .eq('author_id', auth.userId)
            .eq('client_token', clientToken)
            .maybeSingle();

          if (existingErr) {
            return sendApiError(reply, request, 503, 'Service Unavailable', 'Comment retry protection is not available. Apply the feed comment idempotency migration before enabling this client.', {
              code: 'COMMENT_IDEMPOTENCY_UNAVAILABLE',
            });
          }

          if (existing) {
            if (existing.post_id !== postId || existing.content !== content || existing.language !== language) {
              return sendApiError(reply, request, 409, 'Conflict', 'This comment retry token was already used for a different comment.', {
                code: 'IDEMPOTENCY_KEY_REUSE',
              });
            }
            return reply.send({ success: true, id: existing.id, postId, comment: existing });
          }
        }

        const { data: comment, error: commentErr } = await supabase
          .from('comments')
          .insert({
            post_id: postId,
            author_id: auth.userId,
            content,
            language,
            ...(clientToken ? { client_token: clientToken } : {}),
          })
          .select('*')
          .single();

        if (commentErr || !comment) {
          // A concurrent retry may have inserted the same token after the lookup.
          // Resolve that unique-key race to the original persisted comment.
          if (clientToken && commentErr?.code === '23505') {
            const { data: existing, error: existingErr } = await supabase
              .from('comments')
              .select('*')
              .eq('author_id', auth.userId)
              .eq('client_token', clientToken)
              .maybeSingle();
            if (!existingErr && existing) {
              if (existing.post_id !== postId || existing.content !== content || existing.language !== language) {
                return sendApiError(reply, request, 409, 'Conflict', 'This comment retry token was already used for a different comment.', {
                  code: 'IDEMPOTENCY_KEY_REUSE',
                });
              }
              return reply.send({ success: true, id: existing.id, postId, comment: existing });
            }
          }
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            commentErr?.message || 'Failed to add comment',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }

        // Notify post author
        supabase
          .from('posts')
          .select('author_id')
          .eq('id', postId)
          .maybeSingle()
          .then(({ data: postData }) => {
            if (postData?.author_id && postData.author_id !== auth.userId) {
              void supabase.from('notification_log').insert({
                user_id: postData.author_id,
                trigger_type: 'comment',
                title: 'New Comment',
                body: 'Someone commented on your post.',
                source_post_id: postId,
                read: false,
              });
            }
          });

        return reply.status(201).send({ success: true, id: comment.id, postId, comment });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error creating comment',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 8. DELETE /api/v1/feed/comments/:id — Delete post comment
   */
  app.delete<{
    Params: { id: string };
  }>(
    '/api/v1/feed/comments/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: commentId } = request.params;

      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('comments')
          .select('author_id')
          .eq('id', commentId)
          .maybeSingle();

        if (fetchErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', fetchErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        if (!existing) {
          return sendApiError(reply, request, 404, 'Not Found', `Comment ${commentId} not found`, {
            code: 'NOT_FOUND',
          });
        }

        const isAuthor = existing.author_id === auth.userId;
        const isPrivileged = ['admin', 'moderator'].includes(auth.role);
        if (!isAuthor && !isPrivileged) {
          return sendApiError(
            reply,
            request,
            403,
            'Forbidden',
            'Only author or moderator may delete this comment',
            {
              code: 'FORBIDDEN',
            },
          );
        }

        const { error: deleteErr } = await supabase
          .from('comments')
          .update({ is_deleted: true, content: '[Deleted]' })
          .eq('id', commentId);

        if (deleteErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', deleteErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, id: commentId });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error deleting comment',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 9. POST /api/v1/feed/comments/:id/react — React to comment
   */
  app.post<{
    Params: { id: string };
    Body: { type: string; userId?: string };
  }>(
    '/api/v1/feed/comments/:id/react',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: commentId } = request.params;
      const { type: reactionType } = request.body;

      try {
        const { error: upsertErr } = await supabase
          .from('reactions')
          .upsert(
            { comment_id: commentId, user_id: auth.userId, type: reactionType },
            { onConflict: 'user_id,comment_id' },
          );

        if (upsertErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', upsertErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, commentId, reaction: reactionType });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error recording reaction',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 10. DELETE /api/v1/feed/comments/:id/react — Remove comment reaction
   */
  app.delete<{
    Params: { id: string };
    Body?: { userId?: string };
  }>(
    '/api/v1/feed/comments/:id/react',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: commentId } = request.params;

      try {
        const { error: deleteErr } = await supabase
          .from('reactions')
          .delete()
          .match({ comment_id: commentId, user_id: auth.userId });

        if (deleteErr) {
          return sendApiError(reply, request, 500, 'Internal Server Error', deleteErr.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, commentId });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error removing reaction',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );
}
