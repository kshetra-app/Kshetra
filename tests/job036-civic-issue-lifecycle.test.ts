import test from 'node:test';
import assert from 'node:assert/strict';
import { civicService, InvalidCivicStatusTransitionError } from '../apps/api/src/services/civicService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 036: Canonical 8-Stage Civic Issue Lifecycle Engine (Section 1441)', async (t) => {
  setSupabaseConfiguredForTesting(false);

  t.after(() => {
    setSupabaseConfiguredForTesting(true);
  });

  const citizenReporterId = 'usr-citizen-anil-101';
  const officialOfficerId = 'usr-official-ghmc-42';
  const moderatorId = 'usr-mod-hyderabad-01';

  let issueId: string;

  await t.test('1. Citizen creates issue in canonical REPORTED status', async () => {
    const issue = await civicService.createIssue(
      {
        title: 'Dangerous deep open manhole near Jubilee Hills Checkpost Metro',
        description: 'Open storm drain without barricades posing extreme hazard to pedestrians and vehicles.',
        category: 'public_safety',
        severity: 'critical',
        constituencyId: 'TS-AC-61',
        stateCode: 'TS',
        latitude: 17.4401,
        longitude: 78.3489,
      },
      { userId: citizenReporterId, userName: 'Anil Kumar' }
    );

    assert.ok(issue.id);
    issueId = issue.id;
    assert.equal(civicService.constructor['normalizeStatus'](issue.status), 'REPORTED');
  });

  await t.test('2. Triage transition: REPORTED -> REVIEW', async () => {
    const issue = await civicService.updateStatus(
      issueId,
      {
        status: 'REVIEW',
        note: 'Triaging complaint for duplicate checks and safety assessment',
      },
      { userId: moderatorId, userName: 'Civic Moderator', role: 'moderator' }
    );

    assert.equal(issue.status, 'REVIEW');
    assert.equal(issue.canonicalStatus, 'REVIEW');
  });

  await t.test('3. Verification transition: REVIEW -> VERIFIED', async () => {
    const issue = await civicService.updateStatus(
      issueId,
      {
        status: 'VERIFIED',
        note: 'Field safety inspector corroborated physical site hazard',
      },
      { userId: moderatorId, userName: 'Civic Moderator', role: 'moderator' }
    );

    assert.equal(issue.status, 'VERIFIED');
    assert.equal(issue.canonicalStatus, 'VERIFIED');
  });

  await t.test('4. Assignment transition: VERIFIED -> ASSIGNED (department & officer routing)', async () => {
    const issue = await civicService.updateStatus(
      issueId,
      {
        status: 'ASSIGNED',
        note: 'Assigned to GHMC Storm Water Drainage Division',
        assignedDepartment: 'GHMC Storm Drainage Circle 18',
        assignedOfficerName: 'Er. Ramesh Babu (Executive Engineer)',
        estimatedCompletionDate: '2026-11-04T18:00:00.000Z',
      },
      { userId: officialOfficerId, userName: 'Municipal Commissioner Desk', role: 'official' }
    );

    assert.equal(issue.status, 'ASSIGNED');
    assert.equal(issue.canonicalStatus, 'ASSIGNED');
    assert.equal(issue.assignedDepartment, 'GHMC Storm Drainage Circle 18');
    assert.equal(issue.assignedOfficerName, 'Er. Ramesh Babu (Executive Engineer)');
  });

  await t.test('5. Execution transition: ASSIGNED -> IN_PROGRESS', async () => {
    const issue = await civicService.updateStatus(
      issueId,
      {
        status: 'IN_PROGRESS',
        note: 'Fabrication of heavy concrete cover underway at site depot',
      },
      { userId: officialOfficerId, userName: 'Er. Ramesh Babu', role: 'official' }
    );

    assert.equal(issue.status, 'IN_PROGRESS');
    assert.equal(issue.canonicalStatus, 'IN_PROGRESS');
  });

  await t.test('6. Resolution transition: IN_PROGRESS -> RESOLVED with evidence photo', async () => {
    const issue = await civicService.updateStatus(
      issueId,
      {
        status: 'RESOLVED',
        note: 'New heavy-duty reinforced ductile iron manhole cover installed and safety barricades cleared.',
        evidenceUrl: 'https://cdn.kshetra.app/civic/evidence/manhole-repaired-jh61.jpg',
      },
      { userId: officialOfficerId, userName: 'Er. Ramesh Babu', role: 'official' }
    );

    assert.equal(issue.status, 'RESOLVED');
    assert.equal(issue.canonicalStatus, 'RESOLVED');
    assert.ok(issue.resolvedAt);
    assert.equal(issue.resolutionNote?.includes('heavy-duty'), true);
    assert.equal(issue.resolutionEvidenceUrl, 'https://cdn.kshetra.app/civic/evidence/manhole-repaired-jh61.jpg');
  });

  await t.test('7. Citizen confirmation: RESOLVED -> CONFIRMED', async () => {
    const issue = await civicService.updateStatus(
      issueId,
      {
        status: 'CONFIRMED',
        note: 'Verified in person on the way to work. Cover is flush with road surface. Thank you!',
      },
      { userId: citizenReporterId, userName: 'Anil Kumar', role: 'citizen' }
    );

    assert.equal(issue.status, 'CONFIRMED');
    assert.equal(issue.canonicalStatus, 'CONFIRMED');
    assert.ok(issue.confirmedAt);
  });

  await t.test('8. Final formal closure: CONFIRMED -> CLOSED', async () => {
    const issue = await civicService.updateStatus(
      issueId,
      {
        status: 'CLOSED',
        note: 'Ticket formally audited and closed in municipal registry.',
      },
      { userId: officialOfficerId, userName: 'Municipal Audit Admin', role: 'admin' }
    );

    assert.equal(issue.status, 'CLOSED');
    assert.equal(issue.canonicalStatus, 'CLOSED');
  });

  await t.test('9. Dispute flow: Citizen reporter disputes incomplete resolution', async () => {
    // Create new issue
    const issue2 = await civicService.createIssue(
      {
        title: 'Broken streetlights on Road 45 Jubilee Hills',
        description: 'Complete dark stretch for 400 meters.',
        category: 'electricity',
        severity: 'high',
        constituencyId: 'tg-ac-61',
        stateCode: 'TG',
      },
      { userId: citizenReporterId, userName: 'Anil Kumar' }
    );

    // Fast-track to RESOLVED
    await civicService.updateStatus(issue2.id, { status: 'VERIFIED' }, { userId: officialOfficerId, role: 'official' });
    await civicService.updateStatus(issue2.id, { status: 'IN_PROGRESS' }, { userId: officialOfficerId, role: 'official' });
    await civicService.updateStatus(
      issue2.id,
      { status: 'RESOLVED', note: 'Bulbs replaced by electrical contractor' },
      { userId: officialOfficerId, role: 'official' }
    );

    // Citizen disputes the fix
    const disputeIssue = await civicService.updateStatus(
      issue2.id,
      {
        status: 'DISPUTED',
        note: 'Only 1 of 6 poles was repaired. The remaining 5 are still completely dark.',
      },
      { userId: citizenReporterId, userName: 'Anil Kumar', role: 'citizen' }
    );

    assert.equal(disputeIssue.status, 'DISPUTED');
    assert.equal(disputeIssue.canonicalStatus, 'DISPUTED');
    assert.ok(disputeIssue.disputedAt);

    // Official moves DISPUTED back to IN_PROGRESS
    const resumedIssue = await civicService.updateStatus(
      issue2.id,
      { status: 'IN_PROGRESS', note: 'Contractor dispatched back to site to replace all 5 remaining luminaires' },
      { userId: officialOfficerId, role: 'official' }
    );
    assert.equal(resumedIssue.status, 'IN_PROGRESS');
  });

  await t.test('10. Community consensus dispute trigger: 5 community disputes auto-reopen RESOLVED issue', async () => {
    const issue3 = await civicService.createIssue(
      {
        title: 'Garbage dump accumulation near Madhapur vegetable market',
        description: 'Overflowing bins blocking pedestrian pathway.',
        category: 'sanitation',
        severity: 'medium',
        constituencyId: 'tg-ac-67',
        stateCode: 'TG',
      },
      { userId: 'usr-cit-1', userName: 'Local Resident' }
    );

    await civicService.updateStatus(issue3.id, { status: 'VERIFIED' }, { userId: officialOfficerId, role: 'official' });
    await civicService.updateStatus(issue3.id, { status: 'IN_PROGRESS' }, { userId: officialOfficerId, role: 'official' });
    await civicService.updateStatus(
      issue3.id,
      { status: 'RESOLVED', note: 'Sanitation tipper cleared bins' },
      { userId: officialOfficerId, role: 'official' }
    );

    // 4 residents dispute
    for (let i = 1; i <= 4; i++) {
      const res = await civicService.disputeResolution(
        issue3.id,
        { reason: `Bin still overflowing on corner #${i}` },
        `usr-community-${i}`
      );
      assert.equal(res.reopened, false);
    }

    // 5th resident disputes -> auto-triggers transition to DISPUTED / reopened
    const fifthDispute = await civicService.disputeResolution(
      issue3.id,
      { reason: 'Garbage piled up onto main road' },
      'usr-community-5'
    );
    assert.equal(fifthDispute.reopened, true);

    const refetched = await civicService.getIssue(issue3.id);
    assert.equal(refetched?.canonicalStatus, 'DISPUTED');
  });

  await t.test('11. 7-Day Auto-Confirmation Engine', async () => {
    const issue4 = await civicService.createIssue(
      {
        title: 'Pothole patch near Durgam Cheruvu bridge',
        description: 'Surface asphalt damaged.',
        category: 'roads',
        severity: 'medium',
        constituencyId: 'tg-ac-67',
        stateCode: 'TG',
      },
      { userId: 'usr-cit-auto', userName: 'Test Citizen' }
    );

    await civicService.updateStatus(issue4.id, { status: 'VERIFIED' }, { userId: officialOfficerId, role: 'official' });
    await civicService.updateStatus(issue4.id, { status: 'IN_PROGRESS' }, { userId: officialOfficerId, role: 'official' });
    await civicService.updateStatus(
      issue4.id,
      { status: 'RESOLVED', note: 'Cold mix patch laid and rolled' },
      { userId: officialOfficerId, role: 'official' }
    );

    // Artificially age the resolvedAt timestamp by 8 days
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const fetched = await civicService.getIssue(issue4.id);
    if (fetched) {
      fetched.resolvedAt = eightDaysAgo;
    }

    // Trigger auto-confirmation pass
    const confirmedCount = await civicService.autoConfirmResolvedIssues(7);
    assert.ok(confirmedCount >= 1);

    const autoConfirmed = await civicService.getIssue(issue4.id);
    assert.equal(autoConfirmed?.canonicalStatus, 'CONFIRMED');
    assert.ok(autoConfirmed?.confirmedAt);
  });

  await t.test('12. Role-based security & illegal transition guards', async () => {
    // Non-privileged citizen cannot self-assign
    assert.throws(
      () => {
        civicService.validateStatusTransition('REPORTED', 'ASSIGNED', 'citizen', false);
      },
      (err: any) => {
        assert.ok(err instanceof InvalidCivicStatusTransitionError);
        return true;
      }
    );

    // Non-privileged citizen cannot self-resolve
    assert.throws(
      () => {
        civicService.validateStatusTransition('IN_PROGRESS', 'RESOLVED', 'citizen', false);
      },
      (err: any) => {
        assert.ok(err instanceof InvalidCivicStatusTransitionError);
        return true;
      }
    );

    // Empty note on RESOLVED rejected
    await assert.rejects(async () => {
      await civicService.updateStatus(
        issueId,
        { status: 'RESOLVED', note: '   ' },
        { userId: officialOfficerId, role: 'official' }
      );
    });
  });

  await t.test('13. Immutable audit status history verification', async () => {
    const history = await civicService.getStatusHistory(issueId);
    assert.ok(history.length >= 7, 'Must have recorded transitions through lifecycle');

    // Verify chronological progression
    const states = history.map((h) => h.toStatus);
    assert.ok(states.includes('REVIEW'));
    assert.ok(states.includes('VERIFIED'));
    assert.ok(states.includes('ASSIGNED'));
    assert.ok(states.includes('IN_PROGRESS'));
    assert.ok(states.includes('RESOLVED'));
    assert.ok(states.includes('CONFIRMED'));
    assert.ok(states.includes('CLOSED'));

    // Verify metadata recorded on assignment step
    const assignedStep = history.find((h) => h.toStatus === 'ASSIGNED');
    assert.ok(assignedStep);
    assert.equal(assignedStep.assignedDepartment, 'GHMC Storm Drainage Circle 18');
  });
});
