/**
 * Typed, transport-safe provenance contract for critical facts.
 * Null means unknown; do not substitute 0 or an empty string.
 */
export const DATA_TRUTH_STATUSES = [
  'OFFICIAL', 'DERIVED', 'VERIFIED', 'ESTIMATE', 'SCENARIO', 'INFERRED', 'UNVERIFIED', 'UNKNOWN',
] as const;
export type DataTruthStatus = (typeof DATA_TRUTH_STATUSES)[number];

export interface TransformationStep {
  name: string;
  version: string;
  performedAt: string | null;
  inputDatasetVersion?: string | null;
  outputDatasetVersion?: string | null;
  notes?: string | null;
}
export interface FactProvenance {
  source: { id: string; name: string; url: string | null } | null;
  retrievedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  version: string | null;
  status: DataTruthStatus;
  valueStatus: DataTruthStatus;
  transformationHistory: TransformationStep[];
  missingReason?: 'NOT_PROVIDED' | 'NOT_APPLICABLE' | 'NOT_VERIFIED' | 'SOURCE_UNAVAILABLE' | 'UNKNOWN';
}
export interface ProvenancedFact<T> {
  value: T | null;
  provenance: FactProvenance;
}
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;
function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function validDate(value: unknown): value is string {
  return nonEmpty(value) && ISO_DATE.test(value) && Number.isFinite(Date.parse(value));
}
export function formatFactValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
    ? 'Not available'
    : String(value);
}
export function validateProvenancedFact<T>(
  fact: ProvenancedFact<T>,
  options: { allowUnknownSource?: boolean } = {},
): string[] {
  const issues: string[] = [];
  const p = fact?.provenance;
  if (!p || typeof p !== 'object') return ['provenance: missing'];
  if (!p.source && !(options.allowUnknownSource && p.status === 'UNKNOWN')) issues.push('source: missing');
  else if (p.source && (!nonEmpty(p.source.id) || !nonEmpty(p.source.name) ||
    (p.source.url !== null && !nonEmpty(p.source.url)))) issues.push('source: invalid id/name/url');
  if (p.retrievedAt !== null && !validDate(p.retrievedAt)) issues.push('retrievedAt: invalid ISO date');
  if (p.effectiveFrom !== null && !validDate(p.effectiveFrom)) issues.push('effectiveFrom: invalid ISO date');
  if (p.effectiveTo !== null && !validDate(p.effectiveTo)) issues.push('effectiveTo: invalid ISO date');
  if (p.effectiveFrom && p.effectiveTo && Date.parse(p.effectiveTo) < Date.parse(p.effectiveFrom)) {
    issues.push('effective-date conflict: effectiveTo precedes effectiveFrom');
  }
  if (!nonEmpty(p.version)) issues.push('version: missing');
  if (!(DATA_TRUTH_STATUSES as readonly string[]).includes(p.status)) issues.push('status: invalid');
  if (!(DATA_TRUTH_STATUSES as readonly string[]).includes(p.valueStatus)) issues.push('valueStatus: invalid');
  if (!Array.isArray(p.transformationHistory)) issues.push('transformationHistory: missing');
  else {
    p.transformationHistory.forEach((step, i) => {
      if (!nonEmpty(step?.name) || !nonEmpty(step?.version)) issues.push(`transformationHistory[${i}]: name/version missing`);
      if (step?.performedAt !== null && step?.performedAt !== undefined && !validDate(step.performedAt)) {
        issues.push(`transformationHistory[${i}]: performedAt invalid`);
      }
    });
  }
  if (['ESTIMATE', 'SCENARIO'].includes(p.status) || ['ESTIMATE', 'SCENARIO'].includes(p.valueStatus)) {
    if (!Array.isArray(p.transformationHistory) || !p.transformationHistory.some(step => nonEmpty(step?.name) && nonEmpty(step?.version))) {
      issues.push('estimate/scenario: transformation history must be labelled');
    }
  }
  if (fact.value === null && !p.missingReason) issues.push('missing value: missingReason required');
  if (typeof fact.value === 'number' && !Number.isFinite(fact.value)) issues.push('value: numeric value must be finite');
  if (['UNKNOWN', 'UNVERIFIED'].includes(p.status) || ['UNKNOWN', 'UNVERIFIED'].includes(p.valueStatus)) {
    if (fact.value !== null) issues.push('value/status conflict: unknown or unverified facts must not assert a concrete value');
  }
  return issues;
}
export function assertDatasetProvenance(
  rows: Array<{ id?: unknown; stateCode?: unknown; acNo?: unknown; facts: Record<string, ProvenancedFact<unknown>> }>,
): void {
  const issues: string[] = [];
  const seen = new Set<string>();
  rows.forEach((row, rowIndex) => {
    if (!nonEmpty(row.id)) issues.push(`row[${rowIndex}]: id missing`);
    else if (seen.has(row.id)) issues.push(`row[${rowIndex}]: duplicate id ${row.id}`);
    else seen.add(row.id);
    if (!nonEmpty(row.stateCode) || !/^[A-Z]{2}$/.test(row.stateCode)) issues.push(`row[${rowIndex}]: invalid stateCode`);
    if (row.acNo !== undefined && (!Number.isInteger(row.acNo) || (row.acNo as number) < 1)) issues.push(`row[${rowIndex}]: invalid constituency ID/acNo`);
    if (!row.facts || typeof row.facts !== 'object' || Object.keys(row.facts).length === 0) issues.push(`row[${rowIndex}]: facts missing`);
    else {
      for (const [field, fact] of Object.entries(row.facts)) {
        validateProvenancedFact(fact).forEach(issue => issues.push(`row[${rowIndex}].${field}: ${issue}`));
      }
    }
  });
  if (issues.length) throw new Error(`Dataset provenance validation failed (${issues.length} issue(s)):\n- ${issues.join('\n- ')}`);
}
