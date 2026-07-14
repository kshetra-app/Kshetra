import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';

/**
 * DataPendingCard — the honest, zero-fabrication empty state.
 *
 * Rendered wherever a tier / seat exists structurally but no verified
 * office-holder data is available yet. NEVER shows synthesized data; it
 * explicitly tells the user the record is pending and where it will come from.
 */
interface DataPendingCardProps {
  /** What is pending, e.g. "Mayor", "Corporator for Ward 42", "Sarpanch". */
  title: string;
  /** Optional longer explanation. */
  message?: string;
  /** Where the data will be sourced from, e.g. "TSEC · Lok Dhaba". */
  sourceNote?: string;
  /** 'boundary' variant for missing map polygons. */
  variant?: 'record' | 'boundary';
  compact?: boolean;
}

export default function DataPendingCard({
  title,
  message,
  sourceNote,
  variant = 'record',
  compact,
}: DataPendingCardProps) {
  const { colors } = useTheme();

  const icon = variant === 'boundary' ? 'map-outline' : 'hourglass-outline';
  const heading =
    variant === 'boundary' ? `${title} — boundary pending` : `${title} — data pending`;

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.warning + '18' }]}>
          <Ionicons name={icon as any} size={compact ? 16 : 20} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{heading}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {message ??
              (variant === 'boundary'
                ? 'The official map boundary for this area has not been published yet. The list view remains fully accurate.'
                : 'This seat exists, but a verified office-holder record is not yet available. We only show data confirmed from official sources.')}
          </Text>
        </View>
      </View>

      {sourceNote ? (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Ionicons name="document-text-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]} numberOfLines={2}>
            Expected source: {sourceNote}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * SourceAttributionFooter — Wikipedia-style provenance line for verified /
 * crowdsourced records. Reusable across the drill-down and profile screens.
 */
export function SourceAttributionFooter({
  sourceType,
  sourceUrl,
  lastEditedBy,
  lastEditedAt,
  fingerprintVerified,
}: {
  sourceType?: string;
  sourceUrl?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  fingerprintVerified?: boolean;
}) {
  const { colors } = useTheme();
  const parts: string[] = [];
  if (sourceType) parts.push(`Sourced from ${sourceType}`);
  if (lastEditedBy) parts.push(`Last edited by ${lastEditedBy}`);
  if (lastEditedAt) {
    const d = new Date(lastEditedAt);
    if (!isNaN(d.getTime())) parts.push(d.toLocaleDateString('en-IN'));
  }

  if (parts.length === 0 && !sourceUrl) return null;

  return (
    <View style={[styles.attribution, { borderTopColor: colors.border }]}>
      <Ionicons name="shield-checkmark-outline" size={12} color={colors.textMuted} />
      <Text style={[styles.attributionText, { color: colors.textMuted }]}>
        {parts.join(' · ')}
        {fingerprintVerified ? ' · fingerprint ✓' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  cardCompact: { padding: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 12.5, marginTop: 3, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { fontSize: 11, flex: 1 },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attributionText: { fontSize: 11, flex: 1, fontStyle: 'italic' },
});
