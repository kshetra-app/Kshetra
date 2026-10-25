import { formatFactValue, validateProvenancedFact, type DataTruthStatus, type FactProvenance, type ProvenancedFact } from '@kshetra/shared';
export type { DataTruthStatus, FactProvenance, ProvenancedFact };
/** Format data for mobile UI without disguising unknown values as zero. */
export function displayFactValue(value: string | number | null | undefined): string {
  return formatFactValue(value);
}
/** Validate provenance on incoming API DTOs or local data adapters. */
export function isFactProvenanceValid<T>(fact: ProvenancedFact<T>): boolean {
  return validateProvenancedFact(fact).length === 0;
}
