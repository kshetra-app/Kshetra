# CTO DIRECTIVE — W022 IMPLEMENTATION AUTHORIZATION AND GOVERNANCE RECONCILIATION

**Directive ID:** W022-CTO-IMPLEMENTATION-AUTH-002  
**Issued:** 2026-10-25  
**Authority:** Explicit user instruction in the active ChatGPT session, acting as project owner and final human authority  
**Status:** APPROVED — PROSPECTIVE IMPLEMENTATION AUTHORIZATION  
**Plan:** PLAN-W022-REV-1.0.md, Revision 3, subject to the scope and controls below  
**Production:** STRICTLY AIR-GAPPED  
**Staging database execution / deployment:** NOT AUTHORIZED by this directive alone

## 1. Decision

The project owner explicitly directs that W022 be changed from planning-only status to implementation-permitted status so work may proceed further.

This directive authorizes prospective W022 implementation and remediation work from the commit containing this directive onward, within the approved W022 scope and subject to all acceptance, security, privacy, evidence, and environment controls below. It is not self-executing for production or staging database operations.

## 2. Existing implementation and historical truth

The existing implementation commit is:

- `3ac3f1c0c14d51d60bab9f9d3e88a08716466124`

Its existence predates this directive. This directive does not backdate authorization, rewrite history, or falsely claim that the directive is an ancestor of that implementation commit. The historical authorization question for that commit must remain accurately recorded and reconciled through an auditable governance decision.

The current W022 implementation is therefore **EXISTING IMPLEMENTATION — NOT YET INDEPENDENTLY ACCEPTED**. It may be inspected, tested, corrected, and advanced prospectively under this directive. It must not be represented as production-ready or accepted merely because code and tests exist.

## 3. Authorized scope

Permitted prospectively:
- W022 outbound webhook/event dispatch implementation within the exact files and architectural boundaries defined by the W022 plan.
- Security hardening, correctness fixes, persistence/queue reliability, test additions, evidence generation, and governance reconciliation directly required to complete W022.
- Local isolated test execution and source/build verification.
- Updates to W022 plan metadata, execution coordinates, decision/defect/acceptance records, and release records that truthfully reflect this directive and preserve the historical record.
- Governance CI/test remediation needed to enforce authorization for future changes.

Not permitted without a separate explicit environment-specific authorization:
- Any production access, query, mutation, deployment, secret rotation, or release activation.
- Any staging database migration execution or mutation.
- Activation of external webhook delivery against real tenants or third-party endpoints.
- Claiming staging or production runtime verification without fresh evidence from that environment.
- Scope expansion beyond W022 or unrelated feature work.

## 4. Mandatory controls

1. Keep production strictly air-gapped.
2. Treat staging database execution as blocked pending a separate explicit execution token.
3. Verify anti-SSRF behavior, DNS rebinding defenses, cryptographic signatures, secret handling, tenant isolation, idempotency, retry limits, queue recovery, payload privacy, retention/purge controls, and migration integrity before any environment execution request.
4. Use isolated local PostgreSQL where database runtime verification is needed.
5. Preserve exact execution, verification, and evidence commit coordinates. Evidence must be regenerated after relevant source changes.
6. Do not self-accept W022. Independent verification and formal acceptance remain separate lifecycle stages.
7. Record the historical implementation/authorization mismatch honestly. Prospective authorization does not convert a later directive into an ancestor of the historical implementation commit.

## 5. Required register reconciliation

After this directive is committed, update the W022 plan and continuity registers to:
- record this directive as prospective authorization for continued W022 work;
- set the current W022 plan status to approved for implementation within the stated scope;
- record the directive commit SHA as the authorization coordinate for subsequent work;
- retain the historical implementation commit as a separate coordinate;
- record W022 as implementation present / further implementation permitted / independent verification and acceptance pending;
- keep staging execution and production release unauthorized.

Do not modify unrelated historical milestone entries. Do not claim a migration was applied or a release occurred unless independently evidenced.

## 6. Closure criteria

GOV-01 may close only after:
- the authorization directive and plan/register coordinates agree;
- the historical authorization discrepancy is explicitly preserved and adjudicated;
- governance CI rejects missing, invalid, mismatched, or non-ancestor authorization for future implementation commits;
- positive and negative governance tests pass on the exact recorded commit;
- W022's technical tests and independent security review pass;
- staging and production boundaries remain unviolated.

**Directive outcome:** W022 implementation is permitted to proceed prospectively within this directive. Staging database execution and production access remain prohibited pending separate authorization.
