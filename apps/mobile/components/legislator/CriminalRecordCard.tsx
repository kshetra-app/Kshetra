import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '@/lib/responsive';

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
  const [expanded, setExpanded] = useState(false);

  if (totalCases === 0) {
    if (compact) return null;
    return (
      <View style={styles.container}>
        <View style={styles.cleanRow}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <Text style={styles.cleanText}>No criminal cases declared</Text>
        </View>
      </View>
    );
  }

  const severity = convictions > 0 ? 'critical' : seriousCases > 0 ? 'serious' : 'minor';
  const severityColor = severity === 'critical' ? '#EF4444' : severity === 'serious' ? '#F59E0B' : '#6B7280';

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderLeftColor: severityColor }]}>
        <Ionicons name="warning" size={14} color={severityColor} />
        <Text style={[styles.compactText, { color: severityColor }]}>
          {totalCases} case{totalCases > 1 ? 's' : ''}{seriousCases > 0 ? ` (${seriousCases} serious)` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="alert-circle" size={18} color={severityColor} />
          <Text style={styles.title}>Criminal Record</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
          <Text style={[styles.severityText, { color: severityColor }]}>{severity.toUpperCase()}</Text>
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalCases}</Text>
          <Text style={styles.summaryLabel}>Total Cases</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: seriousCases > 0 ? '#F59E0B' : '#6B7280' }]}>{seriousCases}</Text>
          <Text style={styles.summaryLabel}>Serious</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: convictions > 0 ? '#EF4444' : '#6B7280' }]}>{convictions}</Text>
          <Text style={styles.summaryLabel}>Convictions</Text>
        </View>
      </View>

      {/* Case details (expandable) */}
      {caseDetails.length > 0 && (
        <>
          <Pressable style={styles.expandBtn} onPress={() => setExpanded(!expanded)}>
            <Text style={styles.expandText}>
              {expanded ? 'Hide' : 'View'} Case Details ({caseDetails.length})
            </Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#4F8EF7" />
          </Pressable>

          {expanded && caseDetails.map((c, idx) => (
            <View key={idx} style={[styles.caseCard, c.isSeriousIPC && styles.caseCardSerious]}>
              <View style={styles.caseHeader}>
                <Text style={styles.caseNumber}>#{c.serialNo || idx + 1}</Text>
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
    backgroundColor: '#0A0A1A',
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
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: ms(10),
    color: '#6B7280',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#374151',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  expandText: {
    fontSize: ms(12),
    color: '#4F8EF7',
    fontWeight: '600',
  },
  caseCard: {
    backgroundColor: '#0A0A1A',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#374151',
  },
  caseCardSerious: {
    borderLeftColor: '#EF4444',
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  caseNumber: {
    fontSize: ms(12),
    fontWeight: '700',
    color: '#D1D5DB',
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
    color: '#9CA3AF',
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
    color: '#6B7280',
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
    backgroundColor: '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ipcChipText: {
    fontSize: ms(9),
    color: '#D1D5DB',
    fontWeight: '600',
  },
  ipcMore: {
    fontSize: ms(9),
    color: '#6B7280',
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
    color: '#EF4444',
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
    backgroundColor: '#111827',
  },
  compactText: {
    fontSize: ms(11),
    fontWeight: '600',
  },
});
