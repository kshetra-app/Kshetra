import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';
import type { ConstituencySeed, ConstituencyDemographics, MLAProfile } from '@/lib/data';
import {
  TELANGANA_CONSTITUENCIES,
  getMLAProfile,
  getConstituencyDemographics,
  getConstituencyHistory,
  isPartyStronghold,
} from '@/lib/data';

interface CompareSheetProps {
  visible: boolean;
  initialAcNo?: number;
  onClose: () => void;
}

function StatCompare({
  label,
  leftValue,
  rightValue,
  format = 'number',
  higherIsBetter = true,
}: {
  label: string;
  leftValue: number;
  rightValue: number;
  format?: 'number' | 'pct' | 'compact';
  higherIsBetter?: boolean;
}) {
  const leftBetter = higherIsBetter ? leftValue > rightValue : leftValue < rightValue;
  const rightBetter = higherIsBetter ? rightValue > leftValue : rightValue < leftValue;

  const fmt = (v: number) => {
    if (format === 'pct') return `${v}%`;
    if (format === 'compact') return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);
    return v.toLocaleString();
  };

  return (
    <View style={styles.statRow}>
      <Text style={[styles.statValue, leftBetter && styles.statBetter]}>
        {fmt(leftValue)}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, rightBetter && styles.statBetter]}>
        {fmt(rightValue)}
      </Text>
    </View>
  );
}

