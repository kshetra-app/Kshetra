import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';

interface CaseDetail {
  serialNo?: string;
  caseNo?: string;
  court?: string;
  ipcSections: string[];
  otherActs?: string[];
  status: string;
  chargesFramed?: boolean;
  isSeriousIPC?: boolean;
}

interface Props {
  totalCases: number;
  seriousCases: number;
  convictions: number;
  caseDetails: CaseDetail[];
  compact?: boolean;
}

export default function CriminalRecordCard({ totalCases, seriousCases, convictions, caseDetails, compact }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (totalCases === 0) {
    if (compact) return null;
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        <View style={styles.cleanRow}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          <Text style={[styles.cleanText, { color: colors.success }]}>No criminal cases declared</Text>
        </View>
      </View>
    );
  }

  const severity = convictions > 0 ? 'critical' : seriousCases > 0 ? 'serious' : 'minor';
  const severityColor = severity === 'critical' ? colors.danger : severity === 'serious' ? colors.warning : colors.textMuted;

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surface, borderLeftColor: severityColor, borderColor: colors.border, borderWidth: 1 }]}>
        <Ionicons name="warning" size={14} color={severityColor} />
        <Text style={[styles.compactText, { color: severityColor }]}>
          {totalCases} case{totalCases > 1 ? 's' : ''}{seriousCases > 0 ? ` (${seriousCases} serious)` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="alert-circle" size={18} color={severityColor} />
          <Text style={[styles.title, { color: colors.text }]}>Criminal Record</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
          <Text style={[styles.severityText, { color: severityColor }]}>{severity.toUpperCase()}</Text>
        </View>
      </View>

      {/* Summary stats */}
      <View style={[styles.summaryRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{totalCases}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Cases</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: seriousCases > 0 ? colors.danger : colors.textMuted }]}>{seriousCases}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Serious</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: convictions > 0 ? colors.danger : colors.textMuted }]}>{convictions}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Convictions</Text>
        </View>
      </View>

      {/* Case details (expandable) */}
      {caseDetails.length > 0 && (
        <>
          <Pressable style={[styles.expandBtn, { borderTopColor: colors.border }]} onPress={() => setExpanded(!expanded)}>
            <Text style={[styles.expandText, { color: colors.primary }]}>
              {expanded ? 'Hide' : 'View'} Case Details ({caseDetails.length})
            </Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </Pressable>

          {expanded && caseDetails.map((c, idx) => (
            <View key={idx} style={[styles.caseCard, { backgroundColor: colors.surfaceElevated, borderLeftColor: c.isSeriousIPC ? colors.danger : colors.goldBorder || colors.border }]}>
              <View style={styles.caseHeader}>
                <Text style={[styles.caseNumber, { color: colors.text }]}>#{c.serialNo || idx + 1}</Text>
                <View style={[styles.caseStatusBadge, { backgroundColor: getStatusColor(c.status) + '20' }]}>
                  <Text style={[styles.caseStatusText, { color: getStatusColor(c.status) }]}>
                    {c.status || 'pending'}
                  </Text>
                </View>
                {c.isSeriousIPC && (
                  <View style={styles.seriousTag}>
                    <Ionicons name="flame" size={10} color="#EF4444" />
                  </View>
                )}
              </View>
              {c.caseNo && <Text style={styles.caseMeta}>Case: {c.caseNo}</Text>}
              {c.court && <Text style={styles.caseMeta}>Court: {c.court}</Text>}
              {c.ipcSections.length > 0 && (
                <View style={styles.ipcRow}>
                  <Text style={styles.ipcLabel}>IPC:</Text>
                  <View style={styles.ipcChips}>
                    {c.ipcSections.slice(0, 5).map((s, i) => (
                      <View key={i} style={styles.ipcChip}>
                        <Text style={styles.ipcChipText}>{s}</Text>
                      </View>
                    ))}
                    {c.ipcSections.length > 5 && (
                      <Text style={styles.ipcMore}>+{c.ipcSections.length - 5}</Text>
                    )}
                  </View>
                </View>
              )}
              {c.chargesFramed && (
                <View style={styles.chargesRow}>
                  <Ionicons name="checkmark-circle" size={12} color="#EF4444" />
                  <Text style={styles.chargesText}>Charges Framed</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'convicted': return '#EF4444';
    case 'acquitted': return '#10B981';
    case 'discharged': return '#6B7280';
    default: return '#F59E0B';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  cleanText: {
    fontSize: ms(13),
    color: '#10B981',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: ms(15),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: ms(9),
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: ms(18),
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: ms(10),
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  expandText: {
    fontSize: ms(12),
    fontWeight: '600',
  },
  caseCard: {
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
  },
  caseCardSerious: {},
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  caseNumber: {
    fontSize: ms(12),
    fontWeight: '700',
  },
  caseStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  caseStatusText: {
    fontSize: ms(9),
    fontWeight: '700',
  },
  seriousTag: {
    marginLeft: 'auto',
  },
  caseMeta: {
    fontSize: ms(11),
    marginBottom: 2,
  },
  ipcRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
  },
  ipcLabel: {
    fontSize: ms(10),
    fontWeight: '600',
    marginTop: 2,
  },
  ipcChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  ipcChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ipcChipText: {
    fontSize: ms(9),
    fontWeight: '600',
  },
  ipcMore: {
    fontSize: ms(9),
    marginTop: 2,
  },
  chargesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  chargesText: {
    fontSize: ms(10),
    fontWeight: '600',
  },
  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  compactText: {
    fontSize: ms(11),
    fontWeight: '600',
  },
});
