# W021.5 Stage B — Expanded Legal Evidence Retrieval Attempt (2026-10-26)

**Authority:** CTO Directive 154 — Stage B only  
**Disposition:** Additional legal-source routes discovered and registered; exact-byte acquisition remains incomplete  
**Acceptance:** PARTIAL / NOT ACCEPTED  
**Safety:** No access-control bypass, no inferred polygons, no staging/production database access.

## 1. What was attempted in this pass

This pass expanded beyond the previous IndiaCode URL retry by searching the exact legal instrument and notification identifiers, reviewing official ECI publication listings, identifying the state-Gazette counterpart route, and locating an independent judicial text reproduction.

### New findings

1. **ECI Delimitation Order, 2008 — official PDF indexed text found.** The official ECI PDF URL is https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf. Search indexing exposes the order's text and schedule structure. Direct page retrieval still returned HTTP 406 in this session; raw PDF bytes and SHA-256 were NOT acquired here.
2. **ECI Notification 282/AP/2018(DEL) — indexed text found.** Search indexing exposes the notification heading/date and substantive text, including its relationship to the AP Reorganisation Act and the 2008 order. The original ECI endpoint still returns HTTP 406 in the automated acquisition environment. Search-indexed text is not the original notification/Gazette file and does not close EB-01/EB-02.
3. **Independent judicial context located.** A searchable reproduction of the Telangana High Court decision in *Marri Shasidhar Reddy v. Election Commission of India* (16 November 2018) states that the notification amended extents of 53-Rampachodavaram (ST) and 67-Polavaram (ST) in Andhra Pradesh, and did not alter Telangana AC names/extents. This is useful legal-context corroboration, not polygon evidence and not a certified judgment copy.
4. **Official Andhra Pradesh e-Gazette portal identified.** https://apegazette.cgg.gov.in/ is a likely custodian route for the Andhra Pradesh State Gazette counterpart named in the notification. The exact extraordinary issue/document and raw PDF bytes have not been acquired.
5. **Official Telangana Gazette custodian page identified.** https://www.telangana.gov.in/gazette/ documents the state's Gazette publication service. It is a custodian lead only; do not assume it is the correct Gazette for this notification, which names the Gazette of India and Andhra Pradesh State Gazette.

## 2. Controlled acquisition automation expanded

On the authorized evidence-only branch cto/w0215-stage-b-evidence-20261025, commit 51b6c87ff17e47f34401d4f90cd1dc34823e1495 expands scripts/acquire_w0215_legal_crosswalk_sources.py with:
- exact IndiaCode-hosted 2008-order URL variants already discovered in source references;
- the exact ECI-hosted 2008-order PDF URL;
- official ECI publications and delimitation landing pages as link-discovery inputs;
- the official Andhra Pradesh e-Gazette portal and Government of Telangana Gazette information page;
- the judicial text reproduction as clearly labelled secondary legal context.

The existing workflow .github/workflows/w0215-legal-crosswalk-source-probe.yml is configured for pushes to this evidence-only branch when the script changes. At the time this report was written, the GitHub connector did not expose a run or status for this exact commit, so **the expanded acquisition workflow result is unverified**. Do not claim the new probe ran or that any new raw document bytes were acquired because of this code change. Recheck the Actions run and its artifact before updating the evidence status.

## 3. Artifact-level reinspection

The prior legal-crosswalk artifact from run 40260777545 was downloaded and inspected locally. Its ZIP contains:
- AP Reorganisation Act 2014 raw candidate bytes: 231,596 bytes;
- PIB official HTML source bytes: 1,211,607 and 1,212,709 bytes;
- TGRAC geometry candidate bytes and the statutory-to-GIS crosswalk.

This confirms the previously recorded AP Act/PIB evidence exists in that artifact. It does not provide the missing original 2008-order PDF, ECI 2018 notification PDF, or certified Gazette issue. The artifact is not being misrepresented as containing those documents.

## 4. Register updates

The master source register now has 40 records. Five new records explicitly classify:
- indexed official ECI 2008-order text (raw bytes not acquired);
- indexed official ECI 2018-notification text (raw bytes not acquired);
- the judicial text reproduction (secondary context only);
- the official Andhra Pradesh e-Gazette portal (exact issue not acquired);
- the Government of Telangana Gazette custodian page (discovery only).

All five new records have null SHA-256 and null file byte counts because no raw source file was acquired for them. Source register update commit: 6b17fd8d00dc0150b491b644f416ec34167d59b2.

## 5. Next acquisition route

1. Inspect the run and artifact generated by the updated branch workflow. If no run exists, trigger it through an authorized GitHub Actions workflow-dispatch route or a new push to the authorized evidence branch.
2. For each candidate, accept bytes only when the response is successful, content is a valid PDF, the original bytes are retained, and SHA-256/page count are recorded.
3. Search the Andhra Pradesh e-Gazette portal by publication date 22 September 2018 and notification number 282/AP/2018(DEL); record exact issue number, part/section, page range and raw PDF hash if found.
4. If the original bytes remain blocked or the Gazette issue cannot be found, submit the prepared custodian request for a certified copy/inspection. Record submission timestamp, channel, acknowledgement number and exact response bytes; until actually sent, request status remains DRAFTED_NOT_SENT.
5. Continue separate official jurisdictional GIS acquisition and legal extent-to-polygon validation. Do not treat a successful name crosswalk or court text as polygon acceptance.

## 6. Unchanged acceptance boundary

- No canonical national AC geometry accepted.
- EB-01..EB-05 and W021.5-B1-04 remain OPEN.
- EB-06 remains pending independent adjudication.
- Stage C is not authorized.
- No staging/production database access or mutation.
- Production remains air-gapped.
