import fs from 'fs';
import path from 'path';

describe('W010 BATCH L3 — DEF-002 VERIFICATION', () => {
  const rootAppDir = path.resolve(__dirname, '..');
  const servicePath = path.join(rootAppDir, 'lib/supabaseDataService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');

  describe('DEF-002: Bounded Deceptive Fallback Elimination', () => {
    it('verifies that zero deceptive `if (!guard()) return true;` lines exist in supabaseDataService.ts', () => {
      const match = content.match(/if \(!guard\(\)\) return true;/g);
      expect(match).toBeNull();
    });

    it('verifies that zero synthetic `local-` ID generators exist in supabaseDataService.ts', () => {
      const match = content.match(/`local-[^`]+`/g);
      expect(match).toBeNull();
    });

    it('verifies all write mutations fail closed with honest error states when guard() is false', () => {
      // Guarded mutations must return false or { id: null, success: false }
      const lines = content.split('\n');
      const guardedReturns: string[] = [];

      lines.forEach((line) => {
        if (line.includes('if (!guard()) return')) {
          guardedReturns.push(line.trim());
        }
      });

      expect(guardedReturns.length).toBeGreaterThan(30);

      // Verify each guarded return is fail-closed
      for (const gr of guardedReturns) {
        const isFailClosed =
          gr === 'if (!guard()) return false;' ||
          gr === 'if (!guard()) return { id: null, success: false };' ||
          gr === 'if (!guard()) return null;' ||
          gr === 'if (!guard()) return [];' ||
          gr === 'if (!guard()) return 0;' ||
          gr === 'if (!guard()) return;';
        expect(isFailClosed).toBe(true);
      }
    });

    it('verifies key methods (composePost, addPostComment, registerAspirant, submitKYC) return { id: null, success: false } when offline/unconfigured', async () => {
      const svc = require('../lib/supabaseDataService');

      // When unconfigured (guard returns false in test environment)
      const postRes = await svc.composePost({
        content: 'Test post',
        type: 'discussion',
        stateCode: 'TS',
        authorId: '00000000-0000-0000-0000-000000000001',
      });
      expect(postRes).toEqual({ id: null, success: false });

      const commentRes = await svc.addPostComment('post-1', 'user-1', 'Test comment');
      expect(commentRes).toEqual({ id: null, success: false });

      const aspirantRes = await svc.registerAspirant('user-1', {
        displayName: 'Test Aspirant',
        stateCode: 'TS',
      });
      expect(aspirantRes).toEqual({ id: null, success: false });

      const kycRes = await svc.submitKYC('user-1', {
        fullLegalName: 'Test Name',
        phoneNumber: '9848012345',
      });
      expect(kycRes).toEqual({ id: null, success: false });
    });

    it('verifies boolean mutation methods return false when offline/unconfigured', async () => {
      const svc = require('../lib/supabaseDataService');

      expect(await svc.reactToPost('post-1', 'user-1', 'like')).toBe(false);
      expect(await svc.removeReaction('post-1', 'user-1')).toBe(false);
      expect(await svc.editPost('post-1', 'new content', 'user-1')).toBe(false);
      expect(await svc.deletePost('post-1', 'user-1')).toBe(false);
      expect(await svc.votePoll('post-1', 'opt-1', 'user-1')).toBe(false);
      expect(await svc.followPromise('promise-1', 'user-1', true)).toBe(false);
      expect(await svc.tagMLAOnIssue('issue-1')).toBe(false);
      expect(await svc.disputeIssueResolution('issue-1', 'reason', 'user-1')).toBe(false);
    });
  });
});
