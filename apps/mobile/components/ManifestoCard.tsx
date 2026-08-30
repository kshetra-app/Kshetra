import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EManifesto, ManifestoItem } from '../lib/politicianPortalTypes';
import { MANIFESTO_CATEGORY_CONFIG } from '../lib/politicianPortalTypes';

interface ManifestoCardProps {
  manifesto: EManifesto;
  onPress?: () => void;
  onVoteItem?: (itemId: string, support: boolean) => void;
}

function ManifestoItemRow({ item, onVote }: { item: ManifestoItem; onVote?: (support: boolean) => void }) {
  const { t } = useTranslation();
  const catConfig = MANIFESTO_CATEGORY_CONFIG[item.category];
  const totalVotes = item.supportVotes + item.opposeVotes;
  const supportPct = totalVotes > 0 ? Math.round((item.supportVotes / totalVotes) * 100) : 0;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={[styles.catBadge, { backgroundColor: catConfig.color + '15' }]}>
          <Ionicons name={catConfig.icon as any} size={10} color={catConfig.color} />
          <Text style={[styles.catLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: item.priority === 'high' ? '#EF444420' : item.priority === 'medium' ? '#F59E0B20' : '#6B728020' }]}>
          <Text style={[styles.priorityText, { color: item.priority === 'high' ? '#EF4444' : item.priority === 'medium' ? '#F59E0B' : '#6B7280' }]}>{item.priority.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.itemMeta}>
        <Text style={styles.metaText}>📅 {item.timeline}</Text>
        {item.budgetEstimate && <Text style={styles.metaText}>💰 {item.budgetEstimate}</Text>}
      </View>

      {/* Vote bar */}
      <View style={styles.voteSection}>
        <View style={styles.voteBar}>
          <View style={[styles.voteBarFill, { width: `${supportPct}%`, backgroundColor: '#10B981' }]} />
        </View>
        <View style={styles.voteRow}>
          <Pressable style={styles.voteButton} onPress={() => onVote?.(true)}>
            <Ionicons name="thumbs-up" size={14} color="#10B981" />
            <Text style={[styles.voteCount, { color: '#10B981' }]}>{item.supportVotes}</Text>
          </Pressable>
          <Text style={styles.votePct}>{supportPct}% {t('civicMetrics.support')}</Text>
          <Pressable style={styles.voteButton} onPress={() => onVote?.(false)}>
            <Ionicons name="thumbs-down" size={14} color="#EF4444" />
            <Text style={[styles.voteCount, { color: '#EF4444' }]}>{item.opposeVotes}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function ManifestoCard({ manifesto, onPress, onVoteItem }: ManifestoCardProps) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{manifesto.title}</Text>
          <Text style={styles.author}>{manifesto.politicianName}{manifesto.party ? ` · ${manifesto.party}` : ''}</Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.statValue}>{manifesto.views}</Text>
          <Text style={styles.statLabel}>{t('politicianPortal.views')}</Text>
        </View>
      </View>

      {manifesto.preamble ? <Text style={styles.preamble} numberOfLines={3}>{manifesto.preamble}</Text> : null}

      {manifesto.items.slice(0, 3).map((item) => (
        <ManifestoItemRow key={item.id} item={item} onVote={onVoteItem ? (support) => onVoteItem(item.id, support) : undefined} />
      ))}

      {manifesto.items.length > 3 && (
        <Text style={styles.moreItems}>+{manifesto.items.length - 3} {t('politicianPortal.morePromises')}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: '#E8DED1' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  headerLeft: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: '#241814', lineHeight: 22 },
  author: { fontSize: 12, color: '#988275', marginTop: 2 },
  statsCol: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#4F8EF7' },
  statLabel: { fontSize: 10, color: '#988275' },
  preamble: { fontSize: 13, color: '#6D5549', lineHeight: 18, marginBottom: 12, fontStyle: 'italic' },
  itemCard: { backgroundColor: '#F5EFE4', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8DED1' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  catLabel: { fontSize: 10, fontWeight: '700' },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 9, fontWeight: '800' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#241814', marginBottom: 2 },
  itemDesc: { fontSize: 12, color: '#6D5549', lineHeight: 17, marginBottom: 6 },
  itemMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  metaText: { fontSize: 11, color: '#988275' },
  voteSection: { borderTopWidth: 1, borderTopColor: '#E8DED1', paddingTop: 8 },
  voteBar: { height: 4, backgroundColor: '#EF444430', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  voteBarFill: { height: '100%', borderRadius: 2 },
  voteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  voteButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  voteCount: { fontSize: 12, fontWeight: '700' },
  votePct: { fontSize: 11, color: '#988275', fontWeight: '600' },
  moreItems: { textAlign: 'center', fontSize: 12, color: '#4F8EF7', fontWeight: '600', marginTop: 4 },
});
