# Kshetra Web Admin & Master Governance Portal (`@kshetra/web-admin`)

A dedicated, standalone desktop web admin portal built with **React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, MapLibre GL, and TanStack Table**.

---

## Connected workflows

- **Operations dashboard**: API health and the feature-flag response. Other infrastructure and audience metrics remain unavailable until their source APIs are connected.
- **Feature flags**: Read and update flags through the API. Protected writes require an authorized server-side admin role.
- **Moderation**: Read the persisted moderation queue and submit supported decisions through authenticated API routes.
- **Civic issues**: Read returned civic issue records and submit status changes through the authenticated API.
- **Constituencies**: Browse states and constituency records returned by the configured API. This screen does not claim electorate totals or map-boundary coverage.
- **Delimitation scenarios**: Request model output from the existing API and display its calculation and input-source metadata. These are derived research scenarios, not official seat allocations; source records can report pending verification.
- **Dataset preview**: Parse a selected CSV/Excel file locally and inspect up to 50 records. No dataset import API or database write is connected.
- **System diagnostics**: Run real HTTP reachability checks against the configured API. These checks do not certify database, media, or client health.

Other admin screens may be limited or unavailable when their required persisted APIs are not connected. The presence of a screen does not imply that its underlying workflow is production-ready.

---

## Running Locally

Create `apps/web-admin/.env` from `.env.example` and set the API URL, Supabase project URL, and Supabase public anon key for the environment you intend to use. These values are required; the portal no longer silently falls back to a fixed production backend.

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

The production build requires `VITE_API_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` at build time. Configure them for the matching staging or production environment in Vercel or Railway before building. A missing value fails the build instead of producing assets aimed at a different backend.

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
4. Add the three required `VITE_*` variables for the selected Vercel environment.
5. Deploy.

### Deploy to Railway (Docker)
1. Add a new service from your GitHub repo in your Railway project.
2. Set the Dockerfile path to `apps/web-admin/Dockerfile`.
3. Set the three required `VITE_*` variables for the selected Railway environment before the image build.
4. Deploy.
