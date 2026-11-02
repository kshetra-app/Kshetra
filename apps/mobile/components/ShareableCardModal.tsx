import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Share,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { getPartyColor } from '../lib/constants';
import { getStaticPhoto } from '../lib/candidatePhotos';
import CandidateAvatar from './CandidateAvatar';

export interface ShareableCardData {
  type: 'constituency' | 'legislator' | 'delimitation';
  title: string;
  subtitle?: string;
  stateCode: string;
  district?: string;
  category?: string; // GEN, SC, ST
  acNo?: number;
  winnerName?: string;
  winnerParty?: string;
  winnerVotes?: number;
  winnerVoteShare?: number;
  runnerUpName?: string;
  runnerUpParty?: string;
  runnerUpVotes?: number;
  margin?: number;
  turnoutPercent?: number;
  electorate?: number;
  // For Legislator:
  photoUrl?: string | null;
  age?: number | null;
  education?: string | null;
  criminalCases?: number | null;
  totalAssets?: number | null;
  terms?: number;
  shareUrl?: string;
  delimitationNote?: string;
}

interface ShareableCardModalProps {
  visible: boolean;
  onClose: () => void;
  data: ShareableCardData;
}

export default function ShareableCardModal({ visible, onClose, data }: ShareableCardModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const [sharingVisual, setSharingVisual] = useState(false);

  const partyColor = getPartyColor(data.winnerParty || 'IND');
  const ruPartyColor = getPartyColor(data.runnerUpParty || 'IND');
  const effectiveShareUrl = data.shareUrl || `https://poligram.in/constituency/${data.stateCode}-AC-${data.acNo || 1}`;

  // Formatted glamorous text message
  const generateGlamorousTextMessage = () => {
    const isLegislator = data.type === 'legislator';
    const isDelim = data.type === 'delimitation';

    if (isDelim) {
      return [
        '🏛️  POLIGRAM CIVIC INTELLIGENCE — DELIMITATION IMPACT',
        '═══════════════════════════════════════════════════════',
        `📍 ${data.title}`,
        data.subtitle ? `📌 ${data.subtitle}` : '',
        '',
        '📊 ASSESSMENT BREAKDOWN:',
        data.delimitationNote ? `• ${data.delimitationNote}` : '',
        data.turnoutPercent ? `• Electorate Impact: ${data.turnoutPercent}% shift` : '',
        '',
        '🔍 Verified Under Constitutional Seat Rebalancing Framework',
        '═══════════════════════════════════════════════════════',
        `📲 Check full boundary analysis: ${effectiveShareUrl}`,
      ].filter(Boolean).join('\n');
    }

    if (isLegislator) {
      const assetString = data.totalAssets
        ? `₹${(data.totalAssets / 10000000).toFixed(2)} Cr`
        : 'Disclosed in Affidavit';
      return [
        '🏛️  POLIGRAM ELECTED REPRESENTATIVE DOSSIER',
        '═══════════════════════════════════════════════════════',
        `👤 ${data.winnerName || data.title}`,
        `🚩 Party: ${data.winnerParty || 'IND'}`,
        data.district ? `📍 ${data.subtitle || data.district}` : '',
        data.terms ? `🎖️ Legislative Tenure: ${data.terms} Term${data.terms > 1 ? 's' : ''}` : '',
        '',
        '📋 TRANSPARENCY & AFFIDAVIT SUMMARY:',
        data.education ? `🎓 Education: ${data.education}` : '',
        data.criminalCases != null ? `⚖️ Declared Cases: ${data.criminalCases}` : '',
        data.totalAssets != null ? `💰 Declared Assets: ${assetString}` : '',
        '',
        '🔍 Source: ECI Candidate Affidavits (Form 26)',
        '═══════════════════════════════════════════════════════',
        `📲 View verified track record & voting record: ${effectiveShareUrl}`,
      ].filter(Boolean).join('\n');
    }

    // Default: Constituency Detailed Card
    return [
      `🏛️  POLIGRAM CIVIC INTELLIGENCE — ${data.title.toUpperCase()}`,
      '═══════════════════════════════════════════════════════',
      `📍 ${data.title} ${data.acNo ? `(AC #${data.acNo})` : ''}`,
      `${data.district ? `${data.district} District` : ''} ${data.category ? `• Category: ${data.category}` : ''}`.trim(),
      '',
      '🥇 WINNER (ELECTED MLA)',
      `👤 ${data.winnerName || 'Not Reported'}`,
      `🚩 Party: ${data.winnerParty || 'IND'}`,
      data.winnerVotes ? `🗳️ Votes Won: ${data.winnerVotes.toLocaleString()} ${data.winnerVoteShare ? `(${data.winnerVoteShare}%)` : ''}` : '',
      '',
      data.runnerUpName || data.runnerUpParty ? '🥈 RUNNER-UP' : '',
      data.runnerUpName ? `👤 ${data.runnerUpName}` : '',
      data.runnerUpParty ? `🚩 Party: ${data.runnerUpParty}` : '',
      data.runnerUpVotes ? `🗳️ Votes: ${data.runnerUpVotes.toLocaleString()}` : '',
      data.margin != null ? `📊 Winning Margin: ${data.margin.toLocaleString()} votes` : '',
      '',
      data.turnoutPercent ? `📈 Voter Turnout: ${data.turnoutPercent}%` : '',
      '🔍 Authoritative Source: Election Commission of India (ECI Form 21E)',
      '═══════════════════════════════════════════════════════',
      `📲 Explore full map, booths & historical podium: ${effectiveShareUrl}`,
    ].filter(Boolean).join('\n');
  };

  // Generate high-resolution HTML infographic card
  const generateHtmlCard = () => {
    const isLegislator = data.type === 'legislator';
    const staticPhoto = getStaticPhoto(data.winnerName || data.title) || data.photoUrl;
    const avatarHtml = staticPhoto
      ? `<img src="${staticPhoto}" style="width: 72px; height: 72px; border-radius: 36px; object-fit: cover; border: 3px solid ${partyColor};" />`
      : `<div style="width: 72px; height: 72px; border-radius: 36px; background: ${partyColor}22; border: 3px solid ${partyColor}; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: ${partyColor};">${(data.winnerName || 'P').charAt(0)}</div>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { background: #0F0D0C; color: #FFFFFF; display: flex; justify-content: center; align-items: center; padding: 24px; min-height: 100vh; }
          .card { width: 100%; max-width: 520px; background: linear-gradient(145deg, #1A1412 0%, #241814 100%); border-radius: 24px; border: 2px solid #C5A059; padding: 28px; box-shadow: 0 16px 40px rgba(0,0,0,0.6); position: relative; overflow: hidden; }
          .brand-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(197,160,89,0.3); padding-bottom: 12px; }
          .brand-logo { font-size: 16px; font-weight: 900; letter-spacing: 2px; color: #C5A059; text-transform: uppercase; }
          .status-badge { background: rgba(16,185,129,0.2); color: #10B981; border: 1px solid #10B981; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
          .title-area { margin-bottom: 20px; }
          .title-main { font-size: 26px; font-weight: 800; color: #FFFFFF; line-height: 1.2; }
          .meta-pill { display: inline-block; background: #C5A05922; color: #C5A059; border: 1px solid #C5A05944; border-radius: 8px; padding: 4px 10px; font-size: 12px; font-weight: 700; margin-top: 6px; }
          .podium-box { background: rgba(255,255,255,0.04); border-radius: 16px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.08); }
          .podium-row { display: flex; align-items: center; gap: 14px; }
          .rank-badge { font-size: 12px; font-weight: 800; padding: 4px 8px; border-radius: 8px; }
          .gold-rank { background: #F59E0B; color: #000; }
          .silver-rank { background: #94A3B8; color: #000; }
          .name-box { flex: 1; }
          .cand-name { font-size: 18px; font-weight: 800; color: #FFFFFF; }
          .party-tag { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #FFF; margin-top: 4px; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; margin-bottom: 20px; }
          .stat-tile { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; border: 1px solid rgba(255,255,255,0.06); text-align: center; }
          .stat-val { font-size: 18px; font-weight: 800; color: #C5A059; }
          .stat-lbl { font-size: 11px; color: #9CA3AF; text-transform: uppercase; margin-top: 2px; }
          .footer-box { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9CA3AF; }
          .qr-placeholder { font-weight: 700; color: #C5A059; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand-row">
            <div class="brand-logo">🏛️ POLIGRAM CIVIC</div>
            <div class="status-badge">ECI OFFICIAL VERIFIED</div>
          </div>
          <div class="title-area">
            <div class="title-main">${data.title} ${data.acNo ? `(AC #${data.acNo})` : ''}</div>
            <div class="meta-pill">${data.district ? `${data.district} District` : ''} ${data.category ? `• ${data.category}` : ''} • ${data.stateCode}</div>
          </div>

          <div class="podium-box" style="border-left: 4px solid ${partyColor};">
            <div class="podium-row">
              ${avatarHtml}
              <div class="name-box">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="rank-badge gold-rank">🥇 1st WINNER</span>
                  <span class="party-tag" style="background: ${partyColor};">${data.winnerParty || 'IND'}</span>
                </div>
                <div class="cand-name" style="margin-top: 4px;">${data.winnerName || data.title}</div>
                ${data.winnerVotes ? `<div style="font-size: 13px; color: #9CA3AF; margin-top: 2px;">${data.winnerVotes.toLocaleString()} votes ${data.winnerVoteShare ? `(${data.winnerVoteShare}%)` : ''}</div>` : ''}
              </div>
            </div>
          </div>

          ${data.runnerUpName ? `
          <div class="podium-box" style="border-left: 4px solid ${ruPartyColor};">
            <div class="podium-row">
              <div class="name-box">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="rank-badge silver-rank">🥈 2nd RUNNER-UP</span>
                  <span class="party-tag" style="background: ${ruPartyColor};">${data.runnerUpParty || 'IND'}</span>
                </div>
                <div class="cand-name" style="margin-top: 4px;">${data.runnerUpName}</div>
                ${data.runnerUpVotes ? `<div style="font-size: 13px; color: #9CA3AF; margin-top: 2px;">${data.runnerUpVotes.toLocaleString()} votes</div>` : ''}
              </div>
              ${data.margin != null ? `<div style="text-align: right;"><div style="font-size: 16px; font-weight: 800; color: #10B981;">+${data.margin.toLocaleString()}</div><div style="font-size: 10px; color: #9CA3AF;">WIN MARGIN</div></div>` : ''}
            </div>
          </div>
          ` : ''}

          <div class="stats-grid">
            <div class="stat-tile">
              <div class="stat-val">${data.margin != null ? data.margin.toLocaleString() : '—'}</div>
              <div class="stat-lbl">Winning Margin</div>
            </div>
            <div class="stat-tile">
              <div class="stat-val">${data.turnoutPercent ? `${data.turnoutPercent}%` : (data.terms ? `${data.terms} Term${data.terms > 1 ? 's' : ''}` : 'Official')}</div>
              <div class="stat-lbl">${data.turnoutPercent ? 'Turnout' : 'Tenure'}</div>
            </div>
          </div>

          <div class="footer-box">
            <div>Sourced from ECI Form 21E & Gazette Records</div>
            <div class="qr-placeholder">poligram.in</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleShareVisualCard = async () => {
    try {
      setSharingVisual(true);
      const html = generateHtmlCard();
      const { uri } = await Print.printToFileAsync({
        html,
        width: 612,
        height: 792,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${data.title} Card`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        // Fallback to text sharing
        await handleShareText();
      }
    } catch (err) {
      console.warn('[ShareableCardModal] Visual card generation failed:', err);
      // Fallback
      await handleShareText();
    } finally {
      setSharingVisual(false);
    }
  };

  const handleShareText = async () => {
    try {
      const message = generateGlamorousTextMessage();
      await Share.share({
        title: `${data.title} — Poligram Civic Intelligence`,
        message,
        url: effectiveShareUrl,
      });
    } catch (_) {}
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || '#C5A059' }]} onPress={(e) => e.stopPropagation()}>
          {/* Header Row */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>OFFICIAL CIVIC CARD</Text>
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {data.title}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Visual Card Preview */}
            <View style={[styles.previewCard, { backgroundColor: isDark ? '#1C1614' : '#FBF7F0', borderColor: colors.goldBorder || '#C5A059' }]}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>{data.title}</Text>
                  <Text style={[styles.previewSub, { color: colors.textMuted }]}>
                    {data.district ? `${data.district} District` : ''} {data.category ? `• ${data.category}` : ''} • {data.stateCode}
                  </Text>
                </View>
                <View style={[styles.pillBadge, { backgroundColor: '#C5A05922', borderColor: '#C5A059' }]}>
                  <Text style={styles.pillText}>{data.acNo ? `AC #${data.acNo}` : data.stateCode}</Text>
                </View>
              </View>

              {/* 🥇 1st Place Winner Section */}
              <View style={[styles.candBox, { borderLeftColor: partyColor }]}>
                <View style={styles.candHeaderRow}>
                  <View style={[styles.rankTag, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.rankTagText}>🥇 WINNER</Text>
                  </View>
                  <View style={[styles.partyPill, { backgroundColor: partyColor }]}>
                    <Text style={styles.partyPillText}>{data.winnerParty || 'IND'}</Text>
                  </View>
                </View>
                <View style={styles.candMainRow}>
                  <CandidateAvatar name={data.winnerName || data.title} party={data.winnerParty || 'IND'} size={44} />
                  <View style={styles.candDetails}>
                    <Text style={[styles.candNameText, { color: colors.text }]} numberOfLines={1}>
                      {data.winnerName || data.title}
                    </Text>
                    {data.winnerVotes ? (
                      <Text style={[styles.candVotesText, { color: colors.textSecondary }]}>
                        {data.winnerVotes.toLocaleString()} votes {data.winnerVoteShare ? `(${data.winnerVoteShare}%)` : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* 🥈 2nd Place Runner-Up Section */}
              {Boolean(data.runnerUpName || data.runnerUpParty) && (
                <View style={[styles.candBox, { borderLeftColor: ruPartyColor, marginTop: 8 }]}>
                  <View style={styles.candHeaderRow}>
                    <View style={[styles.rankTag, { backgroundColor: '#94A3B8' }]}>
                      <Text style={styles.rankTagText}>🥈 RUNNER-UP</Text>
                    </View>
                    <View style={[styles.partyPill, { backgroundColor: ruPartyColor }]}>
                      <Text style={styles.partyPillText}>{data.runnerUpParty || 'IND'}</Text>
                    </View>
                  </View>
                  <View style={styles.candMainRow}>
                    <CandidateAvatar name={data.runnerUpName || 'Runner-Up'} party={data.runnerUpParty || 'IND'} size={40} />
                    <View style={styles.candDetails}>
                      <Text style={[styles.candNameText, { color: colors.text }]} numberOfLines={1}>
                        {data.runnerUpName || 'Runner-Up'}
                      </Text>
                      {data.runnerUpVotes ? (
                        <Text style={[styles.candVotesText, { color: colors.textSecondary }]}>
                          {data.runnerUpVotes.toLocaleString()} votes
                        </Text>
                      ) : null}
                    </View>
                    {data.margin != null && (
                      <View style={styles.marginCol}>
                        <Text style={styles.marginNum}>+{data.margin.toLocaleString()}</Text>
                        <Text style={styles.marginLbl}>MARGIN</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Metrics Grid */}
              <View style={styles.metricsGrid}>
                <View style={[styles.metricTile, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metricVal, { color: colors.gold || '#C5A059' }]}>
                    {data.margin != null ? data.margin.toLocaleString() : '—'}
                  </Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Victory Margin</Text>
                </View>
                <View style={[styles.metricTile, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metricVal, { color: colors.gold || '#C5A059' }]}>
                    {data.turnoutPercent ? `${data.turnoutPercent}%` : (data.terms ? `${data.terms} Terms` : 'Verified')}
                  </Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>
                    {data.turnoutPercent ? 'Turnout' : 'Tenure'}
                  </Text>
                </View>
              </View>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <Ionicons name="sparkles" size={12} color="#C5A059" />
                <Text style={styles.footerNote}>Verified by ECI Form 21E • Poligram Civic Intelligence</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleShareVisualCard}
                disabled={sharingVisual}
              >
                {sharingVisual ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="image" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.primaryActionText}>
                  {sharingVisual ? 'Preparing Visual Card...' : 'Share Visual Graphic Card'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.secondaryActionBtn, { borderColor: colors.goldBorder || colors.border }]}
                onPress={handleShareText}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.gold || colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                  Share Detailed Story (Formatted Text)
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  verifiedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scrollArea: {
    flexGrow: 0,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  previewSub: {
    fontSize: 12,
    marginTop: 2,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C5A059',
  },
  candBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 4,
  },
  candHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rankTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#000000',
  },
  partyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  partyPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  candMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  candDetails: {
    flex: 1,
  },
  candNameText: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  candVotesText: {
    fontSize: 11.5,
    marginTop: 1,
  },
  marginCol: {
    alignItems: 'flex-end',
  },
  marginNum: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#10B981',
  },
  marginLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 10,
  },
  metricTile: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLbl: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
  },
  footerNote: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionsContainer: {
    gap: 8,
    marginTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
