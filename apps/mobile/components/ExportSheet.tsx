import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CivicIssue, Headline, ConstituencySentiment } from '../lib/civicTypes';
import {
  useSubscriptionStore,
  TIER_CONFIG,
  type ExportFormat,
  type SubscriptionTier,
} from '../stores/subscription';
import { exportCivicData, type ExportPayload } from '../lib/exportCivicData';

// ─── Format Options ───

interface FormatOption {
  key: ExportFormat;
  label: string;
  icon: string;
  description: string;
  minTier: SubscriptionTier;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    key: 'csv',
    label: 'CSV',
    icon: 'document-text',
    description: 'Spreadsheet-ready data',
    minTier: 'free',
  },
  {
    key: 'xlsx',
    label: 'Excel',
    icon: 'grid',
    description: 'Multi-sheet workbook with analytics',
    minTier: 'pro',
  },
  {
    key: 'pdf',
    label: 'PDF Report',
    icon: 'print',
    description: 'Formatted report with charts & summary',
    minTier: 'pro',
  },
];

type ExportScope = 'filtered' | 'all';

// ─── Props ───

interface ExportSheetProps {
  visible: boolean;
  onClose: () => void;
  filteredIssues: CivicIssue[];
  allIssues: CivicIssue[];
  filteredHeadlines: Headline[];
  allHeadlines: Headline[];
  filteredSentiment: ConstituencySentiment[];
  allSentiment: ConstituencySentiment[];
  scopeLabel: string;
}

