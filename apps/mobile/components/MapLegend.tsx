import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '../lib/constants';
import { PARTY_CONFIG, STATES } from '@kshetra/shared';
import { getUnifiedConstituenciesForState } from '../lib/stateDataAdapter';
import type { MapColorMode } from './MapColorToggle';
import { useTheme } from '../lib/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Build party legend dynamically from a state's seed data, sorted by seat count */
function buildPartyLegend(stateCode: string): { party: string; label: string; seats: number }[] {
  if (stateCode.toUpperCase() === 'IN') {
    const counts = new Map<string, number>();
    for (const state of Object.values(STATES)) {
      const p = state.rulingParty;
      if (p) {
        counts.set(p, (counts.get(p) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([party, statesRuled]) => ({
        party,
        label: (PARTY_CONFIG as Record<string, { name: string }>)[party]?.name ?? party,
        seats: statesRuled,
      }));
  }

  const constituencies = getUnifiedConstituenciesForState(stateCode);
  if (constituencies.length === 0) return [];

  const counts = new Map<string, number>();
  for (const c of constituencies) {
    const p = c.currentParty || c.winnerParty;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // top 8 parties max
    .map(([party, seats]) => ({
      party,
      label: (PARTY_CONFIG as Record<string, { name: string }>)[party]?.name ?? party,
      seats,
    }));
}

const MARGIN_LEGEND = [
  { color: '#8B5CF6', label: '> 100,000 (Massive)' },
  { color: '#3B82F6', label: '50,000 – 100,000 (Landslide)' },
  { color: '#10B981', label: '20,000 – 50,000 (Comfortable)' },
  { color: '#F59E0B', label: '5,000 – 20,000 (Competitive)' },
  { color: '#EF4444', label: '< 5,000 (Razor Thin)' },
];

const RESERVATION_LEGEND = [
  { color: '#6366F1', label: 'General (GEN)' },
  { color: '#F59E0B', label: 'Scheduled Caste (SC)' },
  { color: '#10B981', label: 'Scheduled Tribe (ST)' },
];

const TURNOUT_LEGEND = [
  { color: '#059669', label: '> 82% (High Turnout)' },
  { color: '#10B981', label: '76% – 82% (Good)' },
  { color: '#FBBF24', label: '72% – 76% (Moderate)' },
  { color: '#F59E0B', label: '68% – 72% (Below Average)' },
  { color: '#EF4444', label: '< 68% (Low Turnout)' },
];

const LITERACY_LEGEND = [
  { color: '#059669', label: '> 80% (High Literacy)' },
  { color: '#10B981', label: '70% – 80% (Good)' },
  { color: '#FBBF24', label: '60% – 70% (Moderate)' },
  { color: '#F59E0B', label: '50% – 60% (Low)' },
  { color: '#EF4444', label: '< 50% (Critical)' },
];

const POPULATION_LEGEND = [
  { color: '#1D4ED8', label: '> 350,000 (Very Dense)' },
  { color: '#2563EB', label: '310,000 – 350,000 (Dense)' },
  { color: '#3B82F6', label: '280,000 – 310,000 (Medium)' },
  { color: '#60A5FA', label: '250,000 – 280,000 (Moderate)' },
  { color: '#DBEAFE', label: '< 250,000 (Sparse)' },
];

const BATTLEGROUND_LEGEND = [
  { color: '#DC2626', label: 'Critical Margin (< 2,000)' },
  { color: '#F59E0B', label: 'Competitive (2,000 – 5,000)' },
  { color: '#10B981', label: 'Safe Seat (>= 5,000)' },
];

const SWING_LEGEND = [
  { color: '#8B5CF6', label: 'Swing Seat (Party Switched)' },
  { color: '#10B981', label: 'Retained Seat (Same Party)' },
  { color: '#6B7280', label: 'No History Available' },
];

interface MapLegendProps {
  colorMode?: MapColorMode;
  stateCode?: string;
  initialX?: number;
  initialTop?: number;
}

export default function MapLegend({
  colorMode = 'party',
  stateCode = 'TS',
  initialX = 16,
  initialTop = 160,
}: MapLegendProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const partyLegend = useMemo(() => buildPartyLegend(stateCode), [stateCode]);

  // Floating Draggable Pan State
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialTop })).current;
  const currentPos = useRef({ x: initialX, y: initialTop });
  const [panelOpensUpward, setPanelOpensUpward] = useState(false);

  useEffect(() => {
    if (initialTop != null && currentPos.current.y === 160) {
      pan.setValue({ x: initialX, y: initialTop });
      currentPos.current = { x: initialX, y: initialTop };
    }
  }, [initialTop, initialX, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const newX = Math.min(Math.max(10, currentPos.current.x + gestureState.dx), SCREEN_WIDTH - 110);
        const newY = Math.min(Math.max(60, currentPos.current.y + gestureState.dy), SCREEN_HEIGHT - 130);

        currentPos.current = { x: newX, y: newY };
        pan.setValue({ x: newX, y: newY });
        setPanelOpensUpward(newY > SCREEN_HEIGHT * 0.55);

        // If movement was small, treat as a tap
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          setExpanded((prev) => !prev);
        }
      },
    })
  ).current;

  const renderContent = () => {
    if (colorMode === 'margin') {
      return (
        <>
          <Text style={[styles.panelTitle, { color: colors.textMuted }]}>{t('mapLegend.victoryMargin')}</Text>
          {MARGIN_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'reservation') {
      return (
        <>
          <Text style={[styles.panelTitle, { color: colors.textMuted }]}>{t('mapLegend.seatCategory')}</Text>
          {RESERVATION_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'turnout') {
      return (
        <>
          <Text style={[styles.panelTitle, { color: colors.textMuted }]}>Voter Turnout</Text>
          {TURNOUT_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'literacy') {
      return (
        <>
          <Text style={[styles.panelTitle, { color: colors.textMuted }]}>Literacy Rate</Text>
          {LITERACY_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'population') {
      return (
        <>
          <Text style={[styles.panelTitle, { color: colors.textMuted }]}>Population Density</Text>
          {POPULATION_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'battleground') {
      return (
        <>
          <Text style={[styles.panelTitle, { color: colors.textMuted }]}>{t('mapLegend.competitiveness')}</Text>
          {BATTLEGROUND_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'swing') {
      return (
        <>
          <Text style={[styles.panelTitle, { color: colors.textMuted }]}>{t('mapLegend.seatStatus')}</Text>
          {SWING_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    // Default: party legend
    return (
      <>
        <Text style={[styles.panelTitle, { color: colors.textMuted }]}>
          {stateCode === 'IN' ? t('mapLegend.stateParties') : t('mapLegend.parties')}
        </Text>
        {partyLegend.map((item) => {
          const color = getPartyColor(item.party);
          return (
            <View key={item.party} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={[styles.partyCode, { color: colors.text }]}>{item.party}</Text>
              <Text style={[styles.partyName, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </>
    );
  };

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.toggle}>
        <Ionicons name="reorder-two" size={14} color="#94A3B8" style={{ marginRight: 2 }} />
        <Ionicons
          name={expanded ? 'close' : 'information-circle'}
          size={14}
          color="#FCD34D"
          style={{ marginRight: 4 }}
        />
        <Text style={styles.toggleText}>{t('mapLegend.legend')}</Text>
      </View>

      {expanded && (
        <View style={[styles.panel, panelOpensUpward ? styles.panelUpwards : styles.panelDownwards]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitleText}>
              {t('mapLegend.legend').toUpperCase()}
            </Text>
            <Pressable onPress={() => setExpanded(false)} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: 220 }}
            showsVerticalScrollIndicator={false}
          >
            {renderContent()}

            {/* Always show Selected/Favorite markers */}
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={[styles.colorDot, styles.selectedDot]} />
              <Text style={[styles.partyName, { color: '#E2E8F0' }]}>{t('mapLegend.selected')}</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.colorDot, styles.favDot]} />
              <Text style={[styles.partyName, { color: '#E2E8F0' }]}>{t('mapLegend.favorite')}</Text>
            </View>
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 90,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172AF2',
    borderColor: '#C5A059',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 8,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  panel: {
    position: 'absolute',
    left: 0,
    borderRadius: 14,
    padding: 12,
    minWidth: 210,
    maxWidth: SCREEN_WIDTH * 0.75,
    backgroundColor: '#0F172AF8',
    borderColor: '#C5A059',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 100,
  },
  panelDownwards: {
    top: 36,
  },
  panelUpwards: {
    bottom: 36,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  panelTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCD34D',
    letterSpacing: 0.5,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedDot: {
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  favDot: {
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  partyCode: {
    fontSize: 12,
    fontWeight: '700',
    width: 44,
  },
  partyName: {
    fontSize: 11,
    flex: 1,
  },
  gradientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  gradientBar: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gradientBarHalf: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    borderRadius: 6,
  },
  gradientLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
});
