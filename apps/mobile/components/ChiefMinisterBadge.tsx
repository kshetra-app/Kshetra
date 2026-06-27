/**
 * ChiefMinisterBadge — Displays the Chief Minister's photo, name,
 * and designation for the currently active state.
 *
 * Uses the existing CandidateAvatar for photo resolution (Wikipedia / MyNeta).
 *
 * Props:
 *   stateCode  — active state code (e.g. 'TS', 'KA')
 *   compact    — if true, renders a smaller inline strip (for map overlay)
 */
import React, { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CandidateAvatar from './CandidateAvatar';
import PhotoViewerModal from './PhotoViewerModal';
import { getChiefMinister, getPrimeMinister } from '@/lib/chiefMinisters';
import { getPartyColor } from '@/lib/constants';

interface ChiefMinisterBadgeProps {
  stateCode: string;
  /** Compact mode for map overlay — smaller avatar and tighter spacing */
  compact?: boolean;
}

export default memo(function ChiefMinisterBadge({
  stateCode,
  compact = false,
}: ChiefMinisterBadgeProps) {
  const isIndia = stateCode === 'IN';
  const person = isIndia ? getPrimeMinister() : getChiefMinister(stateCode);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);

  if (!person) return null;

  const avatarSize = compact ? 34 : 42;
  const partyColor = getPartyColor(person.party);

  const handlePress = useCallback((uri: string | null) => {
    setResolvedUri(uri);
    setViewerVisible(true);
  }, []);

  return (
    <>
      <View style={[styles.container, compact && styles.containerCompact]}>
        <CandidateAvatar
          name={person.name}
          party={person.party}
          size={avatarSize}
          borderWidth={2}
          onPress={handlePress}
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, compact && styles.nameCompact]}
              numberOfLines={1}
            >
              {person.name}
            </Text>
            <View
              style={[styles.partyDot, { backgroundColor: partyColor }]}
            />
          </View>
          <Text
            style={[styles.designation, compact && styles.designationCompact]}
            numberOfLines={1}
          >
            {person.designation}
          </Text>
        </View>
      </View>

      <PhotoViewerModal
        visible={viewerVisible}
        imageUri={resolvedUri}
        name={person.name}
        party={person.party}
        subtitle={person.designation}
        onClose={() => setViewerVisible(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827E6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1F293780',
    marginTop: 8,
  },
  containerCompact: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  nameCompact: {
    fontSize: 12,
  },
  partyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  designation: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 1,
  },
  designationCompact: {
    fontSize: 10,
  },
});
