/**
 * Civic Dashboard Export Utilities
 * Generates CSV, Excel (XLSX), and PDF exports of civic issues/headlines.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import type { CivicIssue, Headline, ConstituencySentiment } from './civicTypes';
import type { ExportFormat } from '../stores/subscription';
import { ISSUE_CATEGORY_CONFIG, SEVERITY_CONFIG, STATUS_CONFIG } from './civicTypes';

// ─── Types ───

export interface ExportPayload {
  issues: CivicIssue[];
  headlines: Headline[];
  sentiment: ConstituencySentiment[];
  scopeLabel: string;
  exportedAt: string;
  tierLabel: string;
}

// ─── CSV Generation ───

function escapeCSV(val: string | number | undefined): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function issuesToCSV(issues: CivicIssue[]): string {
  const headers = [
    'ID', 'Title', 'Category', 'Severity', 'Status', 'Constituency',
    'State', 'Reporter', 'Upvotes', 'Comments', 'Followers', 'Evidence',
    'Disputes', 'MLA Tagged', 'MLA Responded', 'Created', 'Updated',
  ];
  const rows = issues.map((i) => [
    i.id,
    i.title,
    ISSUE_CATEGORY_CONFIG[i.category]?.label ?? i.category,
    SEVERITY_CONFIG[i.severity]?.label ?? i.severity,
    STATUS_CONFIG[i.status]?.label ?? i.status,
    i.constituencyName ?? '',
    i.stateCode,
    i.reporterName,
    i.upvoteCount,
    i.commentCount,
    i.followCount,
    i.evidenceCount,
    i.disputeCount,
    i.mlaTagged ? 'Yes' : 'No',
    i.mlaResponded ? 'Yes' : 'No',
    i.createdAt,
    i.updatedAt,
  ]);
  return [headers.join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

function headlinesToCSV(headlines: Headline[]): string {
  const headers = ['ID', 'Title', 'Source', 'Category', 'State', 'Published'];
  const rows = headlines.map((h) => [
    h.id, h.title, h.sourceName, h.category, h.stateCode, h.publishedAt,
  ]);
  return [headers.join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
}

// ─── Excel Generation ───

function generateExcelBuffer(payload: ExportPayload): string {
  const wb = XLSX.utils.book_new();

  // Issues sheet
  const issueData = payload.issues.map((i) => ({
    ID: i.id,
    Title: i.title,
    Description: i.description ?? '',
    Category: ISSUE_CATEGORY_CONFIG[i.category]?.label ?? i.category,
    Severity: SEVERITY_CONFIG[i.severity]?.label ?? i.severity,
    Status: STATUS_CONFIG[i.status]?.label ?? i.status,
    Constituency: i.constituencyName ?? '',
    State: i.stateCode,
    Reporter: i.reporterName,
    Upvotes: i.upvoteCount,
    Comments: i.commentCount,
    Followers: i.followCount,
    Evidence: i.evidenceCount,
    Disputes: i.disputeCount,
    'MLA Tagged': i.mlaTagged ? 'Yes' : 'No',
    'MLA Responded': i.mlaResponded ? 'Yes' : 'No',
    Created: i.createdAt,
    Updated: i.updatedAt,
  }));
  const issueSheet = XLSX.utils.json_to_sheet(issueData);
  XLSX.utils.book_append_sheet(wb, issueSheet, 'Issues');

  // Headlines sheet
  const headlineData = payload.headlines.map((h) => ({
    ID: h.id,
    Title: h.title,
    Summary: h.summary ?? '',
    Source: h.sourceName,
    URL: h.sourceUrl,
    Category: h.category,
    State: h.stateCode,
    Published: h.publishedAt,
  }));
  const headlineSheet = XLSX.utils.json_to_sheet(headlineData);
  XLSX.utils.book_append_sheet(wb, headlineSheet, 'Headlines');

  // Sentiment sheet
  const sentimentData = payload.sentiment.map((s) => ({
    'Constituency ID': s.constituencyId,
    Constituency: s.constituencyName,
    Score: s.score,
    Positive: s.positiveCount,
    Negative: s.negativeCount,
    Neutral: s.neutralCount,
    'Total Posts': s.totalPosts,
    'Top Issues': s.topIssues.join(', '),
  }));
  const sentimentSheet = XLSX.utils.json_to_sheet(sentimentData);
  XLSX.utils.book_append_sheet(wb, sentimentSheet, 'Sentiment');

  // Write to base64
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  return wbout;
}

// ─── PDF Generation ───

function generatePDFHtml(payload: ExportPayload): string {
  const { issues, headlines, sentiment, scopeLabel, exportedAt, tierLabel } = payload;

  const issueRows = issues
    .map(
      (i) => `<tr>
        <td>${i.title}</td>
        <td><span class="badge" style="background:${ISSUE_CATEGORY_CONFIG[i.category]?.color}20;color:${ISSUE_CATEGORY_CONFIG[i.category]?.color}">${ISSUE_CATEGORY_CONFIG[i.category]?.label}</span></td>
        <td><span class="badge" style="background:${SEVERITY_CONFIG[i.severity]?.color}20;color:${SEVERITY_CONFIG[i.severity]?.color}">${SEVERITY_CONFIG[i.severity]?.label}</span></td>
        <td><span class="badge" style="background:${STATUS_CONFIG[i.status]?.color}20;color:${STATUS_CONFIG[i.status]?.color}">${STATUS_CONFIG[i.status]?.label}</span></td>
        <td>${i.constituencyName ?? '—'}</td>
        <td>${i.upvoteCount}</td>
        <td>${i.evidenceCount ?? 0}</td>
      </tr>`,
    )
    .join('');

  const headlineRows = headlines
    .map(
      (h) => `<tr>
        <td>${h.title}</td>
        <td>${h.sourceName}</td>
        <td>${h.category}</td>
        <td>${h.stateCode}</td>
      </tr>`,
    )
    .join('');

  const sentimentRows = sentiment
    .map(
      (s) => `<tr>
        <td>${s.constituencyName}</td>
        <td style="color:${s.score >= 0 ? '#10B981' : '#EF4444'};font-weight:700">${s.score.toFixed(2)}</td>
        <td>${s.positiveCount}</td>
        <td>${s.negativeCount}</td>
        <td>${s.totalPosts}</td>
      </tr>`,
    )
    .join('');

  const stats = {
    total: issues.length,
    open: issues.filter((i) => i.status === 'open').length,
    inProgress: issues.filter((i) => i.status === 'in_progress' || i.status === 'acknowledged').length,
    resolved: issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
    critical: issues.filter((i) => i.severity === 'critical').length,
    totalUpvotes: issues.reduce((sum, i) => sum + i.upvoteCount, 0),
    totalEvidence: issues.reduce((sum, i) => sum + i.evidenceCount, 0),
    mlaTagged: issues.filter((i) => i.mlaTagged).length,
    mlaResponded: issues.filter((i) => i.mlaResponded).length,
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1F2937; padding: 32px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4F8EF7; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #0A0A1A; }
  .header .meta { text-align: right; font-size: 11px; color: #6B7280; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-card .value { font-size: 24px; font-weight: 800; color: #1F2937; }
  .stat-card .label { font-size: 10px; color: #6B7280; margin-top: 2px; }
  h2 { font-size: 16px; color: #1F2937; margin: 20px 0 10px; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
  th { background: #F3F4F6; font-weight: 700; text-align: left; padding: 8px 6px; border-bottom: 2px solid #D1D5DB; }
  td { padding: 6px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  tr:nth-child(even) { background: #F9FAFB; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; text-align: center; }
  .watermark { color: #D1D5DB; font-size: 9px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Kshetra Civic Report</h1>
      <div style="color:#4F8EF7;font-weight:700;font-size:13px;margin-top:4px;">${scopeLabel}</div>
    </div>
    <div class="meta">
      <div>Exported: ${new Date(exportedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div>Plan: ${tierLabel}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card"><div class="value">${stats.total}</div><div class="label">Total Issues</div></div>
    <div class="stat-card"><div class="value" style="color:#3B82F6">${stats.open}</div><div class="label">Open</div></div>
    <div class="stat-card"><div class="value" style="color:#F59E0B">${stats.inProgress}</div><div class="label">In Progress</div></div>
    <div class="stat-card"><div class="value" style="color:#10B981">${stats.resolved}</div><div class="label">Resolved</div></div>
  </div>
  <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
    <div class="stat-card"><div class="value" style="color:#EF4444">${stats.critical}</div><div class="label">Critical</div></div>
    <div class="stat-card"><div class="value">${stats.totalUpvotes}</div><div class="label">Total Upvotes</div></div>
    <div class="stat-card"><div class="value">${stats.totalEvidence}</div><div class="label">Evidence Attached</div></div>
  </div>
  <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
    <div class="stat-card"><div class="value" style="color:#F59E0B">${stats.mlaTagged}</div><div class="label">MLA Tagged</div></div>
    <div class="stat-card"><div class="value" style="color:#10B981">${stats.mlaResponded}</div><div class="label">MLA Responded</div></div>
  </div>

  <h2>Civic Issues (${issues.length})</h2>
  <table>
    <thead><tr><th>Title</th><th>Category</th><th>Severity</th><th>Status</th><th>Constituency</th><th>Upvotes</th><th>Evidence</th></tr></thead>
    <tbody>${issueRows || '<tr><td colspan="7" style="text-align:center;color:#9CA3AF">No issues</td></tr>'}</tbody>
  </table>

  ${headlines.length > 0 ? `
  <h2>Headlines (${headlines.length})</h2>
  <table>
    <thead><tr><th>Title</th><th>Source</th><th>Category</th><th>State</th></tr></thead>
    <tbody>${headlineRows}</tbody>
  </table>` : ''}

  ${sentiment.length > 0 ? `
  <h2>Constituency Sentiment (${sentiment.length})</h2>
  <table>
    <thead><tr><th>Constituency</th><th>Score</th><th>Positive</th><th>Negative</th><th>Total</th></tr></thead>
    <tbody>${sentimentRows}</tbody>
  </table>` : ''}

  <div class="footer">
    Generated by <strong>Kshetra</strong> — India's Civic Intelligence Platform<br/>
    <span class="watermark">This report is auto-generated from community-reported data. Verify with official sources.</span>
  </div>
</body>
</html>`;
}

// ─── Export Orchestrator ───

export async function exportCivicData(
  format: ExportFormat,
  payload: ExportPayload,
): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseFilename = `kshetra-civic-${timestamp}`;

    if (format === 'csv') {
      const csvContent = [
        `# Kshetra Civic Export — ${payload.scopeLabel}`,
        `# Exported: ${payload.exportedAt}`,
        `# Plan: ${payload.tierLabel}`,
        '',
        '## ISSUES',
        issuesToCSV(payload.issues),
        '',
        '## HEADLINES',
        headlinesToCSV(payload.headlines),
      ].join('\n');

      const file = new File(Paths.cache, `${baseFilename}.csv`);
      file.create();
      file.write(csvContent);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      return { success: true };
    }

    if (format === 'xlsx') {
      const base64 = generateExcelBuffer(payload);
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File(Paths.cache, `${baseFilename}.xlsx`);
      file.create();
      file.write(bytes);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      return { success: true };
    }

    if (format === 'pdf') {
      const html = generatePDFHtml(payload);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      return { success: true };
    }

    return { success: false, error: `Unknown format: ${format}` };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Export failed' };
  }
}
