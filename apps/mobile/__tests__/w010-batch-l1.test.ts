import fs from 'fs';
import path from 'path';
import {
  isValidUuid,
  uploadShort,
  approveShort,
  flagShort,
  incrementShortView,
  addShortComment,
} from '../lib/supabaseDataService';

describe('W010 BATCH L1 — DEF-001 & DEF-007 VERIFICATION', () => {
  jest.setTimeout(15000);
  const rootAppDir = path.resolve(__dirname, '..');

  describe('DEF-001: Mobile Route De-duplication & Canonical Preservation', () => {
    it('verifies that deprecated duplicate routes have been permanently eliminated', () => {
      const duplicateRoutes = [
        path.join(rootAppDir, 'app/user/[id].tsx'),
        path.join(rootAppDir, 'app/auth/edit-profile.tsx'),
        path.join(rootAppDir, 'app/auth/onboarding.tsx'),
      ];

      for (const routePath of duplicateRoutes) {
        expect(fs.existsSync(routePath)).toBe(false);
      }
    });

    it('verifies that canonical routes are preserved on disk', () => {
      const canonicalRoutes = [
        path.join(rootAppDir, 'app/user/[userId].tsx'),
        path.join(rootAppDir, 'app/edit-profile.tsx'),
        path.join(rootAppDir, 'app/onboarding.tsx'),
      ];

      for (const routePath of canonicalRoutes) {
        expect(fs.existsSync(routePath)).toBe(true);
      }
    });

    it('verifies profile.tsx references the canonical /edit-profile route', () => {
      const profilePath = path.join(rootAppDir, 'app/(tabs)/profile.tsx');
      const content = fs.readFileSync(profilePath, 'utf8');

      expect(content).not.toContain("'/auth/edit-profile'");
      expect(content).toContain("'/edit-profile'");
    });

    it('verifies _layout.tsx registers canonical routes with zero collisions', () => {
      const layoutPath = path.join(rootAppDir, 'app/_layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf8');

      expect(content).toContain('name="edit-profile"');
      expect(content).toContain('name="onboarding"');
      expect(content).toContain('name="user/[userId]"');
      expect(content).not.toContain('name="user/[id]"');
      expect(content).not.toContain('name="auth/edit-profile"');
      expect(content).not.toContain('name="auth/onboarding"');
    });
  });

  describe('DEF-007: Authoritative UUID Validation & Fail-Closed Shorts Persistence', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const invalidIds = [
      'local-short-1726900000',
      'local-cmt-1726900000',
      'short-ts-001',
      'invalid-uuid',
      '123e4567-e89b-12d3-a456',
      '',
    ];

    it('validates UUIDs strictly via isValidUuid', () => {
      expect(isValidUuid(validUuid)).toBe(true);
      for (const id of invalidIds) {
        expect(isValidUuid(id)).toBe(false);
      }
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);
    });

    it('uploadShort reports an unavailable backend without inventing a persisted short ID', async () => {
      const res = await uploadShort({
        title: 'Test Short',
        videoUrl: 'https://youtube.com/embed/test',
        stateCode: 'TS',
        duration: 30,
      });

      expect(res).toEqual({ id: null, success: false });
    });

    it('approveShort rejects non-UUID shortId and userId with false', async () => {
      const res1 = await approveShort('short-ts-001', validUuid);
      expect(res1).toBe(false);

      const res2 = await approveShort(validUuid, 'local-user-123');
      expect(res2).toBe(false);
    });

    it('flagShort rejects non-UUID shortId and userId with false', async () => {
      const res1 = await flagShort('short-ts-001', validUuid, 'spam');
      expect(res1).toBe(false);

      const res2 = await flagShort(validUuid, 'not-a-uuid', 'spam');
      expect(res2).toBe(false);
    });

    it('incrementShortView rejects non-UUID shortId with false', async () => {
      const res = await incrementShortView('short-ts-001');
      expect(res).toBe(false);
    });

    it('addShortComment rejects an invalid short ID or empty content without reporting a false save', async () => {
      await expect(addShortComment('short-ts-001', 'Great video!')).rejects.toThrow(
        'A valid published short is required to comment.',
      );
      await expect(addShortComment(validUuid, '   ')).rejects.toThrow(
        'Comments must be between 1 and 500 characters.',
      );
    });
  });
});
