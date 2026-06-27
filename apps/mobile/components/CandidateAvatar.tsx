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
import React, { useState, useEffect, memo } from 'react';
import { View, Image, Text, Pressable, StyleSheet } from 'react-native';
import { getPartyColor } from '@/lib/constants';
import { fetchWikipediaPhoto, getCachedPhoto, hasKnownPhoto } from '@/lib/candidatePhotos';

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
  const [wikiUrl, setWikiUrl] = useState<string | null>(() => getCachedPhoto(name) ?? null);
  const [imgError, setImgError] = useState(false);
  const [prevName, setPrevName] = useState(name);

  const isRecycled = name !== prevName;
  const currentWikiUrl = isRecycled ? (getCachedPhoto(name) ?? null) : wikiUrl;
  const currentImgError = isRecycled ? false : imgError;

  if (isRecycled) {
    setPrevName(name);
    setWikiUrl(currentWikiUrl);
    setImgError(currentImgError);
  }

  const partyColor = getPartyColor(party);
  const initials = getInitials(name);
  const innerSize = size - borderWidth * 2;

  useEffect(() => {
    if (photoUrl) return; // already have a photo

    // Resolve from cache first
    const cached = getCachedPhoto(name);
    if (cached) {
      setWikiUrl(cached);
      return;
    }

    // Only fetch for known politicians (avoids unnecessary API calls)
    if (!hasKnownPhoto(name)) return;

    let mounted = true;
    fetchWikipediaPhoto(name).then((url) => {
      if (mounted && url) {
        setWikiUrl(url);
        setImgError(false);
      }
    });
    return () => { mounted = false; };
  }, [name, photoUrl]);

  const imageUri = photoUrl || (currentWikiUrl && !currentImgError ? currentWikiUrl : null);

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
          source={{
            uri: imageUri,
            headers: {
              'User-Agent': 'KshetraApp/1.0 (https://kshetra.app; contact@kshetra.app)',
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
          onError={() => setImgError(true)}
        />
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={() => onPress(imageUri)} style={containerStyle}>
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
