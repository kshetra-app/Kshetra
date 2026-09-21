/**
 * W011 Mobile Mutations & Synchronization Verification Suite
 *
 * Verifies:
 * 1. Absence of deceptive synthetic IDs (local-*, pe-*, short-user-*, cmt-*, anon-endorser-*)
 * 2. Presence and validity of canonical 4-state synchronization lifecycle (SYNCING, SYNCED, QUEUED, FAILED)
 * 3. Offline sync queue handles add_comment and feeds into dataService
 * 4. DM endpoints use canonical apiClient and avoid hardcoded URLs
 */

import * as fs from 'fs';
import * as path from 'path';

describe('W011 Mobile Mutations & Lifecycle Audit', () => {
  const mobileRoot = path.resolve(__dirname, '..');

  describe('W011-B2: Elimination of Synthetic Entity Identifiers', () => {
    it('verifies zero synthetic ID patterns in ComposeSheet.tsx', () => {
      const composeSheet = fs.readFileSync(path.join(mobileRoot, 'components/ComposeSheet.tsx'), 'utf-8');
      expect(composeSheet).not.toMatch(/local-\$\{Date\.now\(\)\}/);
      expect(composeSheet).not.toMatch(/poll-local-\$\{Date\.now\(\)\}/);
      expect(composeSheet).not.toMatch(/opt-local-\$\{Date\.now\(\)\}/);
      expect(composeSheet).toContain('clientToken');
      expect(composeSheet).toContain("syncStatus: 'SYNCING'");
    });

    it('verifies zero synthetic ID patterns in PostDetailModal.tsx', () => {
      const postDetail = fs.readFileSync(path.join(mobileRoot, 'components/PostDetailModal.tsx'), 'utf-8');
      expect(postDetail).not.toMatch(/local-c-\$\{Date\.now\(\)\}/);
      expect(postDetail).toContain('clientToken');
      expect(postDetail).toContain("syncStatus: 'SYNCING'");
    });

    it('verifies zero synthetic ID patterns in ReportIssueSheet.tsx', () => {
      const reportSheet = fs.readFileSync(path.join(mobileRoot, 'components/ReportIssueSheet.tsx'), 'utf-8');
      expect(reportSheet).not.toMatch(/issue-local-\$\{Date\.now\(\)\}/);
      expect(reportSheet).toContain('clientToken');
      expect(reportSheet).toContain("syncStatus: 'SYNCING'");
    });

    it('verifies zero synthetic anon fallback in RegisterAspirantModal.tsx', () => {
      const regModal = fs.readFileSync(path.join(mobileRoot, 'components/RegisterAspirantModal.tsx'), 'utf-8');
      expect(regModal).not.toMatch(/me-\$\{Date\.now\(\)\}/);
    });

    it('verifies zero synthetic ID patterns in stores', () => {
      const promisesStore = fs.readFileSync(path.join(mobileRoot, 'stores/promises.ts'), 'utf-8');
      expect(promisesStore).not.toMatch(/pe-\$\{Date\.now\(\)\}/);

      const shortsStore = fs.readFileSync(path.join(mobileRoot, 'stores/politicalShorts.ts'), 'utf-8');
      expect(shortsStore).not.toMatch(/short-user-\$\{Date\.now\(\)\}/);

      const aspirantStore = fs.readFileSync(path.join(mobileRoot, 'stores/aspirant.ts'), 'utf-8');
      expect(aspirantStore).not.toMatch(/anon-endorser-\$\{Date\.now\(\)\}/);

      const civicStore = fs.readFileSync(path.join(mobileRoot, 'stores/civic.ts'), 'utf-8');
      expect(civicStore).not.toMatch(/cmt-\$\{Date\.now\(\)\}/);
    });
  });

  describe('W011-B3: Canonical Four-State Synchronization Lifecycle', () => {
    it('verifies SyncStatus type is exported with all 4 states', () => {
      const offlineSync = fs.readFileSync(path.join(mobileRoot, 'lib/offlineSync.ts'), 'utf-8');
      expect(offlineSync).toContain("export type SyncStatus = 'FAILED' | 'QUEUED' | 'SYNCING' | 'SYNCED'");
    });

    it('verifies offlineSync handles add_comment mutation operation', () => {
      const offlineSync = fs.readFileSync(path.join(mobileRoot, 'lib/offlineSync.ts'), 'utf-8');
      expect(offlineSync).toContain("case 'add_comment':");
      expect(offlineSync).toContain('svc.addPostComment');
    });

    it('verifies entity type definitions include syncStatus and clientToken', () => {
      const feedTypes = fs.readFileSync(path.join(mobileRoot, 'lib/feedTypes.ts'), 'utf-8');
      expect(feedTypes).toContain("syncStatus?: 'FAILED' | 'QUEUED' | 'SYNCING' | 'SYNCED'");
      expect(feedTypes).toContain('clientToken?: string');

      const civicTypes = fs.readFileSync(path.join(mobileRoot, 'lib/civicTypes.ts'), 'utf-8');
      expect(civicTypes).toContain("syncStatus?: 'FAILED' | 'QUEUED' | 'SYNCING' | 'SYNCED'");
      expect(civicTypes).toContain('clientToken?: string');

      const promiseTypes = fs.readFileSync(path.join(mobileRoot, 'lib/promiseTypes.ts'), 'utf-8');
      expect(promiseTypes).toContain("syncStatus?: 'FAILED' | 'QUEUED' | 'SYNCING' | 'SYNCED'");
      expect(promiseTypes).toContain('clientToken?: string');
    });
  });

  describe('W011-B4: Canonical API Client Routing & Moderation Seam', () => {
    it('verifies DM functions in supabaseDataService use apiClient and no hardcoded railway production URLs', () => {
      const dataSvc = fs.readFileSync(path.join(mobileRoot, 'lib/supabaseDataService.ts'), 'utf-8');
      expect(dataSvc).not.toContain('https://kshetra-production.up.railway.app/api/v1/dm');
      expect(dataSvc).toContain("`/api/v1/dm/conversations/${conversationId}/messages`");
      expect(dataSvc).toContain("`/api/v1/dm/conversations/${conversationId}/accept`");
      expect(dataSvc).toContain("`/api/v1/dm/conversations/${conversationId}/decline`");
      expect(dataSvc).toContain("`/api/v1/dm/block-report`");
      expect(dataSvc).toContain("`/api/v1/dm/unread-count`");
    });

    it('verifies moderation check fails closed in non-test runtime when service is unreachable', () => {
      const dataSvc = fs.readFileSync(path.join(mobileRoot, 'lib/supabaseDataService.ts'), 'utf-8');
      expect(dataSvc).toContain("return { flagged: true, reason: 'Moderation service unavailable' };");
      expect(dataSvc).toContain("return { flagged: true, reason: 'Moderation service unreachable' };");
    });
  });
});
