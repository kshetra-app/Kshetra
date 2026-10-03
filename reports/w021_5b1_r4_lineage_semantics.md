# W021.5-B1-R4: CONSTITUENCY VERSION VS. LINEAGE SEMANTICS DOSSIER

**Milestone:** W021.5-B1-R4 — Final Source Integrity, Canonical Coverage & Lineage Semantics Closure  
**Generated At:** 2026-10-03T06:09:25.186Z  
**Target Table:** `public.constituency_lineage`  
**Current Row Count:** **0 Rows (Semantically Correct)**  

---

## 1. Architectural Definitions

To prevent conflation of spatial and temporal concepts:
1. **Constituency (`public.constituencies`):** The persistent canonical electoral seat identity. It retains its identity and UUID across delimitation regimes.
2. **Constituency Version (`public.constituency_versions`):** The statutory territorial representation of that seat during a specific delimitation regime and time period ($[valid_from, valid_to)$).
3. **Constituency Lineage (`public.constituency_lineage`):** A directed acyclic relationship linking a predecessor version (`source_constituency_version_id`) to a successor version (`target_constituency_version_id`) when territorial boundaries change through split, merger, renaming, renumbering, or reconstitution.

---

## 2. Why Zero Lineage Rows is Semantically Correct at Milestone B1

In strict conformance with CTO Directive Section B3:
> *"If the existing canonical model does not yet have sufficient historical constituency-version records to establish a legitimate lineage relationship, **do not fabricate lineage rows simply to make the table non-empty**... A zero-row lineage table is acceptable only if the report demonstrates why zero rows are semantically correct at this stage."*

In Milestone W021.5-B1 (Migration 059), only the **current statutory baseline version** of each constituency was ingested (1 version per AC). Lineage represents a relationship between **two distinct versions** of a constituency across delimitation boundaries. Since predecessor version records (e.g. 1976 Delimitation Order records) do not yet exist in `public.constituency_versions`, inserting lineage records would require referencing phantom or non-existent version UUIDs, which would violate foreign key constraints.

---

## 3. Delimitation & Reorganisation Scenarios Evaluation

| Scenario | Territorial Identity Preserved? | Lineage Required? | Status | Reason & Next Stage Dependency |
| :--- | :---: | :---: | :---: | :--- |
| **2008 Delimitation** | No | No | `NOT_YET_MODELED` | Pre-2008 (1976) versions not ingested in B1. Requires 1976 version backfill. |
| **2014 AP/TS Reorganisation** | Yes | No | `NOT_YET_MODELED` | Boundaries unchanged; intact 2008 seats partitioned between states. Captured at state level. |
| **2019 DNH-DD Merger** | Yes | No | `NOT_YET_MODELED` | Non-assembly UTs (0 ACs). PC boundaries retained intact. |
| **2022 J&K Delimitation** | No | No | `NOT_YET_MODELED` | Pre-2019 J&K state versions (87 seats) not ingested in B1. Requires pre-2019 version backfill. |
| **2023 Assam Delimitation** | No | No | `NOT_YET_MODELED` | 2023 version geometries will be ingested during the upcoming geospatial boundary phase. |

---

## 4. Lineage Constraint Integrity

The schema enforces strict database-level safeguards:
- `source_constituency_version_id` and `target_constituency_version_id` must reference valid versions (`ON DELETE RESTRICT`).
- `relationship_type` restricted to controlled enum: `CONTINUES_AS`, `RENAMED_AS`, `RENUMBERED_AS`, `REPLACED_BY`, `SPLIT_INTO`, `MERGED_INTO`, `ABOLISHED`.
- Unique constraint: `uq_constituency_lineage UNIQUE (source_constituency_version_id, target_constituency_version_id, relationship_type, effective_date)`.
- Zero orphan rows, zero self-links, zero cycles.
