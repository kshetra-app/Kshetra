import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePoliticianPortalStore } from '../../stores/politicianPortal';
import PoliticianPortalCard from '../../components/PoliticianPortalCard';
import EventCard from '../../components/EventCard';
import ManifestoCard from '../../components/ManifestoCard';
import { useTheme } from '../../lib/theme';

type Tab = 'politicians' | 'events' | 'manifestos' | 'surveys';

const TAB_KEYS: { key: Tab; i18nKey: string; icon: string }[] = [
  { key: 'politicians', i18nKey: 'politicianPortal.tabPoliticians', icon: 'people' },
  { key: 'events', i18nKey: 'politicianPortal.tabEvents', icon: 'calendar' },
  { key: 'manifestos', i18nKey: 'politicianPortal.tabManifestos', icon: 'document-text' },
  { key: 'surveys', i18nKey: 'politicianPortal.tabSurveys', icon: 'bar-chart' },
];

export default function PoliticianPortalScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('politicians');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const politicians = usePoliticianPortalStore((s) => s.politicians);
  const events = usePoliticianPortalStore((s) => s.events);
  const manifestos = usePoliticianPortalStore((s) => s.manifestos);
  const surveys = usePoliticianPortalStore((s) => s.surveys);
  const rsvpEvent = usePoliticianPortalStore((s) => s.rsvpEvent);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => new Date(e.startTime).getTime() > Date.now() && e.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('politicianPortal.screenTitle'), headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary }} />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabBarContent}>
        {TAB_KEYS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 },
              activeTab === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={16} color={activeTab === tab.key ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: colors.textSecondary }, activeTab === tab.key && { color: '#FFFFFF', fontWeight: '700' }]}>{t(tab.i18nKey)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {activeTab === 'politicians' && (
          <>
            <Text style={styles.sectionTitle}>{t('politicianPortal.registeredPoliticians')}</Text>
            {politicians.map((p) => (
              <PoliticianPortalCard key={p.id} politician={p} />
            ))}
          </>
        )}

        {activeTab === 'events' && (
          <>
            {upcomingEvents.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>{t('politicianPortal.upcomingEvents')}</Text>
                {upcomingEvents.map((e) => (
                  <EventCard key={e.id} event={e} onRSVP={() => rsvpEvent(e.id)} />
                ))}
              </View>
            )}
            <Text style={styles.sectionTitle}>{t('politicianPortal.allEvents')}</Text>
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </>
        )}

        {activeTab === 'manifestos' && (
          <>
            <Text style={styles.sectionTitle}>{t('politicianPortal.eManifestos')}</Text>
            {manifestos.map((m) => (
              <ManifestoCard key={m.id} manifesto={m} />
            ))}
          </>
        )}

        {activeTab === 'surveys' && (
          <>
            <Text style={styles.sectionTitle}>{t('politicianPortal.opinionSurveys')}</Text>
            {surveys.map((s) => (
              <View key={s.id} style={styles.surveyCard}>
                <Text style={styles.surveyQuestion}>{s.title}</Text>
                <Text style={styles.surveyMeta}>{s.description} · {t('politicianPortal.responsesCount', { count: s.responseCount })}</Text>
                {s.questions.slice(0, 3).map((q) => (
                  <View key={q.id} style={styles.optionRow}>
                    <Text style={styles.optionLabel} numberOfLines={1}>{q.text}</Text>
                    <View style={[styles.typePill, { backgroundColor: q.isRequired ? '#EF444420' : '#6B728020' }]}>
                      <Text style={[styles.typeText, { color: q.isRequired ? '#EF4444' : '#6B7280' }]}>{q.type}</Text>
                    </View>
                  </View>
                ))}
                {s.results && (
                  <Text style={styles.resultsLabel}>{t('politicianPortal.completedResponses', { count: s.results.totalResponses })}</Text>
                )}
              </View>
            ))}
          </>
        )}

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { maxHeight: 48, borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabActive: {},
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  surveyCard: { borderRadius: 16, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1 },
  surveyQuestion: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  surveyMeta: { fontSize: 11, marginBottom: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  optionLabel: { fontSize: 12, width: 100 },
  optionBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  optionBarFill: { height: '100%', borderRadius: 4 },
  optionPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 9, fontWeight: '700' },
  resultsLabel: { fontSize: 11, fontWeight: '600', marginTop: 8 },
});
