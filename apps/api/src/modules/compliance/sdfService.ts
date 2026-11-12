import { isProductionLikeRuntime } from '../../lib/runtimeEnvironment';
/**
 * apps/api/src/modules/compliance/sdfService.ts
 *
 * Development preview of a Significant Data Fiduciary (SDF) assessment.
 * The values below are illustrative and are never served in production.
 */

import type { SignificantDataFiduciaryAssessment } from '@kshetra/shared';

function isProductionRuntime(): boolean {
  return isProductionLikeRuntime();
}

export class SdfService {
  /**
   * Returns the local development assessment preview.
   */
  getAssessment(): SignificantDataFiduciaryAssessment {
    if (isProductionRuntime()) {
      throw new Error(
        'SDF_ASSESSMENT_UNAVAILABLE: No measured, reviewed, and persisted production assessment is configured.',
      );
    }

    return {
      assessmentDate: '2026-10-29T12:00:00.000Z',
      assessmentFramework: 'DPDP_Act_2023_Section_10',
      statutoryFactors: {
        volumeAndSensitivityOfPersonalData: {
          status: 'MONITORED',
          score: 42, // Scale 0-100 (Below 75 SDF Threshold)
          rationale:
            'Poligram maintains strict data minimization: citizen accounts require only mobile number and display name. No Aadhaar biometric storage, health data, or fine-grained financial portfolio tracking. Low volume of sensitive personal data.',
        },
        riskToHarmDataPrincipals: {
          status: 'LOW_TO_MEDIUM',
          score: 35,
          rationale:
            'Continuous GPS tracking is prohibited by design. Profile fields are coarse (Assembly Constituency level). Algorithmic amplification of divisive content is mitigated through community moderation and verification standards.',
        },
        potentialImpactOnElectoralSovereignty: {
          status: 'HIGH_GOVERNANCE_CONTROLLED',
          score: 80,
          rationale:
            'Because Poligram delivers statutory electoral geography and candidate information, its integrity impacts electoral transparency. Mitigated by statutory provenance anchors, zero synthetic independent entities, and immutable ECI gazette records.',
        },
        publicOrderAndNationalSecurityImplications: {
          status: 'LOW',
          score: 25,
          rationale:
            'Production voice dispatch is disabled until consent, DND/opt-out enforcement, provider controls, and current jurisdiction-specific calling requirements are verified. The application has a configured 09:00–20:00 IST product window; this does not certify legal compliance.',
        },
      },
      overallClassification: 'DATA_FIDUCIARY',
      appointedDpo: true,
      independentDataAuditorReady: true,
      dataProtectionImpactAssessmentConducted: true,
      reassessmentTriggers: [
        'Registered active citizen users exceed 10,000,000 threshold',
        'Official gazette notification by Central Government designating civic-tech platforms as SDFs',
        'Introduction of micro-targeted political advertising or synthetic media generation',
        'Cross-border data processing expansion outside sovereign Indian territory',
      ],
    };
  }
}

export const sdfService = new SdfService();
