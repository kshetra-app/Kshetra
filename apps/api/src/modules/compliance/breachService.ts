/**
 * apps/api/src/modules/compliance/breachService.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Executable Personal Data Breach Notification & Incident Response Protocol.
 * SLA: Containment within 6 hours; DPBI & Principal notification within 72 hours.
 */

import type { BreachIncidentRecord, PersonalDataCategory } from '@kshetra/shared';
import type { BreachIncidentReportInput } from './schemas';

export class BreachService {
  private incidentLedger = new Map<string, BreachIncidentRecord>();

  /**
   * Records and initiates response protocol for a personal data breach incident.
   */
  recordIncident(params: BreachIncidentReportInput): BreachIncidentRecord {
    const incidentId = `inc_dpdp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();
    const dpbiDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72-hour statutory deadline

    // Critical and High severity breaches require mandatory DPBI notification
    const dpbiNotificationRequired = params.severity === 'high' || params.severity === 'critical';

    const incident: BreachIncidentRecord = {
      incidentId,
      discoveredAt: now.toISOString(),
      severity: params.severity,
      affectedCategories: params.affectedCategories as PersonalDataCategory[],
      estimatedPrincipalsAffected: params.estimatedPrincipalsAffected,
      containmentStatus: 'mitigating',
      dpbiNotificationRequired,
      dpbiNotificationDueBy: dpbiDeadline.toISOString(),
      rootCauseAnalysis: params.rootCauseAnalysis,
    };

    this.incidentLedger.set(incidentId, incident);
    return incident;
  }

  /**
   * Simulates dispatching formal notice to the Data Protection Board of India (DPBI).
   */
  notifyDpbi(incidentId: string): {
    success: boolean;
    incidentId: string;
    notifiedAt: string;
    dpbiAcknowledgmentId: string;
  } {
    const incident = this.incidentLedger.get(incidentId);
    if (!incident) {
      throw new Error(`Incident '${incidentId}' not found in registry`);
    }

    const nowIso = new Date().toISOString();
    incident.dpbiNotifiedAt = nowIso;
    incident.containmentStatus = 'contained';

    return {
      success: true,
      incidentId,
      notifiedAt: nowIso,
      dpbiAcknowledgmentId: `ACK_DPBI_${Date.now()}_SEC_8_5`,
    };
  }

  /**
   * Retrieves an incident by ID.
   */
  getIncident(incidentId: string): BreachIncidentRecord | null {
    return this.incidentLedger.get(incidentId) || null;
  }

  /**
   * Returns all recorded incidents.
   */
  listIncidents(): BreachIncidentRecord[] {
    return Array.from(this.incidentLedger.values());
  }
}

export const breachService = new BreachService();
