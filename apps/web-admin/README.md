# Kshetra Web Admin & Master Governance Portal (`@kshetra/web-admin`)

A dedicated, standalone desktop web admin portal built with **React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, MapLibre GL, and TanStack Table**.

---

## Features

- **Executive Dashboard**: Real-time KPI cards, active live broadcast monitoring, and system metrics.
- **Feature Flags & Kill Switches**: Full reactive control over all 17 feature areas across mobile and API ecosystems with live Railway sync.
- **Trust & Safety Command Center**: Content moderation, reporter penalty controls, and stream buffer triage.
- **Politician Profile Edits Review**: Crowd-sourced `representative_edits` triage with side-by-side visual diff inspector.
- **Master Data & Spatial Map Explorer**: Filter 4,123+ constituencies with interactive PostGIS MapLibre boundary inspector.
- **Politician Dossier Editor**: Search and manage MLAs, MPs, and candidate profiles.
- **Bulk CSV / Excel Data Ingestion**: Drag-and-drop `.csv` or `.xlsx` files with instant schema parsing.
- **Identity & KYC Approval Queue**: Review citizen voter ID and politician verification requests.
- **Civic Grievances Console**: Municipal issue tracking and department escalation.
- **Delimitation Simulator**: 2026+ Lok Sabha reapportionment and seat distribution modeler.
- **System Health & Telemetry**: Railway API gateway, PostGIS database, and media server diagnostics.

---

## Running Locally

From the root directory:
```bash
npm run dev:admin
```
Or directly from `apps/web-admin`:
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## Building for Production

```bash
npm run build:admin
```
The compiled, minified static assets will be in `apps/web-admin/dist`.

---

## Deployment

### Deploy to Vercel (1-Click)
1. Import your Git repository into Vercel.
2. Set **Root Directory** to `apps/web-admin`.
3. Set **Framework Preset** to `Vite`.
4. Deploy!

### Deploy to Railway (Docker)
1. Add a new service from your GitHub repo in your Railway project.
2. Set the Dockerfile path to `apps/web-admin/Dockerfile`.
3. Deploy!
