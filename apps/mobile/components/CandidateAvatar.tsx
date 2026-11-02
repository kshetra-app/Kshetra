/**
 * CandidateAvatar — Smart avatar component for Indian politicians.
 *
 * Renders professional initials immediately, then overlays real photo
 * from Wikipedia when available. Photos are fetched asynchronously and
 * cached in-memory for the session.
 *
 * Usage:
 *   <CandidateAvatar name="Narendra Modi" party="BJP" size={64} />
 */
import React, { useState, useEffect, memo, useMemo } from 'react';
import { View, Image, Text, Pressable, StyleSheet } from 'react-native';
import { getPartyColor } from '../lib/constants';
import { fetchWikipediaPhoto, getCachedPhoto, getStaticPhoto, hasKnownPhoto } from '../lib/candidatePhotos';

interface CandidateAvatarProps {
  name: string;
  party: string;
  size: number;
  /** Pre-existing photo URL (highest priority — from seed data photoUrl field) */
  photoUrl?: string;
  /** Border width (default: 2) */
  borderWidth?: number;
  /** Called when the avatar is tapped — receives the resolved image URI */
  onPress?: (imageUri: string | null) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default memo(function CandidateAvatar({
  name,
  party,
  size,
  photoUrl,
  borderWidth = 2,
  onPress,
}: CandidateAvatarProps) {
  // 1. Instant static resolution (e.g. Chief Ministers, PM, seed photos, MMKV cache)
  const staticPhoto = useMemo(() => {
    return photoUrl || getStaticPhoto(name) || getCachedPhoto(name) || null;
  }, [name, photoUrl]);

  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  // Clear previous remoteUrl and errors when name or static photo changes
  useEffect(() => {
    setRemoteUrl(null);
    setImgError(false);
  }, [name, staticPhoto]);

  // 2. Fallback to Wikipedia API only if static photo is absent and politician is known
  useEffect(() => {
    if (staticPhoto) return;
    if (!hasKnownPhoto(name)) return;

    let mounted = true;
    fetchWikipediaPhoto(name).then((url) => {
      if (mounted && url) {
        setRemoteUrl(url);
        setImgError(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [name, staticPhoto]);

  const partyColor = getPartyColor(party);
  const initials = getInitials(name);
  const innerSize = size - borderWidth * 2;

  const resolvedUri = staticPhoto || remoteUrl;
  const imageUri = !imgError && resolvedUri ? resolvedUri : null;

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor: partyColor,
      backgroundColor: '#1F2937',
    },
  ];

  const content = (
    <>
      {/* Initials background (always visible behind image) */}
      <View
        style={[
          styles.initialsContainer,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: partyColor + '25',
          },
        ]}
      >
        <Text
          style={[
            styles.initials,
            { fontSize: innerSize * 0.35, color: partyColor },
          ]}
        >
          {initials}
        </Text>
      </View>

      {/* Real photo overlay */}
      {imageUri && (
        <Image
          key={imageUri}
          source={{
            uri: imageUri,
            headers: {
              'User-Agent': 'PoligramApp/1.0 (https://kshetra.app; contact@kshetra.app)',
            },
          }}
          style={{
            position: 'absolute',
            top: borderWidth,
            left: borderWidth,
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          }}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => setImgError(true)}
        />
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={() => onPress(imageUri || resolvedUri)} style={containerStyle}>
        {content}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{content}</View>;
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '800',
    letterSpacing: 1,
  },
  photo: {
    position: 'absolute',
  },
});