function ConstituencyPicker({
  constituencies,
  onSelect,
}: {
  constituencies: ConstituencySeed[];
  onSelect: (c: ConstituencySeed) => void;
}) {
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    if (!q.trim()) return constituencies.slice(0, 20);
    const query = q.toLowerCase();
    return constituencies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.district.toLowerCase().includes(query) ||
          String(c.acNo).includes(query),
      )
      .slice(0, 20);
  }, [q, constituencies]);

  return (
    <View style={styles.picker}>
      <View style={styles.pickerSearch}>
        <Ionicons name="search" size={16} color="#6B7280" />
        <TextInput
          style={styles.pickerInput}
          placeholder="Search..."
          placeholderTextColor="#4B5563"
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(c) => String(c.acNo)}
        keyboardShouldPersistTaps="handled"
        style={styles.pickerList}
        renderItem={({ item }) => (
          <Pressable style={styles.pickerItem} onPress={() => onSelect(item)}>
            <View style={[styles.pickerDot, { backgroundColor: getPartyColor(item.winner2023) }]} />
            <Text style={styles.pickerName}>{item.name}</Text>
            <Text style={styles.pickerAc}>#{item.acNo}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export default function CompareSheet({ visible, initialAcNo, onClose }: CompareSheetProps) {
  const [leftAcNo, setLeftAcNo] = useState<number | null>(initialAcNo ?? null);
  const [rightAcNo, setRightAcNo] = useState<number | null>(null);
  const [pickingSide, setPickingSide] = useState<'left' | 'right' | null>(null);

  const left = useMemo(
    () => (leftAcNo ? TELANGANA_CONSTITUENCIES.find((c) => c.acNo === leftAcNo) : undefined),
    [leftAcNo],
  );
  const right = useMemo(
    () => (rightAcNo ? TELANGANA_CONSTITUENCIES.find((c) => c.acNo === rightAcNo) : undefined),
    [rightAcNo],
  );

  const leftDemo = leftAcNo ? getConstituencyDemographics(leftAcNo) : null;
  const rightDemo = rightAcNo ? getConstituencyDemographics(rightAcNo) : null;
  const leftMLA = leftAcNo ? getMLAProfile(leftAcNo) : null;
  const rightMLA = rightAcNo ? getMLAProfile(rightAcNo) : null;
  const leftHist = leftAcNo ? getConstituencyHistory(leftAcNo) : null;
  const rightHist = rightAcNo ? getConstituencyHistory(rightAcNo) : null;

  const handlePick = useCallback(
    (c: ConstituencySeed) => {
      if (pickingSide === 'left') setLeftAcNo(c.acNo);
      else setRightAcNo(c.acNo);
      setPickingSide(null);
    },
    [pickingSide],
  );

  const handleSwap = useCallback(() => {
    setLeftAcNo(rightAcNo);
    setRightAcNo(leftAcNo);
  }, [leftAcNo, rightAcNo]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compare</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Constituency selectors */}
        <View style={styles.selectorsRow}>
          <Pressable style={styles.selector} onPress={() => setPickingSide('left')}>
            {left ? (
              <>
                <View style={[styles.selectorDot, { backgroundColor: getPartyColor(left.winner2023) }]} />
                <Text style={styles.selectorName} numberOfLines={1}>{left.name}</Text>
              </>
            ) : (
              <Text style={styles.selectorPlaceholder}>Select A</Text>
            )}
          </Pressable>

          <Pressable style={styles.swapButton} onPress={handleSwap}>
            <Ionicons name="swap-horizontal" size={20} color="#4F8EF7" />
          </Pressable>

          <Pressable style={styles.selector} onPress={() => setPickingSide('right')}>
            {right ? (
              <>
                <View style={[styles.selectorDot, { backgroundColor: getPartyColor(right.winner2023) }]} />
                <Text style={styles.selectorName} numberOfLines={1}>{right.name}</Text>
              </>
            ) : (
              <Text style={styles.selectorPlaceholder}>Select B</Text>
            )}
          </Pressable>
        </View>

        {/* Picker overlay */}
        {pickingSide && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                Select Constituency {pickingSide === 'left' ? 'A' : 'B'}
              </Text>
              <Pressable onPress={() => setPickingSide(null)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </Pressable>
            </View>
            <ConstituencyPicker
              constituencies={TELANGANA_CONSTITUENCIES}
              onSelect={handlePick}
            />
          </View>
        )}

        {/* Comparison content */}
        {left && right && !pickingSide && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Party headers */}
            <View style={styles.partyRow}>
              <View style={[styles.partyBadge, { backgroundColor: getPartyColor(left.winner2023) }]}>
                <Text style={styles.partyText}>{left.winner2023}</Text>
              </View>
              <Text style={styles.vsText}>vs</Text>
              <View style={[styles.partyBadge, { backgroundColor: getPartyColor(right.winner2023) }]}>
                <Text style={styles.partyText}>{right.winner2023}</Text>
              </View>
            </View>

            {/* MLA names */}
            <View style={styles.statRow}>
              <Text style={styles.mlaName} numberOfLines={1}>{left.winnerName2023}</Text>
              <Text style={styles.statLabel}>MLA</Text>
              <Text style={styles.mlaName} numberOfLines={1}>{right.winnerName2023}</Text>
            </View>

            {/* Election stats */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionLabel}>2023 Election</Text>
            </View>
            <StatCompare label="Winner Votes" leftValue={left.winnerVotes2023} rightValue={right.winnerVotes2023} format="compact" />
            <StatCompare label="Margin" leftValue={left.margin2023} rightValue={right.margin2023} format="compact" />
            <StatCompare
              label="Margin %"
              leftValue={parseFloat(((left.margin2023 / Math.max(left.winnerVotes2023, 1)) * 100).toFixed(1))}
              rightValue={parseFloat(((right.margin2023 / Math.max(right.winnerVotes2023, 1)) * 100).toFixed(1))}
              format="pct"
            />

            {/* Demographics */}
            {leftDemo && rightDemo && (
              <>
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionLabel}>Demographics</Text>
                </View>
                <StatCompare label="Population" leftValue={leftDemo.population} rightValue={rightDemo.population} format="compact" />
                <StatCompare label="Total Voters" leftValue={leftDemo.totalVoters} rightValue={rightDemo.totalVoters} format="compact" />
                <StatCompare label="Turnout 2023" leftValue={leftDemo.turnout2023} rightValue={rightDemo.turnout2023} format="pct" />
                <StatCompare label="Literacy" leftValue={leftDemo.literacy} rightValue={rightDemo.literacy} format="pct" />
                <StatCompare label="Urban %" leftValue={leftDemo.urbanPercent} rightValue={rightDemo.urbanPercent} format="pct" />
                <StatCompare label="SC %" leftValue={leftDemo.scPercent} rightValue={rightDemo.scPercent} format="pct" />
                <StatCompare label="ST %" leftValue={leftDemo.stPercent} rightValue={rightDemo.stPercent} format="pct" />
                <StatCompare label="Area (km²)" leftValue={leftDemo.areaSqKm} rightValue={rightDemo.areaSqKm} />
              </>
            )}

            {/* MLA Profile */}
            {leftMLA && rightMLA && (
              <>
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionLabel}>MLA Profile</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statValue}>{leftMLA.gender === 'M' ? 'Male' : 'Female'}</Text>
                  <Text style={styles.statLabel}>Gender</Text>
                  <Text style={styles.statValue}>{rightMLA.gender === 'M' ? 'Male' : 'Female'}</Text>
                </View>
                <StatCompare label="Terms" leftValue={leftMLA.terms} rightValue={rightMLA.terms} />
              </>
            )}

            {/* History */}
            {leftHist && rightHist && (
              <>
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionLabel}>Historical Comparison</Text>
                </View>
                {([2014, 2018] as const).map((yr) => {
                  const lh = yr === 2014 ? leftHist.ac2014 : leftHist.ac2018;
                  const rh = yr === 2014 ? rightHist.ac2014 : rightHist.ac2018;
                  if (!lh || !rh) return null;
                  return (
                    <View key={yr} style={styles.statRow}>
                      <Text style={[styles.statValue, { color: getPartyColor(lh.party === 'TRS' ? 'BRS' : lh.party) }]}>
                        {lh.party}
                      </Text>
                      <Text style={styles.statLabel}>{yr} Winner</Text>
                      <Text style={[styles.statValue, { color: getPartyColor(rh.party === 'TRS' ? 'BRS' : rh.party) }]}>
                        {rh.party}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.statRow}>
                  <View style={styles.badgeWrap}>
                    {leftAcNo && isPartyStronghold(leftAcNo, left.winner2023) ? (
                      <View style={styles.strongholdBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                        <Text style={styles.strongholdText}>Stronghold</Text>
                      </View>
                    ) : (
                      <View style={styles.swingBadge}>
                        <Ionicons name="swap-horizontal" size={12} color="#F59E0B" />
                        <Text style={styles.swingText}>Swing</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.statLabel}>Loyalty</Text>
                  <View style={styles.badgeWrap}>
                    {rightAcNo && isPartyStronghold(rightAcNo, right.winner2023) ? (
                      <View style={styles.strongholdBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                        <Text style={styles.strongholdText}>Stronghold</Text>
                      </View>
                    ) : (
                      <View style={styles.swingBadge}>
                        <Ionicons name="swap-horizontal" size={12} color="#F59E0B" />
                        <Text style={styles.swingText}>Swing</Text>
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}

        {/* Prompt to select both */}
        {(!left || !right) && !pickingSide && (
          <View style={styles.emptyState}>
            <Ionicons name="git-compare" size={48} color="#1F2937" />
            <Text style={styles.emptyText}>
              Select two constituencies to compare them side by side
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  selector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  selectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectorName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectorPlaceholder: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F8EF720',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 16,
  },
  partyBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  partyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  sectionDivider: {
    borderTopWidth: 0.5,
    borderTopColor: '#1F2937',
    marginTop: 16,
    paddingTop: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F8EF7',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statBetter: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    width: 90,
  },
  mlaName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  badgeWrap: {
    flex: 1,
  },
  strongholdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  strongholdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  swingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  swingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
  },
  // ─── Picker ───
  pickerOverlay: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  picker: {
    flex: 1,
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  pickerInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    height: 40,
  },
  pickerList: {
    flex: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
    gap: 10,
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerAc: {
    fontSize: 12,
    color: '#6B7280',
  },
});
