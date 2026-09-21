# DEF-006 GEOGRAPHY CONTAMINATION GUARD & ROADMAP LINKAGE

```
DEFECT:             DEF-006 (Flat Geography Schema vs Versioned Delimitation Graph)
STATUS:             DOCUMENTED & QUARANTINED (DESTINATION: JOBS W013–W017)
DATE:               2026-09-21
TARGET REPOSITORY:  kshetra-app/Kshetra
BRANCH:             master
DESTINATION JOBS:   W013, W014, W015, W016, W017 (Delimitation Graph & Spatial Engine)
```

---

## 1. Context & Architectural Defect Statement

In the initial bootstrap migrations (`001_initial_schema.sql` through `004_civic_dashboard.sql`), administrative geography was modeled with flat static tables:
- `public.states` (code, name, capitals)
- `public.constituencies` (id, state_code, name, ac_no, type)
- `public.mandals` (id, constituency_id, name)

The **Master Technical Blueprint** mandates a **Versioned Delimitation Graph** with:
1. Temporal validity intervals (`valid_from`, `valid_until`).
2. Delimitation order lineage (1951, 1976, 2008, and projected post-2026 delimitation).
3. Topological parentage across non-coterminous administrative hierarchies (Lok Sabha PC, Vidhan Sabha AC, Revenue Mandal, Gram Panchayat, Polling Station/Booth).

DEF-006 was formally accepted by CTO directive as **DEFERRED — EXPLICIT FUTURE JOB / ACCEPTED DEPENDENCY** scheduled for execution in **Jobs W013 through W017**.

---

## 2. Active Flat Geography Consumer Inventory

The following components currently query the flat geography tables:

| Layer | Component / File | Purpose / Scope |
| :--- | :--- | :--- |
| **API Route** | `apps/api/src/routes/constituencies.ts` | Serves static list of 119 TS / AP / KA constituencies |
| **API Route** | `apps/api/src/routes/broadcast.ts` | Detailed standings mapped to seed constituency data |
| **API Service** | `apps/api/src/routes/ai.ts` | Electoral context injection for LLM prompts |
| **Mobile Screen** | `apps/mobile/app/hierarchy/[id].tsx` | Static breadcrumb navigation (AC -> Mandal -> Panchayat) |
| **Mobile Screen** | `apps/mobile/app/local-bodies/index.tsx` | Administrative drill-down for local body representatives |
| **Mobile Client** | `apps/mobile/lib/aiService.ts` | PostgREST queries against `constituencies` |

---

## 3. Contamination Guard Rules (Active for W010–W012)

To prevent architectural entropy or schema drift before Jobs W013–W017 begin, the following contamination guards are strictly enforced:

1. **GUARD-GEO-1 (Zero Flat Column Mutations)**: No migration in Jobs W010–W012 may add ad-hoc demographic, temporal, or spatial columns to `public.constituencies` or `public.mandals`.
2. **GUARD-GEO-2 (Read-Only Consumption)**: All application features developed prior to W013 must consume flat geography tables strictly as immutable spatial lookups.
3. **GUARD-GEO-3 (FK Lockout)**: No new foreign key references to `public.constituencies.id` may be introduced that would impede migration to versioned delimitation entities.
4. **GUARD-GEO-4 (Dedicated Job Execution)**: All delimitation modeling, polygon topologies, TopoJSON boundaries, and historical redistricting graphs are strictly quarantined to Jobs W013–W017.

---

## 4. Master Jobs W013–W017 Mapping

- **Job W013**: Geographic Foundation & TopoJSON Topology Engine.
- **Job W014**: Delimitation Version Graph Schema & Temporal Validity Intervals (`valid_from`, `valid_until`).
- **Job W015**: Multi-Cycle Ingestion Engine (1951, 1976, 2008 Delimitation Orders & 2026 Projections).
- **Job W016**: Hierarchical Geo-Containment & Multi-Level Spatial Indexing (PostGIS / H3).
- **Job W017**: Spatial Query Gateway, Boundary Diff Engine, and Frontend Map Integration.
