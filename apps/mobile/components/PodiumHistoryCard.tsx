import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '../lib/constants';
import CandidateAvatar from './CandidateAvatar';
import { useTheme } from '../lib/theme';
import type { HistoricalResultRow } from '../lib/seedDataLoader';

interface PodiumHistoryCardProps {
  item: HistoricalResultRow;
  isLatest?: boolean;
}

export default function PodiumHistoryCard({ item, isLatest = false }: PodiumHistoryCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const currentLang = i18n.language || 'en';

  const localizedNames = useMemo(() => {
    try {
      return item.localized_names_json ? JSON.parse(item.localized_names_json) : null;
    } catch {
      return null;
    }
  }, [item.localized_names_json]);

  const localizedParties = useMemo(() => {
    try {
      return item.localized_parties_json ? JSON.parse(item.localized_parties_json) : null;
    } catch {
      return null;
    }
  }, [item.localized_parties_json]);

  // Candidate Names
  const winnerName = localizedNames?.winner?.[currentLang] || item.winner_name || item.winner || 'Winner';
  const ru1Name = localizedNames?.ru1?.[currentLang] || item.first_runner_up_name || (item.first_runner_up_party ? `${item.first_runner_up_party} Candidate` : 'Runner Up 1');
  const ru2Name = localizedNames?.ru2?.[currentLang] || item.second_runner_up_name || (item.second_runner_up_party ? `${item.second_runner_up_party} Candidate` : 'Runner Up 2');

  // Parties
  const winnerParty = localizedParties?.winner?.[currentLang] || item.winner_party || item.party || 'IND';
  const ru1Party = localizedParties?.ru1?.[currentLang] || item.first_runner_up_party || 'IND';
  const ru2Party = localizedParties?.ru2?.[currentLang] || item.second_runner_up_party || 'IND';

  const winnerVotes = item.winner_votes || 0;
  const ru1Votes = item.first_runner_up_votes || 0;
  const ru2Votes = item.second_runner_up_votes || 0;

  const winnerVoteShare = item.winner_vote_share || 0;
  const ru1VoteShare = item.first_runner_up_vote_share || 0;
  const ru2VoteShare = item.second_runner_up_vote_share || 0;

  const margin1 = item.margin_winner_to_runner_up_1 != null
    ? item.margin_winner_to_runner_up_1
    : (winnerVotes > 0 && ru1Votes > 0 ? winnerVotes - ru1Votes : null);

  const margin2 = item.margin_winner_to_runner_up_2 != null
    ? item.margin_winner_to_runner_up_2
    : (winnerVotes > 0 && ru2Votes > 0 ? winnerVotes - ru2Votes : null);

  const marginRu1ToRu2 = item.margin_runner_up_1_to_runner_up_2 != null
    ? item.margin_runner_up_1_to_runner_up_2
    : (ru1Votes > 0 && ru2Votes > 0 ? ru1Votes - ru2Votes : null);

  const hasPodium = Boolean(item.first_runner_up_name || item.first_runner_up_party);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isLatest && styles.latestCard]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.year, { color: colors.text }]}>{item.year}</Text>
          {isLatest && (
            <View style={styles.latestBadge}>
              <Text style={styles.latestBadgeText}>{t('constituency.current', { defaultValue: 'Current' })}</Text>
            </View>
          )}
          {item.delimitation_id && (
            <View style={styles.delimBadge}>
              <Text style={styles.delimBadgeText}>
                {item.delimitation_id === '4' ? 'Delim 2008' : 'Delim 1976'}
              </Text>
            </View>
          )}
        </View>

        {item.total_valid_votes ? (
          <Text style={[styles.validVotes, { color: colors.textMuted }]}>
            {item.total_valid_votes.toLocaleString()} {t('common.votes', { defaultValue: 'votes' })}
          </Text>
        ) : null}
      </View>

      {/* Podium Rows */}
      {/* ── 1. WINNER (RANK 1) ── */}
      <View style={[styles.podiumRow, styles.winnerRow]}>
        <View style={[styles.medalBadge, styles.goldBadge]}>
          <Text style={styles.goldBadgeText}>🥇 1st</Text>
        </View>

        <CandidateAvatar name={winnerName} party={item.winner_party || item.party} size={36} />

        <View style={styles.candInfo}>
          <View style={styles.candNameRow}>
            <Text style={[styles.candName, { color: colors.text }]} numberOfLines={1}>
              {winnerName}
            </Text>
            <Ionicons name="trophy" size={13} color="#F59E0B" />
          </View>
          <View style={styles.partyRow}>
            <View style={[styles.partyDot, { backgroundColor: getPartyColor(item.winner_party || item.party) }]} />
            <Text style={[styles.partyText, { color: colors.textSecondary }]} numberOfLines={1}>
              {winnerParty}
            </Text>
            {item.winner_education && (
              <Text style={[styles.metaText, { color: colors.textMuted }]}>· {item.winner_education}</Text>
            )}
          </View>
        </View>

        <View style={styles.voteStats}>
          <Text style={[styles.voteCount, { color: colors.text }]}>
            {winnerVotes > 0 ? winnerVotes.toLocaleString() : '-'}
          </Text>
          {winnerVoteShare > 0 && (
            <Text style={[styles.voteShare, { color: '#F59E0B' }]}>{winnerVoteShare}%</Text>
          )}
        </View>
      </View>

      {/* ── 2. 1ST RUNNER UP (RANK 2) ── */}
      {hasPodium && (
        <View style={styles.podiumRow}>
          <View style={[styles.medalBadge, styles.silverBadge]}>
            <Text style={styles.silverBadgeText}>🥈 2nd</Text>
          </View>

          <CandidateAvatar name={ru1Name} party={item.first_runner_up_party || 'IND'} size={32} />

          <View style={styles.candInfo}>
            <Text style={[styles.candNameSecondary, { color: colors.text }]} numberOfLines={1}>
              {ru1Name}
            </Text>
            <View style={styles.partyRow}>
              <View style={[styles.partyDot, { backgroundColor: getPartyColor(item.first_runner_up_party || 'IND') }]} />
              <Text style={[styles.partyText, { color: colors.textSecondary }]} numberOfLines={1}>
                {ru1Party}
              </Text>
            </View>
          </View>

          <View style={styles.voteStats}>
            <Text style={[styles.voteCountSecondary, { color: colors.textSecondary }]}>
              {ru1Votes > 0 ? ru1Votes.toLocaleString() : '-'}
            </Text>
            {margin1 != null && margin1 > 0 && (
              <View style={styles.marginBadge}>
                <Text style={styles.marginBadgeText}>-{margin1.toLocaleString()}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── 3. 2ND RUNNER UP (RANK 3) ── */}
      {Boolean(item.second_runner_up_name || item.second_runner_up_party) && (
        <View style={styles.podiumRow}>
          <View style={[styles.medalBadge, styles.bronzeBadge]}>
            <Text style={styles.bronzeBadgeText}>🥉 3rd</Text>
          </View>

          <CandidateAvatar name={ru2Name} party={item.second_runner_up_party || 'IND'} size={32} />

          <View style={styles.candInfo}>
            <Text style={[styles.candNameSecondary, { color: colors.text }]} numberOfLines={1}>
              {ru2Name}
            </Text>
            <View style={styles.partyRow}>
              <View style={[styles.partyDot, { backgroundColor: getPartyColor(item.second_runner_up_party || 'IND') }]} />
              <Text style={[styles.partyText, { color: colors.textSecondary }]} numberOfLines={1}>
                {ru2Party}
              </Text>
            </View>
          </View>

          <View style={styles.voteStats}>
            <Text style={[styles.voteCountSecondary, { color: colors.textSecondary }]}>
              {ru2Votes > 0 ? ru2Votes.toLocaleString() : '-'}
            </Text>
            {margin2 != null && margin2 > 0 && (
              <View style={[styles.marginBadge, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[styles.marginBadgeText, { color: '#6B7280' }]}>-{margin2.toLocaleString()}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Comparative Vote Share Bar */}
      {winnerVoteShare > 0 && ru1VoteShare > 0 && (
        <View style={styles.barContainer}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${winnerVoteShare}%`, backgroundColor: getPartyColor(item.winner_party || item.party) }]} />
            <View style={[styles.barFill, { width: `${ru1VoteShare}%`, backgroundColor: getPartyColor(item.first_runner_up_party || 'IND') }]} />
            {ru2VoteShare > 0 && (
              <View style={[styles.barFill, { width: `${ru2VoteShare}%`, backgroundColor: getPartyColor(item.second_runner_up_party || 'IND') }]} />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  latestCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  year: {
    fontSize: 16,
    fontWeight: '800',
  },
  latestBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  delimBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  delimBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  validVotes: {
    fontSize: 11,
    fontWeight: '500',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  winnerRow: {
    backgroundColor: '#FEF3C720',
    borderRadius: 8,
    paddingHorizontal: 6,
    marginHorizontal: -4,
  },
  medalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  goldBadge: {
    backgroundColor: '#FEF3C7',
  },
  goldBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  silverBadge: {
    backgroundColor: '#F1F5F9',
  },
  silverBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  bronzeBadge: {
    backgroundColor: '#FFF7ED',
  },
  bronzeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
  },
  candInfo: {
    flex: 1,
  },
  candNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  candName: {
    fontSize: 13,
    fontWeight: '700',
  },
  candNameSecondary: {
    fontSize: 12,
    fontWeight: '600',
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  partyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  partyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaText: {
    fontSize: 10,
  },
  voteStats: {
    alignItems: 'flex-end',
  },
  voteCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  voteCountSecondary: {
    fontSize: 12,
    fontWeight: '500',
  },
  voteShare: {
    fontSize: 10,
    fontWeight: '700',
  },
  marginBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  marginBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  barContainer: {
    marginTop: 6,
    paddingTop: 4,
  },
  barTrack: {
    flexDirection: 'row',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
  },
});
