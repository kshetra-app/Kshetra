/**
 * PhotoViewerModal — Full-screen photo viewer with zoom support.
 * Shown when user taps a candidate thumbnail to see the larger image.
 */
import React, { memo } from 'react';
import {
  Modal,
  View,
  Image,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(SCREEN_W - 48, SCREEN_H * 0.5);

interface PhotoViewerModalProps {
  visible: boolean;
  imageUri: string | null;
  name: string;
  party: string;
  subtitle?: string;
  onClose: () => void;
}

export default memo(function PhotoViewerModal({
  visible,
  imageUri,
  name,
  party,
  subtitle,
  onClose,
}: PhotoViewerModalProps) {
  const partyColor = getPartyColor(party);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.92)" />
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.container}>
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={16}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          {/* Photo or initials */}
          <View
            style={[
              styles.imageFrame,
              { borderColor: partyColor, width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2 },
            ]}
          >
            {imageUri ? (
              <>
                <Image
                  source={{
                    uri: imageUri,
                    headers: {
                      'User-Agent': 'KshetraApp/1.0 (https://kshetra.app)',
                    },
                  }}
                  style={{
                    width: IMAGE_SIZE - 8,
                    height: IMAGE_SIZE - 8,
                    borderRadius: (IMAGE_SIZE - 8) / 2,
                  }}
                  resizeMode="cover"
                  loadingIndicatorSource={{ uri: '' }}
                />
                <ActivityIndicator
                  style={styles.loadingIndicator}
                  size="large"
                  color={partyColor}
                />
              </>
            ) : (
              <View
                style={[
                  styles.initialsCircle,
                  {
                    width: IMAGE_SIZE - 8,
                    height: IMAGE_SIZE - 8,
                    borderRadius: (IMAGE_SIZE - 8) / 2,
                    backgroundColor: partyColor + '30',
                  },
                ]}
              >
                <Text style={[styles.initialsText, { color: partyColor, fontSize: IMAGE_SIZE * 0.25 }]}>
                  {initials}
                </Text>
              </View>
            )}
          </View>

          {/* Name and info */}
          <Text style={styles.nameText}>{name}</Text>
          <View style={[styles.partyBadge, { backgroundColor: partyColor }]}>
            <Text style={styles.partyText}>{party}</Text>
          </View>
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}

          {/* Source hint */}
          {imageUri && (
            <Text style={styles.sourceHint}>
              Photo sourced from Wikipedia / MyNeta
            </Text>
          )}
        </View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: -80,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFrame: {
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  loadingIndicator: {
    position: 'absolute',
  },
  initialsCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontWeight: '800',
    letterSpacing: 2,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  partyBadge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  partyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  sourceHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
