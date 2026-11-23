import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PartyAction, PartyField } from '../../components/PartyActions';
import ComposeSheet from '../../components/ComposeSheet';
import PartyPagePosts from '../../components/PartyPagePosts';
import {
  canPublishForParty,
  clearPartyDeclaration, getParty, getPartyAccount, getPartyPage, listPartyTeam,
  savePartyDeclaration, setPartyPageFollow, submitPartyClaim, updatePartyTeam,
  type PartyAccount, type PartyPageState, type PartyTeamMember, type PartyTeamRole,
} from '../../lib/partyRegistry';
import { useTheme } from '../../lib/theme';
import { useAuthStore } from '../../stores/auth';

const roles: PartyTeamRole[] = ['editor', 'approver', 'publisher', 'moderator'];

export default function PartyProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const userId = useAuthStore((state) => state.user?.id);
  const signedIn = Boolean(userId && userId !== 'anon');
  const [party, setParty] = useState<Awaited<ReturnType<typeof getParty>> | null>(null);
  const [account, setAccount] = useState<PartyAccount | null>(null);
  const [page, setPage] = useState<PartyPageState | null>(null);
  const [canPublish, setCanPublish] = useState(false);
  const [compose, setCompose] = useState(false);
  const [team, setTeam] = useState<PartyTeamMember[]>([]);
  const [visible, setVisible] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [summary, setSummary] = useState('');
  const [claimForm, setClaimForm] = useState(false);
  const [member, setMember] = useState('');
  const [selectedRole, setSelectedRole] = useState<PartyTeamRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [working, setWorking] = useState(false);
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    setAccount(null);
    setPage(null);
    setCanPublish(false);
    setTeam([]);
    setVisible(false);
    setClaimForm(false);
    async function load() {
      try {
        const [details, personal] = await Promise.all([getParty(id), signedIn ? getPartyAccount() : null]);
        const ownsPage = Boolean(details.page_id && personal?.claims.some(
          (claim) => claim.organization_id === id && claim.status === 'approved',
        ));
        const [follow, members, publish] = await Promise.all([
          details.page_id ? getPartyPage(details.page_id, signedIn) : null,
          ownsPage ? listPartyTeam(id) : [],
          details.page_id && signedIn ? canPublishForParty(id) : false,
        ]);
        if (!current) return;
        setParty(details);
        setAccount(personal?.accountId === userId ? personal : null);
        setPage(follow);
        setCanPublish(publish);
        setTeam(members);
        setVisible(Boolean(personal?.declaration?.organization_id === id && personal.declaration.is_public));
      } catch {
        if (current) setFailed(true);
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    return () => { current = false; };
  }, [id, revision, signedIn, userId]));

  async function perform(action: () => Promise<unknown>) {
    if (working) return;
    setWorking(true);
    try {
      await action();
      setRevision((previous) => previous + 1);
    } catch (error) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), error instanceof Error ? error.message : undefined);
    } finally {
      setWorking(false);
    }
  }

  const locale = i18n.language?.split('-')[0];
  const localName = party?.names.find((name) => name.language_code === locale)?.name_value;
  const ownClaim = account?.claims.find((claim) => claim.organization_id === id);
  const hasDeclaration = account?.declaration?.organization_id === id;
  const ownsPage = Boolean(party?.page_id && account?.claims.some(
    (claim) => claim.organization_id === id && claim.status === 'approved',
  ));
  const officialPage = party?.page_id;
  const memberId = member.trim();
  const validMember = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(memberId);
  const roleTitle = (role: PartyTeamRole) => t('partyRegistry.role.' + role, { defaultValue: role });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision(revision + 1)} />}
    >
      <Stack.Screen options={{ headerShown: true, title: party?.short_name ?? t('partyRegistry.title', { defaultValue: 'Political parties' }) }} />
      {loading ? <ActivityIndicator color={colors.primary} /> : failed || !party ? (
        <PartyAction label={t('partyRegistry.retryProfile', { defaultValue: 'Could not load the party. Retry' })}
          onPress={() => setRevision(revision + 1)} />
      ) : (
        <>
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.heading, { color: colors.text }]}>{localName ?? party.name}</Text>
            {localName && <Text style={{ color: colors.text }}>{party.name}</Text>}
            <Text style={{ color: colors.textMuted }}>
              {party.verifiedAt
                ? t('partyRegistry.official', { defaultValue: 'Verified official Page' })
                : t('partyRegistry.registryProfile', { defaultValue: 'Party directory profile' })}
            </Text>
            {party.sourceUrl?.startsWith('https://') && (
              <PartyAction label={t('partyRegistry.source', { defaultValue: 'View official source' })}
                onPress={() => void Linking.openURL(party.sourceUrl!)} />
            )}
            {officialPage && page && (
              <>
                <Text style={{ color: colors.textMuted }}>{t('partyRegistry.followers', {
                  count: page.followerCount, defaultValue: '{{count}} followers',
                })}</Text>
                {signedIn && <PartyAction
                  disabled={working}
                  label={page.isFollowing ? t('partyRegistry.unfollow', { defaultValue: 'Unfollow Page' }) : t('partyRegistry.follow', { defaultValue: 'Follow Page' })}
                  onPress={() => void perform(() => setPartyPageFollow(officialPage, !page.isFollowing))}
                />}
                {canPublish && <PartyAction
                  label={t('partyRegistry.createAsPage', { defaultValue: 'Create as this Page' })}
                  onPress={() => setCompose(true)}
                />}
              </>
            )}
          </View>

          {account && (
            <>
              <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.section, { color: colors.text }]}>{t('partyRegistry.myDeclaration', { defaultValue: 'My affiliation' })}</Text>
                <Text style={{ color: colors.textMuted }}>
                  {hasDeclaration
                    ? t('partyRegistry.savedVisibility', {
                        defaultValue: 'Saved visibility: {{visibility}}',
                        visibility: account.declaration?.is_public
                          ? t('partyRegistry.publicLabel', { defaultValue: 'Public' })
                          : t('partyRegistry.privateLabel', { defaultValue: 'Private' }),
                      })
                    : t('partyRegistry.affiliationHelp', { defaultValue: 'You can declare one party affiliation. Following a Page does not declare an affiliation.' })}
                </Text>
                <View style={styles.toggle}>
                  <Text style={{ color: colors.text, flex: 1 }}>{t('partyRegistry.showPublicly', { defaultValue: 'Show publicly on my profile' })}</Text>
                  <Switch value={visible} onValueChange={setVisible} disabled={working}
                    accessibilityLabel={t('partyRegistry.showPublicly', { defaultValue: 'Show publicly on my profile' })} />
                </View>
                <PartyAction
                  disabled={working}
                  label={hasDeclaration ? t('partyRegistry.saveVisibility', { defaultValue: 'Save visibility' }) : t('partyRegistry.declare', { defaultValue: 'Declare affiliation' })}
                  onPress={() => {
                    const save = () => void perform(() => savePartyDeclaration(id, visible));
                    if (!hasDeclaration && account.declaration) {
                      Alert.alert(t('partyRegistry.replaceTitle', { defaultValue: 'Replace your saved affiliation?' }), undefined, [
                        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                        { text: t('partyRegistry.replace', { defaultValue: 'Replace affiliation' }), onPress: save },
                      ]);
                    } else save();
                  }}
                />
                {hasDeclaration && <PartyAction disabled={working}
                  label={t('partyRegistry.clear', { defaultValue: 'Clear affiliation' })}
                  onPress={() => void perform(clearPartyDeclaration)} />}
              </View>

              <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.section, { color: colors.text }]}>{t('partyRegistry.authority', { defaultValue: 'Official Page access' })}</Text>
                {ownClaim && <Text style={{ color: colors.text }}>{t('partyRegistry.claim.' + ownClaim.status, { defaultValue: ownClaim.status })}</Text>}
                {ownsPage && <Text style={{ color: colors.textMuted }}>
                  {t('partyRegistry.teamHelp', { defaultValue: 'Assign one role to a verified member using their Poligram account ID.' })}
                </Text>}
                {!ownsPage && !officialPage && ownClaim?.status !== 'pending' && !claimForm && (
                  <PartyAction label={t('partyRegistry.claimPage', { defaultValue: 'Request official Page access' })} onPress={() => setClaimForm(true)} />
                )}
                {claimForm && (
                  <>
                    <Text style={{ color: colors.textMuted }}>{t('partyRegistry.claimHelp', { defaultValue: 'A reviewer checks your contributor identity and authority to represent this party. Share a link the reviewer can verify.' })}</Text>
                    <PartyField accessibilityLabel={t('partyRegistry.evidence', { defaultValue: 'Authority evidence URL' })}
                      placeholder={t('partyRegistry.evidence', { defaultValue: 'Authority evidence URL' })}
                      value={evidence} onChangeText={setEvidence} autoCapitalize="none" keyboardType="url" maxLength={2000} />
                    <PartyField accessibilityLabel={t('partyRegistry.summary', { defaultValue: 'Explain your authority' })}
                      placeholder={t('partyRegistry.summary', { defaultValue: 'Explain your authority' })}
                      value={summary} onChangeText={setSummary} multiline maxLength={1200} />
                    <PartyAction disabled={working || !evidence.trim().startsWith('https://') || summary.trim().length < 20}
                      label={t('partyRegistry.submitClaim', { defaultValue: 'Submit for verification' })}
                      onPress={() => void perform(async () => {
                        await submitPartyClaim(id, evidence.trim(), summary.trim());
                        setEvidence('');
                        setSummary('');
                      })} />
                  </>
                )}
                {ownsPage && <>
                  {team.map((person) => (
                    <View key={person.user_id} style={styles.team}>
                      <Text selectable style={{ color: colors.text }}>{person.user_id}</Text>
                      <Text style={{ color: colors.textMuted }}>{roleTitle(person.role)}</Text>
                      <PartyAction label={t('partyRegistry.revokeRole', { defaultValue: 'Revoke role' })}
                        disabled={working} onPress={() => void perform(() => updatePartyTeam(id, person.user_id, null))} />
                    </View>
                  ))}
                  <PartyField accessibilityLabel={t('partyRegistry.memberId', { defaultValue: 'Member account ID' })}
                    placeholder={t('partyRegistry.memberId', { defaultValue: 'Member account ID' })}
                    value={member} onChangeText={setMember} autoCapitalize="none" maxLength={36} />
                  <View style={styles.roles}>
                    {roles.map((role) => <PartyAction key={role} label={(selectedRole === role ? '✓ ' : '') + roleTitle(role)}
                      onPress={() => setSelectedRole(role)} />)}
                  </View>
                  <PartyAction label={t('partyRegistry.saveRole', { defaultValue: 'Save team role' })}
                    disabled={working || !validMember || !selectedRole}
                    onPress={() => void perform(async () => {
                      if (!selectedRole) return;
                      await updatePartyTeam(id, memberId, selectedRole);
                      setMember('');
                      setSelectedRole(null);
                    })} />
                </>}
                <Text selectable style={{ color: colors.textMuted }}>
                  {t('partyRegistry.myAccountId', { defaultValue: 'My account ID: {{id}}', id: account.accountId })}
                </Text>
              </View>
            </>
          )}
          {!signedIn && <PartyAction label={t('partyRegistry.signIn', { defaultValue: 'Sign in to follow or declare an affiliation' })}
            onPress={() => router.push('/auth/sign-in')} />}
          {officialPage && (
            <PartyPagePosts key={officialPage + ':' + userId} pageId={officialPage} viewerId={signedIn ? userId : undefined} />
          )}
          {officialPage && canPublish && (
            <ComposeSheet
              key={'compose:' + officialPage + ':' + userId}
              visible={compose}
              onClose={() => setCompose(false)}
              publishingPage={{ id: officialPage, name: party.name }}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 36, gap: 14 },
  panel: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  heading: { fontSize: 25, fontWeight: '800' },
  section: { fontSize: 18, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  team: { gap: 8 },
});
