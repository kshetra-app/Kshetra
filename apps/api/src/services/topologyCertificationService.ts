import { supabase, isSupabaseConfigured, isUsingServiceRole } from '../lib/supabase';
import type {
  SpatialTopologyAuditReport,
  SpatialTopologyViolation,
  TargetedSpatialInspectionQuery,
} from '@kshetra/shared';

export class TopologyAuditUnavailableError extends Error {
  constructor(message = 'Canonical PostGIS topology audit is unavailable') {
    super(message);
    this.name = 'TopologyAuditUnavailableError';
  }
}

export class TopologyCertificationService {
  /** Utility for evaluating supplied evidence; production certification uses PostGIS below. */
  public static isWithinNationalBounds(lon: number, lat: number): boolean {
    return lon >= 68.0 && lon <= 97.5 && lat >= 6.5 && lat <= 37.5;
  }

  /** Utility for evaluating supplied evidence; these inputs alone do not certify stored geography. */
  public static evaluateGeometry(
    entityId: string,
    entityType: 'AC' | 'PC' | 'DISTRICT',
    name: string,
    areaSqMeters: number,
    isValid: boolean,
    hasSelfIntersection: boolean,
    isContainedInState: boolean,
    overlapsAdjacentConstituency: boolean,
    srid: number,
  ): SpatialTopologyViolation[] {
    const violations: SpatialTopologyViolation[] = [];
    if (!isValid || hasSelfIntersection)
      violations.push({
        entityType,
        entityId,
        name,
        violationType: 'INVALID_GEOMETRY',
        details: 'Geometry failed ST_IsValid.',
      });
    if (areaSqMeters < 100)
      violations.push({
        entityType,
        entityId,
        name,
        violationType: 'SLIVER',
        details: `Area (${areaSqMeters.toFixed(2)} m²) is below 100 m².`,
      });
    if (overlapsAdjacentConstituency)
      violations.push({
        entityType,
        entityId,
        name,
        violationType: 'OVERLAP',
        details: 'Positive-area intersection with an adjacent constituency.',
      });
    if (!isContainedInState)
      violations.push({
        entityType,
        entityId,
        name,
        violationType: 'CONTAINMENT_BREACH',
        details: 'Boundary is not covered by its parent state geometry.',
      });
    if (srid !== 4326)
      violations.push({
        entityType,
        entityId,
        name,
        violationType: 'INVALID_SRID',
        details: `SRID is ${srid}; required 4326.`,
      });
    return violations;
  }

  public static async certifyNationwideTopology(): Promise<SpatialTopologyAuditReport> {
    if (!isSupabaseConfigured || !isUsingServiceRole) throw new TopologyAuditUnavailableError();
    const { data, error } = await supabase.rpc('fn_certify_current_geography_topology');
    if (error || !data || typeof data !== 'object')
      throw new TopologyAuditUnavailableError(error?.message);

    const report = data as SpatialTopologyAuditReport;
    const summary = report.summary;
    if (
      !summary ||
      typeof report.auditId !== 'string' ||
      !Array.isArray(report.failureLog) ||
      !Array.isArray(summary.uncertifiedReasons) ||
      typeof summary.checksComplete !== 'boolean' ||
      typeof report.certified !== 'boolean'
    ) {
      throw new TopologyAuditUnavailableError('PostGIS topology audit returned an invalid report');
    }
    if (report.certified !== summary.checksComplete) {
      throw new TopologyAuditUnavailableError(
        'PostGIS certification and successful-check status are inconsistent',
      );
    }
    // Do not accept a positive certification without complete data coverage and a complete check set.
    if (
      report.certified &&
      (!summary.checksComplete ||
        report.failureLog.length > 0 ||
        summary.uncertifiedReasons.length > 0)
    ) {
      throw new TopologyAuditUnavailableError(
        'PostGIS attempted to certify incomplete spatial coverage',
      );
    }

    // The RPC writes the audit report and ledger row in one database transaction.
    // Verify the committed row without creating a second client-side audit record.
    const { data: persisted, error: persistenceError } = await supabase
      .from('spatial_topology_certification_ledger')
      .select('id, is_certified_100_percent, audit_report')
      .eq('id', report.auditId)
      .maybeSingle();
    if (
      persistenceError ||
      !persisted ||
      persisted.id !== report.auditId ||
      persisted.is_certified_100_percent !== report.certified ||
      persisted.audit_report?.auditId !== report.auditId
    ) {
      throw new TopologyAuditUnavailableError(
        persistenceError?.message ?? 'PostGIS audit report was not persisted atomically',
      );
    }
    return report;
  }

  public static async inspectTargetedSpatialScope(
    query: TargetedSpatialInspectionQuery,
  ): Promise<{ inspectedScope: TargetedSpatialInspectionQuery; pass: boolean; count: number }> {
    if (!isSupabaseConfigured || !isUsingServiceRole) throw new TopologyAuditUnavailableError();
    const { data, error } = await supabase.rpc('fn_inspect_spatial_scope', { p_query: query });
    if (error || !data || typeof data !== 'object')
      throw new TopologyAuditUnavailableError(error?.message);
    const result = data as {
      inspectedScope: TargetedSpatialInspectionQuery;
      pass: boolean;
      count: number;
    };
    if (typeof result.pass !== 'boolean' || !Number.isInteger(result.count) || result.count < 0) {
      throw new TopologyAuditUnavailableError(
        'PostGIS scope inspection returned an invalid result',
      );
    }
    return result;
  }
}
