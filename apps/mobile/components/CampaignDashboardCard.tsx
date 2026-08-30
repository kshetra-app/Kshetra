import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Campaign } from '../lib/campaignTypes';
import { CAMPAIGN_TYPE_CONFIG, formatBudget } from '../lib/campaignTypes';

interface CampaignDashboardCardProps {
  campaign: Campaign;
  onPress?: () => void;
}

export default function CampaignDashboardCard({ campaign, onPress }: CampaignDashboardCardProps) {
  const { t } = useTranslation();
  const typeConfig = CAMPAIGN_TYPE_CONFIG[campaign.type];
  const budgetUtilization = campaign.totalBudgetINR > 0 ? Math.round((campaign.spentBudgetINR / campaign.totalBudgetINR) * 100) : 0;
  const engagementRate = campaign.impressions > 0 ? ((campaign.engagements / campaign.impressions) * 100).toFixed(1) : '0';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '15' }]}>
          <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
          <Text style={[styles.typeLabel, { color: typeConfig.color }]}>{typeConfig.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: campaign.status === 'active' ? '#10B98120' : '#6B728020' }]}>
          <View style={[styles.statusDot, { backgroundColor: campaign.status === 'active' ? '#10B981' : '#6B7280' }]} />
          <Text style={[styles.statusText, { color: campaign.status === 'active' ? '#10B981' : '#6B7280' }]}>{campaign.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.name}>{campaign.name}</Text>
      <Text style={styles.politician}>{campaign.politicianName}{campaign.party ? ` · ${campaign.party}` : ''} · {campaign.stateCode}</Text>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpi}>
          <Ionicons name="eye" size={16} color="#3B82F6" />
          <Text style={styles.kpiValue}>{campaign.impressions > 1000000 ? `${(campaign.impressions / 1000000).toFixed(1)}M` : `${Math.round(campaign.impressions / 1000)}K`}</Text>
          <Text style={styles.kpiLabel}>{t('campaignManager.impressions')}</Text>
        </View>
        <View style={styles.kpi}>
          <Ionicons name="people" size={16} color="#8B5CF6" />
          <Text style={styles.kpiValue}>{campaign.reach > 1000000 ? `${(campaign.reach / 1000000).toFixed(1)}M` : `${Math.round(campaign.reach / 1000)}K`}</Text>
          <Text style={styles.kpiLabel}>{t('outreach.reach')}</Text>
        </View>
        <View style={styles.kpi}>
          <Ionicons name="heart" size={16} color="#EC4899" />
          <Text style={styles.kpiValue}>{engagementRate}%</Text>
          <Text style={styles.kpiLabel}>{t('outreach.engagement')}</Text>
        </View>
        <View style={styles.kpi}>
          <Ionicons name="trending-up" size={16} color="#10B981" />
          <Text style={styles.kpiValue}>{campaign.sentimentScore}</Text>
          <Text style={styles.kpiLabel}>{t('outreach.sentiment')}</Text>
        </View>
      </View>

      {/* Budget Bar */}
      <View style={styles.budgetSection}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetLabel}>{t('campaignManager.budget')}: {formatBudget(campaign.spentBudgetINR)} / {formatBudget(campaign.totalBudgetINR)}</Text>
          <Text style={[styles.budgetPct, { color: budgetUtilization > 80 ? '#EF4444' : '#10B981' }]}>{budgetUtilization}%</Text>
        </View>
        <View style={styles.budgetBar}>
          <View style={[styles.budgetBarFill, { width: `${Math.min(budgetUtilization, 100)}%`, backgroundColor: budgetUtilization > 80 ? '#EF4444' : '#4F8EF7' }]} />
        </View>
      </View>

      {/* Bottom stats */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomStat}>
          <Ionicons name="megaphone" size={12} color="#6B7280" />
          <Text style={styles.bottomStatText}>{campaign.adCount} {t('campaignManager.tabs.ads').toLowerCase()}</Text>
        </View>
        <View style={styles.bottomStat}>
          <Ionicons name="people" size={12} color="#6B7280" />
          <Text style={styles.bottomStatText}>{campaign.volunteerCount} {t('campaignManager.volunteers').toLowerCase()}</Text>
        </View>
        <View style={styles.bottomStat}>
          <Ionicons name="location" size={12} color="#6B7280" />
          <Text style={styles.bottomStatText}>{campaign.boothsCovered}/{campaign.totalBooths} {t('hierarchy.booths').toLowerCase()}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: '#E8DED1' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeLabel: { fontSize: 11, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '800', color: '#241814', marginBottom: 2 },
  politician: { fontSize: 12, color: '#988275', marginBottom: 14 },
  kpiGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  kpi: { alignItems: 'center', gap: 3 },
  kpiValue: { fontSize: 16, fontWeight: '800', color: '#241814' },
  kpiLabel: { fontSize: 9, color: '#988275', fontWeight: '600' },
  budgetSection: { marginBottom: 12 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  budgetLabel: { fontSize: 11, color: '#6D5549', fontWeight: '600' },
  budgetPct: { fontSize: 12, fontWeight: '800' },
  budgetBar: { height: 6, backgroundColor: '#E8DED1', borderRadius: 3, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 3 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  bottomStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bottomStatText: { fontSize: 11, color: '#988275', fontWeight: '600' },
});
