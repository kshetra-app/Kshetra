import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminCapabilityNotice } from './components/AdminCapabilityNotice';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const FeatureFlags = lazy(() => import('./pages/FeatureFlags').then((module) => ({ default: module.FeatureFlags })));
const Moderation = lazy(() => import('./pages/Moderation').then((module) => ({ default: module.Moderation })));
const PoliticalAdReview = lazy(() => import('./pages/PoliticalAdReview').then((module) => ({ default: module.PoliticalAdReview })));
const RepresentativeEdits = lazy(() => import('./pages/RepresentativeEdits').then((module) => ({ default: module.RepresentativeEdits })));
const Constituencies = lazy(() => import('./pages/Constituencies').then((module) => ({ default: module.Constituencies })));
const Representatives = lazy(() => import('./pages/Representatives').then((module) => ({ default: module.Representatives })));
const BulkImport = lazy(() => import('./pages/BulkImport').then((module) => ({ default: module.BulkImport })));
const Verifications = lazy(() => import('./pages/Verifications').then((module) => ({ default: module.Verifications })));
const CivicIssues = lazy(() => import('./pages/CivicIssues').then((module) => ({ default: module.CivicIssues })));
const Delimitation = lazy(() => import('./pages/Delimitation').then((module) => ({ default: module.Delimitation })));
const SystemHealth = lazy(() => import('./pages/SystemHealth').then((module) => ({ default: module.SystemHealth })));

function DemoAdminPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return import.meta.env.DEV
    ? <><AdminCapabilityNotice title={title} description={description} />{children}</>
    : <AdminCapabilityNotice title={title} description={description} />;
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading page…</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="feature-flags" element={<FeatureFlags />} />
            <Route path="moderation" element={<DemoAdminPage title="Moderation queue" description="A live moderation queue requires an authenticated report feed and persisted moderation decisions." ><Moderation /></DemoAdminPage>} />
            <Route path="political-ads" element={<PoliticalAdReview />} />
            <Route path="representative-edits" element={<DemoAdminPage title="Representative corrections" description="This queue needs a persisted, authenticated correction workflow before example records or decisions can be shown as live." ><RepresentativeEdits /></DemoAdminPage>} />
            <Route path="constituencies" element={<DemoAdminPage title="Constituency explorer" description="The live explorer requires verified, authoritative geography records and connected boundary geometry for the selected area." ><Constituencies /></DemoAdminPage>} />
            <Route path="representatives" element={<DemoAdminPage title="Representative directory" description="This management screen needs verified representative records and server-backed edits. The current example profiles are not a reliable live directory." ><Representatives /></DemoAdminPage>} />
            <Route path="bulk-import" element={<DemoAdminPage title="Bulk import" description="Imports must be validated, permission checked, previewed, and durably recorded before this screen can safely write data." ><BulkImport /></DemoAdminPage>} />
            <Route path="verifications" element={<DemoAdminPage title="Identity verification queue" description="A live verification workflow must securely store evidence, restrict access to sensitive documents, and persist reviewer decisions." ><Verifications /></DemoAdminPage>} />
            <Route path="civic-issues" element={<DemoAdminPage title="Civic issue console" description="This console needs to read and update issues through authenticated, persisted civic-service endpoints." ><CivicIssues /></DemoAdminPage>} />
            <Route path="delimitation" element={<DemoAdminPage title="Delimitation scenarios" description="The displayed projections are illustrative examples, not an official or verified model. A documented, reproducible data source and methodology are required before publishing them." ><Delimitation /></DemoAdminPage>} />
            <Route path="system-health" element={<SystemHealth />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