export default function ExportSheet({
  visible,
  onClose,
  filteredIssues,
  allIssues,
  filteredHeadlines,
  allHeadlines,
  filteredSentiment,
  allSentiment,
  scopeLabel,
}: ExportSheetProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>('filtered');
  const [exporting, setExporting] = useState(false);

  const tier = useSubscriptionStore((s) => s.tier);
  const canExport = useSubscriptionStore((s) => s.canExport);
  const recordExport = useSubscriptionStore((s) => s.recordExport);
  const exportsThisMonth = useSubscriptionStore((s) => s.exportsThisMonth);
  const tierConfig = TIER_CONFIG[tier];

  const issues = scope === 'filtered' ? filteredIssues : allIssues;
  const headlines = scope === 'filtered' ? filteredHeadlines : allHeadlines;
  const sentiment = scope === 'filtered' ? filteredSentiment : allSentiment;

  // Apply issue limit for free tier
  const cappedIssues = useMemo(() => {
    if (tierConfig.maxIssuesPerExport === -1) return issues;
    return issues.slice(0, tierConfig.maxIssuesPerExport);
  }, [issues, tierConfig.maxIssuesPerExport]);

  const exportCheck = useMemo(() => canExport(format), [canExport, format]);

  const handleExport = useCallback(async () => {
    if (!exportCheck.allowed) {
      Alert.alert(t('export.upgradeRequired'), exportCheck.reason ?? t('export.cannotExport'));
      return;
    }

    setExporting(true);
    try {
      const payload: ExportPayload = {
        issues: cappedIssues,
        headlines,
        sentiment,
        scopeLabel: scope === 'filtered' ? scopeLabel : t('export.allData'),
        exportedAt: new Date().toISOString(),
        tierLabel: tierConfig.label,
      };

      const result = await exportCivicData(format, payload);

      if (result.success) {
        recordExport();
        onClose();
      } else {
        Alert.alert(t('export.failed'), result.error ?? t('export.errorOccurred'));
      }
    } catch (err: any) {
      Alert.alert(t('export.failed'), err?.message ?? t('export.errorOccurred'));
    } finally {
      setExporting(false);
    }
  }, [exportCheck, format, cappedIssues, headlines, sentiment, scope, scopeLabel, tierConfig, recordExport, onClose]);

  const remainingExports = tierConfig.maxExportsPerMonth === -1
    ? '∞'
    : `${Math.max(0, tierConfig.maxExportsPerMonth - exportsThisMonth)}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </Pressable>
            <Text style={styles.headerTitle}>{t('export.title')}</Text>
            <View style={[styles.tierBadge, { backgroundColor: tierConfig.color + '20' }]}>
              <Ionicons name={tierConfig.icon as any} size={12} color={tierConfig.color} />
              <Text style={[styles.tierBadgeText, { color: tierConfig.color }]}>{tierConfig.label}</Text>
            </View>
          </View>

          {/* Scope selection */}
          <Text style={styles.sectionLabel}>{t('export.dataScope')}</Text>
          <View style={styles.scopeRow}>
            <Pressable
              style={[styles.scopeOption, scope === 'filtered' && styles.scopeOptionActive]}
              onPress={() => setScope('filtered')}
            >
              <Ionicons name="funnel" size={16} color={scope === 'filtered' ? '#FFFFFF' : '#6B7280'} />
              <View style={styles.scopeTextWrap}>
                <Text style={[styles.scopeOptionLabel, scope === 'filtered' && styles.scopeOptionLabelActive]}>
                  {t('export.currentView')}
                </Text>
                <Text style={styles.scopeOptionCount}>
                  {filteredIssues.length} issues · {filteredHeadlines.length} headlines
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.scopeOption, scope === 'all' && styles.scopeOptionActive]}
              onPress={() => setScope('all')}
            >
              <Ionicons name="globe" size={16} color={scope === 'all' ? '#FFFFFF' : '#6B7280'} />
              <View style={styles.scopeTextWrap}>
                <Text style={[styles.scopeOptionLabel, scope === 'all' && styles.scopeOptionLabelActive]}>
                  {t('export.allData')}
                </Text>
                <Text style={styles.scopeOptionCount}>
                  {allIssues.length} issues · {allHeadlines.length} headlines
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Free tier limit notice */}
          {tierConfig.maxIssuesPerExport !== -1 && issues.length > tierConfig.maxIssuesPerExport && (
            <View style={styles.limitNotice}>
              <Ionicons name="information-circle" size={14} color="#F59E0B" />
              <Text style={styles.limitNoticeText}>
                Free plan exports up to {tierConfig.maxIssuesPerExport} issues. {issues.length - tierConfig.maxIssuesPerExport} will be excluded.
                <Text style={{ color: '#4F8EF7', fontWeight: '700' }}> Upgrade to Pro →</Text>
              </Text>
            </View>
          )}

          {/* Format selection */}
          <Text style={styles.sectionLabel}>Export Format</Text>
          <View style={styles.formatGrid}>
            {FORMAT_OPTIONS.map((opt) => {
              const active = format === opt.key;
              const locked = !TIER_CONFIG[tier].exportFormats.includes(opt.key);
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.formatCard,
                    active && styles.formatCardActive,
                    locked && styles.formatCardLocked,
                  ]}
                  onPress={() => !locked ? setFormat(opt.key) : Alert.alert(
                    'Pro Feature',
                    `${opt.label} export requires a Pro or Institutional plan.\n\nUpgrade for ₹99/month to unlock Excel & PDF exports with full analytics.`,
                  )}
                >
                  <View style={styles.formatIconRow}>
                    <Ionicons
                      name={opt.icon as any}
                      size={24}
                      color={active ? '#FFFFFF' : locked ? '#374151' : '#9CA3AF'}
                    />
                    {locked && (
                      <Ionicons name="lock-closed" size={12} color="#F59E0B" style={styles.lockIcon} />
                    )}
                  </View>
                  <Text style={[
                    styles.formatLabel,
                    active && styles.formatLabelActive,
                    locked && { color: '#374151' },
                  ]}>{opt.label}</Text>
                  <Text style={[styles.formatDesc, locked && { color: '#1F2937' }]}>{opt.description}</Text>
                  {locked && (
                    <Text style={styles.proTag}>PRO</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Export summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{cappedIssues.length}</Text>
              <Text style={styles.summaryLabel}>Issues</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{headlines.length}</Text>
              <Text style={styles.summaryLabel}>Headlines</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{sentiment.length}</Text>
              <Text style={styles.summaryLabel}>Sentiment</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{remainingExports}</Text>
              <Text style={styles.summaryLabel}>Remaining</Text>
            </View>
          </View>

          {/* Export button */}
          <Pressable
            style={[
              styles.exportButton,
              !exportCheck.allowed && styles.exportButtonDisabled,
              exporting && styles.exportButtonDisabled,
            ]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name={exportCheck.allowed ? 'download' : 'lock-closed'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.exportButtonText}>
                  {exportCheck.allowed
                    ? `Export ${format.toUpperCase()}`
                    : 'Upgrade to Export'}
                </Text>
              </>
            )}
          </Pressable>

          {/* Upgrade banner for free users */}
          {tier === 'free' && (
            <View style={styles.upgradeBanner}>
              <View style={styles.upgradeRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.upgradeTitle}>Unlock Full Exports</Text>
              </View>
              <Text style={styles.upgradeDesc}>
                Pro plan (₹99/mo): Excel + PDF reports, 500 issues/export, 50 exports/month
              </Text>
              <Pressable style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F5EFE4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#241814',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#988275',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  scopeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E8DED1',
  },
  scopeOptionActive: {
    backgroundColor: '#4F8EF720',
    borderColor: '#4F8EF7',
  },
  scopeTextWrap: {
    flex: 1,
  },
  scopeOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D5549',
  },
  scopeOptionLabelActive: {
    color: '#241814',
  },
  scopeOptionCount: {
    fontSize: 10,
    color: '#988275',
    marginTop: 2,
  },
  limitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B10',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  limitNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#F59E0B',
    lineHeight: 16,
  },
  formatGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  formatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8DED1',
  },
  formatCardActive: {
    backgroundColor: '#4F8EF720',
    borderColor: '#4F8EF7',
  },
  formatCardLocked: {
    opacity: 0.6,
  },
  formatIconRow: {
    position: 'relative',
    marginBottom: 6,
  },
  lockIcon: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
  formatLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#241814',
    marginBottom: 2,
  },
  formatLabelActive: {
    color: '#4F8EF7',
  },
  formatDesc: {
    fontSize: 9,
    color: '#988275',
    textAlign: 'center',
    lineHeight: 13,
  },
  proTag: {
    fontSize: 8,
    fontWeight: '900',
    color: '#F59E0B',
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#241814',
  },
  summaryLabel: {
    fontSize: 9,
    color: '#988275',
    fontWeight: '600',
    marginTop: 2,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F8EF7',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#241814',
  },
  upgradeBanner: {
    backgroundColor: '#F59E0B10',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  upgradeDesc: {
    fontSize: 11,
    color: '#D97706',
    lineHeight: 16,
    marginBottom: 10,
  },
  upgradeButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A0A1A',
  },
});
