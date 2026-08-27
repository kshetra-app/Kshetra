import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { FeatureFlags } from './pages/FeatureFlags';
import { Moderation } from './pages/Moderation';
import { RepresentativeEdits } from './pages/RepresentativeEdits';
import { Constituencies } from './pages/Constituencies';
import { Representatives } from './pages/Representatives';
import { BulkImport } from './pages/BulkImport';
import { Verifications } from './pages/Verifications';
import { CivicIssues } from './pages/CivicIssues';
import { Delimitation } from './pages/Delimitation';
import { SystemHealth } from './pages/SystemHealth';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="feature-flags" element={<FeatureFlags />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="representative-edits" element={<RepresentativeEdits />} />
          <Route path="constituencies" element={<Constituencies />} />
          <Route path="representatives" element={<Representatives />} />
          <Route path="bulk-import" element={<BulkImport />} />
          <Route path="verifications" element={<Verifications />} />
          <Route path="civic-issues" element={<CivicIssues />} />
          <Route path="delimitation" element={<Delimitation />} />
          <Route path="system-health" element={<SystemHealth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
