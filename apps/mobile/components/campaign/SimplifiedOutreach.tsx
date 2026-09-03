import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Share,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { useCampaignStore } from '../../stores/campaign';

type ServiceTab = 'whatsapp' | 'voice' | 'meta';

const RECHARGE_PACKS = [
  { amount: 1000, calls: 1111, label: '₹1,000' },
  { amount: 2500, calls: 2777, label: '₹2,500' },
  { amount: 5000, calls: 5555, label: '₹5,000' },
  { amount: 10000, calls: 11111, label: '₹10,000' },
];

export default function SimplifiedOutreach() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [activeService, setActiveService] = useState<ServiceTab>('whatsapp');
  const [selectedWard, setSelectedWard] = useState<number | 'all'>('all');
  const [targetGroup, setTargetGroup] = useState<'all' | 'cadre' | 'women' | 'youth'>('all');
  const [customTitle, setCustomTitle] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);

  // Wallet Recharge Modal State
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [selectedPackAmount, setSelectedPackAmount] = useState<number>(2500);
  const [customRechargeAmount, setCustomRechargeAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);

  const pricing = useCampaignStore((s) => s.pricing);
  const booths = useCampaignStore((s) => s.booths);
  const volunteers = useCampaignStore((s) => s.volunteers);
  const wallet = useCampaignStore((s) => s.wallet);
  const obdBroadcasts = useCampaignStore((s) => s.obdBroadcasts);
  const rechargeWallet = useCampaignStore((s) => s.rechargeWallet);
  const dispatchVoiceOBD = useCampaignStore((s) => s.dispatchVoiceOBD);

  // Audience calculations based on segmentation
  const audienceCount = React.useMemo(() => {
    if (targetGroup === 'cadre') return volunteers.length;
    if (selectedWard !== 'all') {
      const wardBooths = booths.filter((b) => b.wardNo === selectedWard);
      return wardBooths.reduce((s, b) => s + (b.totalVoters || 1000), 0) || 5000;
    }
    if (targetGroup === 'women') return 105000;
    if (targetGroup === 'youth') return 45000;
    return 215000; // All constituency voters
  }, [targetGroup, selectedWard, volunteers.length, booths]);

  // Voice OBD price calculation with 50% margin
  const obdRate = pricing.voiceObd.finalRatePerCallINR;
  const obdTotalCost = Math.round(audienceCount * obdRate);
  const isBalanceSufficient = wallet.balanceINR >= obdTotalCost;
  const balanceDeficit = Math.max(0, obdTotalCost - wallet.balanceINR);

  // Handler: WhatsApp Share
  const handleWhatsAppShare = async () => {
    const text = `🚩 ${t('campaignManager.namasteVoter', { defaultValue: 'Namaste! Greetings from your candidate.' })}\n\n` +
      `"Together for progress and integrity in our constituency."\n\n` +
      `📌 ${t('campaignManager.manifestoHighlight', { defaultValue: 'Our 3 Core Pledges: 24x7 Clean Drinking Water, Youth Employment Coaching, Ward Drainage Overhaul.' })}\n\n` +
      `📲 Join our volunteer network on Kshetra: https://kshetra.app/campaign/c1`;

    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ message: text });
      }
    } catch {
      await Share.share({ message: text });
    }
  };

  // Handler: Meta Publish & Boost
  const handleMetaPublish = (pkgId?: string) => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      Alert.alert(
        t('campaignManager.metaPublishSuccess', { defaultValue: 'Published to Facebook Page!' }),
        t('campaignManager.metaPublishSuccessDesc', {
          defaultValue: pkgId
            ? 'Your campaign post and boost package have been scheduled. Voters in your selected ward will see this in their feed.'
            : 'Your update has been published to your official Facebook Page.',
        }),
      );
    }, 1200);
  };

  // Handler: Voice OBD Call Dispatch
  const handleVoiceCallDispatch = async () => {
    if (!isBalanceSufficient) {
      setSelectedPackAmount(balanceDeficit > 2500 ? Math.ceil(balanceDeficit / 1000) * 1000 : 2500);
      setRechargeModalVisible(true);
      return;
    }

    Alert.alert(
      t('campaignManager.confirmVoiceCall', { defaultValue: 'Confirm Voice Broadcast' }),
      t('campaignManager.confirmVoiceCallDesc', {
        defaultValue: 'Deliver 30-second recorded audio call to {{count}} voters for ₹{{cost}}? Amount will be deducted from your Campaign Wallet.',
        count: audienceCount.toLocaleString('en-IN'),
        cost: obdTotalCost.toLocaleString('en-IN'),
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('campaignManager.dispatchNow', { defaultValue: 'Schedule Call Blast' }),
          onPress: async () => {
            setIsSending(true);
            const res = await dispatchVoiceOBD(
              customTitle || 'Voice Appeal to Voters',
              {
                type: selectedWard === 'all' ? 'constituency' : 'ward',
                wardNo: selectedWard === 'all' ? undefined : selectedWard,
                voterCount: audienceCount,
              },
            );
            setIsSending(false);
            if (res.success) {
              setSentSuccess(res.message);
              if (res.warning) {
                Alert.alert(t('campaignManager.traiAdvisory', { defaultValue: 'TRAI Calling Window Advisory' }), res.warning);
              }
            } else {
              Alert.alert(t('common.error', { defaultValue: 'Dispatch Error' }), res.message);
            }
          },
        },
      ],
    );
  };

  // Handler: Wallet Recharge
  const handleExecuteRecharge = async () => {
    const amount = customRechargeAmount ? Number(customRechargeAmount) : selectedPackAmount;
    if (!amount || amount < 500) {
      Alert.alert(t('common.error', { defaultValue: 'Invalid Amount' }), 'Minimum wallet recharge is ₹500.');
      return;
    }

    setIsRecharging(true);
    const res = await rechargeWallet(amount);
    setIsRecharging(false);
    setRechargeModalVisible(false);
    setCustomRechargeAmount('');
    Alert.alert(t('campaignManager.walletCredited', { defaultValue: 'Wallet Credited' }), res.message);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ─── Campaign Wallet Bar ─── */}
      <View style={[styles.walletBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.walletLeft}>
          <View style={styles.walletIconCircle}>
            <Ionicons name="wallet" size={20} color="#10B981" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.walletTitle, { color: colors.textSecondary }]}>
              {t('campaignManager.walletBalanceLabel', { defaultValue: 'Campaign Wallet' })}
            </Text>
            <Text style={[styles.walletBalance, { color: colors.text }]}>
              ₹{wallet.balanceINR.toLocaleString('en-IN')}{' '}
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>Available</Text>
            </Text>
          </View>
        </View>
        <Pressable style={styles.btnTopUp} onPress={() => setRechargeModalVisible(true)}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.btnTopUpText}>
            {t('campaignManager.topUpBtn', { defaultValue: 'Top-up' })}
          </Text>
        </Pressable>
      </View>

      {/* ─── Service Selector Tabs ─── */}
      <View style={styles.tabSelector}>
        <Pressable
          style={[
            styles.serviceTab,
            activeService === 'whatsapp' && { backgroundColor: '#10B981', borderColor: '#10B981' },
          ]}
          onPress={() => { setActiveService('whatsapp'); setSentSuccess(null); }}
        >
          <Ionicons
            name="logo-whatsapp"
            size={18}
            color={activeService === 'whatsapp' ? '#FFFFFF' : '#10B981'}
          />
          <Text
            style={[
              styles.serviceTabText,
              activeService === 'whatsapp' && styles.serviceTabTextActive,
            ]}
          >
            {t('campaignManager.serviceWhatsApp', { defaultValue: 'WhatsApp' })}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.serviceTab,
            activeService === 'voice' && { backgroundColor: '#D97706', borderColor: '#D97706' },
          ]}
          onPress={() => { setActiveService('voice'); setSentSuccess(null); }}
        >
          <Ionicons
            name="call"
            size={18}
            color={activeService === 'voice' ? '#FFFFFF' : '#D97706'}
          />
          <Text
            style={[
              styles.serviceTabText,
              activeService === 'voice' && styles.serviceTabTextActive,
            ]}
          >
            {t('campaignManager.serviceVoice', { defaultValue: 'Voice Call (OBD)' })}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.serviceTab,
            activeService === 'meta' && { backgroundColor: '#2563EB', borderColor: '#2563EB' },
          ]}
          onPress={() => { setActiveService('meta'); setSentSuccess(null); }}
        >
          <Ionicons
            name="logo-facebook"
            size={18}
            color={activeService === 'meta' ? '#FFFFFF' : '#2563EB'}
          />
          <Text
            style={[
              styles.serviceTabText,
              activeService === 'meta' && styles.serviceTabTextActive,
            ]}
          >
            {t('campaignManager.serviceMeta', { defaultValue: 'Facebook Page' })}
          </Text>
        </Pressable>
      </View>

      {/* ══════════════════════════════════════════════════════════
          SERVICE 1: WHATSAPP (1-TAP STATUS & GROUP SHARING)
         ══════════════════════════════════════════════════════════ */}
      {activeService === 'whatsapp' && (
        <View>
          {/* Pricing Box */}
          <View style={[styles.pricingCard, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <View style={styles.pricingHeader}>
              <View style={styles.badgeFree}>
                <Text style={styles.badgeFreeText}>100% FREE</Text>
              </View>
              <Text style={styles.pricingTitle}>
                {t('campaignManager.whatsappFreeTitle', { defaultValue: 'Zero Cost · Direct Organic Reach' })}
              </Text>
            </View>
            <Text style={styles.pricingDesc}>
              {t('campaignManager.whatsappPricingDesc', {
                defaultValue: 'Unlimited status shares and group broadcasts using your official device. No telecom approvals needed.',
              })}
            </Text>
          </View>

          {/* Guidance Box */}
          <View style={[styles.guidanceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.guidanceTitleRow}>
              <Ionicons name="information-circle" size={20} color="#10B981" />
              <Text style={[styles.guidanceTitle, { color: colors.text }]}>
                {t('campaignManager.guidanceTitle', { defaultValue: 'How It Works & Best Practices' })}
              </Text>
            </View>
            <Text style={[styles.guidanceBody, { color: colors.textSecondary }]}>
              {pricing.whatsappOrganic.guidance.howItWorks}
            </Text>

            <View style={styles.doDontRow}>
              <View style={[styles.doCol, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.doHeader}>✓ {t('campaignManager.dos', { defaultValue: 'DOs' })}</Text>
                {pricing.whatsappOrganic.guidance.dos.map((item, idx) => (
                  <Text key={idx} style={styles.bulletText}>• {item}</Text>
                ))}
              </View>
              <View style={[styles.dontCol, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.dontHeader}>✗ {t('campaignManager.donts', { defaultValue: "DON'Ts" })}</Text>
                {pricing.whatsappOrganic.guidance.donts.map((item, idx) => (
                  <Text key={idx} style={styles.bulletText}>• {item}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* 1-Tap Action Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>
              {t('campaignManager.readyPosterHeading', { defaultValue: "Today's Branded Campaign Poster" })}
            </Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              {t('campaignManager.posterSubtext', { defaultValue: 'Candidate Photo · Slogan · AC #56 Nampally' })}
            </Text>

            <View style={styles.posterPreview}>
              <Ionicons name="image" size={36} color="#9CA3AF" />
              <Text style={styles.posterText}>
                "ఓటుతో మార్పు సాధ్యం — మన నాంపల్లి, మన భవిష్యత్తు"
              </Text>
              <Text style={styles.posterAuthor}>Revanth Reddy · INC</Text>
            </View>

            <Pressable style={styles.btnWhatsAppAction} onPress={handleWhatsAppShare}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.btnActionText}>
                {t('campaignManager.shareToWhatsAppBtn', { defaultValue: 'Share to WhatsApp Status & Groups' })}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════
          SERVICE 2: BULK VOICE OBD (PRE-RECORDED CALL)
         ══════════════════════════════════════════════════════════ */}
      {activeService === 'voice' && (
        <View>
          {/* Pricing Box with 50% Kshetra Margin & Wallet Check */}
          <View style={[styles.pricingCard, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
            <View style={styles.pricingHeader}>
              <View style={[styles.badgeFree, { backgroundColor: '#D97706' }]}>
                <Text style={styles.badgeFreeText}>INDICATIVE PRICING</Text>
              </View>
              <Text style={[styles.pricingTitle, { color: '#92400E' }]}>
                ₹{obdRate.toFixed(2)} / {t('campaignManager.perVoterCall', { defaultValue: 'connected call' })}
              </Text>
            </View>
            <Text style={[styles.pricingDesc, { color: '#78350F' }]}>
              {t('campaignManager.obdPricingBreakdown', {
                defaultValue: 'Base telecom rate ₹0.60 + Kshetra platform margin 50% (₹0.30) = ₹0.90 per 30-sec call.',
              })}
            </Text>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>
                {t('campaignManager.selectedAudience', { defaultValue: 'Selected Audience:' })}{' '}
                <Text style={{ fontWeight: '800' }}>{audienceCount.toLocaleString('en-IN')} voters</Text>
              </Text>
              <Text style={styles.calcTotal}>
                {t('campaignManager.totalPrice', { defaultValue: 'Total: ' })}₹{obdTotalCost.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Wallet Status Banner */}
            <View
              style={[
                styles.walletCheckBanner,
                { backgroundColor: isBalanceSufficient ? '#DCFCE7' : '#FEE2E2' },
              ]}
            >
              <Ionicons
                name={isBalanceSufficient ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={isBalanceSufficient ? '#166534' : '#991B1B'}
              />
              <Text
                style={[
                  styles.walletCheckText,
                  { color: isBalanceSufficient ? '#166534' : '#991B1B' },
                ]}
              >
                {isBalanceSufficient
                  ? `✓ Sufficient balance. Remaining after blast: ₹${(wallet.balanceINR - obdTotalCost).toLocaleString('en-IN')}`
                  : `⚠️ Wallet balance short by ₹${balanceDeficit.toLocaleString('en-IN')}. Top-up required.`}
              </Text>
            </View>
          </View>

          {/* Voter Segmentation Selector */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>
              {t('campaignManager.chooseAudienceHeading', { defaultValue: '1. Select Target Voters' })}
            </Text>

            {/* Ward Filter */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('campaignManager.wardFilterLabel', { defaultValue: 'Filter by Ward / Mandal:' })}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipRow}>
              <Pressable
                style={[styles.chip, selectedWard === 'all' && styles.chipActive]}
                onPress={() => setSelectedWard('all')}
              >
                <Text style={[styles.chipText, selectedWard === 'all' && styles.chipTextActive]}>
                  {t('campaignManager.allWards', { defaultValue: 'All Constituency' })}
                </Text>
              </Pressable>
              {[1, 2, 3, 4, 5].map((w) => (
                <Pressable
                  key={w}
                  style={[styles.chip, selectedWard === w && styles.chipActive]}
                  onPress={() => setSelectedWard(w)}
                >
                  <Text style={[styles.chipText, selectedWard === w && styles.chipTextActive]}>
                    Ward #{w}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Group Filter */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              {t('campaignManager.groupFilterLabel', { defaultValue: 'Target Group:' })}
            </Text>
            <View style={styles.groupBtnRow}>
              <Pressable
                style={[styles.groupBtn, targetGroup === 'all' && styles.groupBtnActive]}
                onPress={() => setTargetGroup('all')}
              >
                <Text style={[styles.groupBtnText, targetGroup === 'all' && styles.groupBtnTextActive]}>
                  {t('campaignManager.groupAll', { defaultValue: 'All Voters' })}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.groupBtn, targetGroup === 'cadre' && styles.groupBtnActive]}
                onPress={() => setTargetGroup('cadre')}
              >
                <Text style={[styles.groupBtnText, targetGroup === 'cadre' && styles.groupBtnTextActive]}>
                  {t('campaignManager.groupCadre', { defaultValue: 'Cadre Only ({{count}})', count: volunteers.length })}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.groupBtn, targetGroup === 'women' && styles.groupBtnActive]}
                onPress={() => setTargetGroup('women')}
              >
                <Text style={[styles.groupBtnText, targetGroup === 'women' && styles.groupBtnTextActive]}>
                  {t('campaignManager.groupWomen', { defaultValue: 'Women' })}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Guidance Box */}
          <View style={[styles.guidanceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.guidanceTitleRow}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={[styles.guidanceTitle, { color: colors.text }]}>
                {t('campaignManager.voiceGuidanceTitle', { defaultValue: 'Voice Call Rules & TRAI Guidelines' })}
              </Text>
            </View>
            <Text style={[styles.guidanceBody, { color: colors.textSecondary }]}>
              {pricing.voiceObd.guidance.howItWorks}
            </Text>

            <View style={styles.doDontRow}>
              <View style={[styles.doCol, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.doHeader}>✓ {t('campaignManager.dos', { defaultValue: 'DOs' })}</Text>
                {pricing.voiceObd.guidance.dos.map((item, idx) => (
                  <Text key={idx} style={styles.bulletText}>• {item}</Text>
                ))}
              </View>
              <View style={[styles.dontCol, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.dontHeader}>✗ {t('campaignManager.donts', { defaultValue: "DON'Ts" })}</Text>
                {pricing.voiceObd.guidance.donts.map((item, idx) => (
                  <Text key={idx} style={styles.bulletText}>• {item}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* Record Audio & Dispatch */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>
              {t('campaignManager.recordAudioHeading', { defaultValue: '2. Personal Voice Recording' })}
            </Text>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder={t('campaignManager.callTitlePlaceholder', { defaultValue: 'Call Title (e.g. Rally Invitation & Manifesto Promises)' })}
              placeholderTextColor="#9CA3AF"
              value={customTitle}
              onChangeText={setCustomTitle}
            />

            <View style={styles.audioMockBox}>
              <Ionicons name="mic-circle" size={40} color="#D97706" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.audioMockTitle, { color: colors.text }]}>
                  {t('campaignManager.recordedVoiceSample', { defaultValue: 'Candidate 30s Appeal (Telugu/Hindi)' })}
                </Text>
                <Text style={[styles.audioMockSub, { color: colors.textSecondary }]}>
                  Duration: 0:28 · Quality: High · Verified
                </Text>
              </View>
              <Pressable style={styles.btnPlayAudio}>
                <Ionicons name="play" size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Action button: changes dynamically if balance is insufficient */}
            <Pressable
              style={[
                styles.btnVoiceAction,
                !isBalanceSufficient && { backgroundColor: '#EF4444' },
              ]}
              onPress={handleVoiceCallDispatch}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name={isBalanceSufficient ? 'call' : 'wallet'} size={20} color="#FFFFFF" />
                  <Text style={styles.btnActionText}>
                    {isBalanceSufficient
                      ? t('campaignManager.dispatchVoiceCallBtn', { defaultValue: 'Schedule Call Blast (₹{{cost}})', cost: obdTotalCost.toLocaleString('en-IN') })
                      : `Top-Up ₹${balanceDeficit.toLocaleString('en-IN')} to Schedule Blast`}
                  </Text>
                </>
              )}
            </Pressable>

            {sentSuccess && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#166534" />
                <Text style={styles.successBannerText}>{sentSuccess}</Text>
              </View>
            )}
          </View>

          {/* Live OBD Broadcast Delivery Tracker */}
          {obdBroadcasts.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.trackerHeader}>
                <Text style={[styles.cardHeading, { color: colors.text, marginBottom: 0 }]}>
                  Live Call Delivery Progress
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        obdBroadcasts[0].status === 'completed'
                          ? '#DCFCE7'
                          : obdBroadcasts[0].status === 'calling'
                          ? '#FEF3C7'
                          : '#F3F4F6',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color:
                          obdBroadcasts[0].status === 'completed'
                            ? '#166534'
                            : obdBroadcasts[0].status === 'calling'
                            ? '#92400E'
                            : '#4B5563',
                      },
                    ]}
                  >
                    {obdBroadcasts[0].status === 'completed'
                      ? '✓ Delivered'
                      : obdBroadcasts[0].status === 'calling'
                      ? '📞 Calling...'
                      : 'Queued'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.trackerTitle, { color: colors.text }]}>
                {obdBroadcasts[0].title}
              </Text>
              <Text style={[styles.trackerSub, { color: colors.textSecondary }]}>
                Target: {obdBroadcasts[0].totalRecipients.toLocaleString('en-IN')} voters · Cost: ₹{obdBroadcasts[0].totalCostINR.toLocaleString('en-IN')}
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width:
                        obdBroadcasts[0].status === 'completed'
                          ? '100%'
                          : obdBroadcasts[0].status === 'calling'
                          ? '65%'
                          : '10%',
                    },
                  ]}
                />
              </View>

              {/* Metrics row */}
              <View style={styles.trackerStatsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxNum}>
                    {obdBroadcasts[0].answeredCount || Math.floor(obdBroadcasts[0].totalRecipients * 0.88)}
                  </Text>
                  <Text style={styles.statBoxLabel}>Answered (88%)</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statBoxNum, { color: '#F59E0B' }]}>
                    {obdBroadcasts[0].busyCount || Math.floor(obdBroadcasts[0].totalRecipients * 0.08)}
                  </Text>
                  <Text style={styles.statBoxLabel}>Busy (8%)</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statBoxNum, { color: '#EF4444' }]}>
                    {obdBroadcasts[0].unreachableCount || Math.floor(obdBroadcasts[0].totalRecipients * 0.04)}
                  </Text>
                  <Text style={styles.statBoxLabel}>Unreachable (4%)</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════
          SERVICE 3: META GRAPH API (FACEBOOK & INSTAGRAM)
         ══════════════════════════════════════════════════════════ */}
      {activeService === 'meta' && (
        <View>
          {/* Pricing Box */}
          <View style={[styles.pricingCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <View style={styles.pricingHeader}>
              <View style={[styles.badgeFree, { backgroundColor: '#2563EB' }]}>
                <Text style={styles.badgeFreeText}>ORGANIC + BOOST</Text>
              </View>
              <Text style={[styles.pricingTitle, { color: '#1E40AF' }]}>
                {t('campaignManager.metaPublishTitle', { defaultValue: 'Organic Publishing (₹0) + Optional Boost' })}
              </Text>
            </View>
            <Text style={[styles.pricingDesc, { color: '#1E3A8A' }]}>
              {t('campaignManager.metaPublishDesc', {
                defaultValue: 'Publish speeches and rally photos directly to your connected Facebook Page and Instagram. Boost packages include a 50% platform fee.',
              })}
            </Text>
          </View>

          {/* Guidance Box */}
          <View style={[styles.guidanceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.guidanceTitleRow}>
              <Ionicons name="information-circle" size={20} color="#2563EB" />
              <Text style={[styles.guidanceTitle, { color: colors.text }]}>
                {t('campaignManager.metaGuidanceTitle', { defaultValue: 'Meta Rules & Political Verification' })}
              </Text>
            </View>
            <Text style={[styles.guidanceBody, { color: colors.textSecondary }]}>
              {pricing.metaPublishing.guidance.howItWorks}
            </Text>

            <View style={styles.doDontRow}>
              <View style={[styles.doCol, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.doHeader}>✓ {t('campaignManager.dos', { defaultValue: 'DOs' })}</Text>
                {pricing.metaPublishing.guidance.dos.map((item, idx) => (
                  <Text key={idx} style={styles.bulletText}>• {item}</Text>
                ))}
              </View>
              <View style={[styles.dontCol, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.dontHeader}>✗ {t('campaignManager.donts', { defaultValue: "DON'Ts" })}</Text>
                {pricing.metaPublishing.guidance.donts.map((item, idx) => (
                  <Text key={idx} style={styles.bulletText}>• {item}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* Packages */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>
              {t('campaignManager.metaPackagesHeading', { defaultValue: 'Choose a Targeted Boost Package' })}
            </Text>

            {pricing.metaPublishing.boostPackages.map((pkg) => (
              <View key={pkg.id} style={styles.metaPackageCard}>
                <View style={styles.metaPackageHeader}>
                  <Text style={styles.metaPackageName}>{pkg.label}</Text>
                  <Text style={styles.metaPackagePrice}>₹{pkg.totalPriceINR.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.metaPackageAudience}>🎯 {pkg.targetAudience}</Text>
                <Text style={styles.metaPackageReach}>👁️ {pkg.estReach}</Text>
                <Text style={styles.metaPackageMargin}>
                  (Ad Spend ₹{pkg.vendorAdSpendINR} + 50% Platform Fee ₹{pkg.kshetraFeeINR})
                </Text>

                <Pressable
                  style={styles.btnMetaSelect}
                  onPress={() => handleMetaPublish(pkg.id)}
                >
                  <Text style={styles.btnMetaSelectText}>
                    {t('campaignManager.selectPackageBtn', { defaultValue: 'Boost Post with this Package' })}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Modal: Wallet Recharge ─── */}
      <Modal visible={rechargeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="wallet" size={24} color="#10B981" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('campaignManager.rechargeModalTitle', { defaultValue: 'Top-up Campaign Wallet' })}
                </Text>
              </View>
              <Pressable onPress={() => setRechargeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Credits can be used immediately for Voice OBD call blasts and promoted posts.
            </Text>

            {/* Quick Packs */}
            <Text style={[styles.packHeading, { color: colors.text }]}>Choose Recharge Amount:</Text>
            <View style={styles.packGrid}>
              {RECHARGE_PACKS.map((pack) => (
                <Pressable
                  key={pack.amount}
                  style={[
                    styles.packCard,
                    selectedPackAmount === pack.amount && !customRechargeAmount && styles.packCardActive,
                  ]}
                  onPress={() => {
                    setSelectedPackAmount(pack.amount);
                    setCustomRechargeAmount('');
                  }}
                >
                  <Text
                    style={[
                      styles.packLabel,
                      selectedPackAmount === pack.amount && !customRechargeAmount && styles.packLabelActive,
                    ]}
                  >
                    {pack.label}
                  </Text>
                  <Text style={styles.packCalls}>~{pack.calls.toLocaleString('en-IN')} calls</Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Amount Input */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Or Enter Custom Amount (₹):
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 7500"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={customRechargeAmount}
              onChangeText={setCustomRechargeAmount}
            />

            {/* Payment Button */}
            <Pressable
              style={styles.btnPayRecharge}
              onPress={handleExecuteRecharge}
              disabled={isRecharging}
            >
              {isRecharging ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="card" size={18} color="#FFFFFF" />
                  <Text style={styles.btnActionText}>
                    Pay ₹{customRechargeAmount ? Number(customRechargeAmount).toLocaleString('en-IN') : selectedPackAmount.toLocaleString('en-IN')} via UPI / Netbanking
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  walletBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 10,
    marginBottom: 10,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center' },
  walletIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: { fontSize: 11, fontWeight: '700' },
  walletBalance: { fontSize: 16, fontWeight: '900', marginTop: 1 },
  btnTopUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  btnTopUpText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  tabSelector: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  serviceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  serviceTabText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  serviceTabTextActive: { color: '#FFFFFF' },
  pricingCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  pricingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badgeFree: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeFreeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  pricingTitle: { fontSize: 14, fontWeight: '800', color: '#166534' },
  pricingDesc: { fontSize: 12, color: '#14532D', lineHeight: 17 },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  calcLabel: { fontSize: 12, color: '#78350F' },
  calcTotal: { fontSize: 16, fontWeight: '900', color: '#92400E' },
  walletCheckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  walletCheckText: { fontSize: 11, fontWeight: '700', flex: 1 },
  guidanceBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  guidanceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  guidanceTitle: { fontSize: 13, fontWeight: '800' },
  guidanceBody: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  doDontRow: { flexDirection: 'row', gap: 8 },
  doCol: { flex: 1, padding: 8, borderRadius: 8 },
  dontCol: { flex: 1, padding: 8, borderRadius: 8 },
  doHeader: { fontSize: 11, fontWeight: '800', color: '#166534', marginBottom: 4 },
  dontHeader: { fontSize: 11, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  bulletText: { fontSize: 10, color: '#374151', lineHeight: 14, marginBottom: 2 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeading: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  cardSub: { fontSize: 11, marginBottom: 12 },
  posterPreview: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginVertical: 8,
  },
  posterText: { fontSize: 13, fontWeight: '800', color: '#1F2937', textAlign: 'center', marginTop: 8 },
  posterAuthor: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  btnWhatsAppAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 10,
  },
  btnVoiceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  btnActionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  inputLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  filterChipRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
  },
  chipActive: { backgroundColor: '#1F2937', borderColor: '#1F2937' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  chipTextActive: { color: '#FFFFFF' },
  groupBtnRow: { flexDirection: 'row', gap: 6 },
  groupBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupBtnActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  groupBtnText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  groupBtnTextActive: { color: '#FFFFFF' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  audioMockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  audioMockTitle: { fontSize: 12, fontWeight: '800' },
  audioMockSub: { fontSize: 10, marginTop: 1 },
  btnPlayAudio: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  successBannerText: { color: '#166534', fontSize: 11, fontWeight: '700', flex: 1 },
  trackerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackerTitle: { fontSize: 13, fontWeight: '800', marginTop: 6 },
  trackerSub: { fontSize: 11, marginTop: 2, marginBottom: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  progressBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginVertical: 6 },
  progressBarFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },
  trackerStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  statBox: { alignItems: 'center', flex: 1 },
  statBoxNum: { fontSize: 14, fontWeight: '900', color: '#10B981' },
  statBoxLabel: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  metaPackageCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
  },
  metaPackageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaPackageName: { fontSize: 13, fontWeight: '800', color: '#1F2937' },
  metaPackagePrice: { fontSize: 15, fontWeight: '900', color: '#2563EB' },
  metaPackageAudience: { fontSize: 11, color: '#4B5563', marginTop: 4 },
  metaPackageReach: { fontSize: 11, fontWeight: '700', color: '#059669', marginTop: 2 },
  metaPackageMargin: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  btnMetaSelect: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnMetaSelectText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 4, marginBottom: 14 },
  packHeading: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  packCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  packCardActive: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  packLabel: { fontSize: 16, fontWeight: '900', color: '#1F2937' },
  packLabelActive: { color: '#10B981' },
  packCalls: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  btnPayRecharge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 14,
  },
});
