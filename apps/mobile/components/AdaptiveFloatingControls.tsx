import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tapLight, selectionChanged } from '../lib/haptics';
import {
  computeControlOrientation,
  type ControlOrientation,
} from '../lib/adaptiveControlMath';

export { computeControlOrientation, type ControlOrientation };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AdaptiveFloatingControlsProps {
  initialX?: number;
  initialY?: number;
  stateCode: string;
  selectedConstituency: any | null;
  mapCompareActive: boolean;
  focusedDistrict: string;
  is3DMode: boolean;
  showDelimitation: boolean;
  locating: boolean;
  isImmersive: boolean;
  onOpenSearch: () => void;
  onOpenCompare: () => void;
  onReset: () => void;
  onToggle3D: () => void;
  onToggleDistrict: () => void;
  onToggleDelimitation: () => void;
  onLocateMe: () => void;
}

export default function AdaptiveFloatingControls({
  initialX = SCREEN_WIDTH - 64,
  initialY = 180,
  stateCode,
  selectedConstituency,
  mapCompareActive,
  focusedDistrict,
  is3DMode,
  showDelimitation,
  locating,
  isImmersive,
  onOpenSearch,
  onOpenCompare,
  onReset,
  onToggle3D,
  onToggleDistrict,
  onToggleDelimitation,
  onLocateMe,
}: AdaptiveFloatingControlsProps) {
  const { t } = useTranslation();

  // Floating coordinates and orientation
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const currentPos = useRef({ x: initialX, y: initialY });
  const [orientation, setOrientation] = useState<ControlOrientation>(() =>
    computeControlOrientation(initialX, initialY, SCREEN_WIDTH, SCREEN_HEIGHT)
  );

  // Glowing pulse animation for Reset button in transparent immersion mode
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isImmersive) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1100,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1100,
            useNativeDriver: false,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      pulseAnim.setValue(0.3);
    }

    return () => {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
      }
    };
  }, [isImmersive, pulseAnim]);

  // PanResponder for dynamic dragging and auto-orientation calculation
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        const liveX = currentPos.current.x + gestureState.dx;
        const liveY = currentPos.current.y + gestureState.dy;
        const liveOrientation = computeControlOrientation(liveX, liveY, SCREEN_WIDTH, SCREEN_HEIGHT);
        setOrientation((prev) => {
          if (prev !== liveOrientation) {
            selectionChanged();
            return liveOrientation;
          }
          return prev;
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const rawX = currentPos.current.x + gestureState.dx;
        const rawY = currentPos.current.y + gestureState.dy;

        // Clamp within safe viewport bounds
        const unitWidth = orientation === 'horizontal' ? 280 : orientation === 'corner-grid' ? 120 : 56;
        const unitHeight = orientation === 'horizontal' ? 56 : orientation === 'corner-grid' ? 160 : 360;

        const clampedX = Math.min(Math.max(10, rawX), SCREEN_WIDTH - unitWidth - 10);
        const clampedY = Math.min(Math.max(60, rawY), SCREEN_HEIGHT - unitHeight - 70);

        currentPos.current = { x: clampedX, y: clampedY };
        pan.setValue({ x: clampedX, y: clampedY });

        const finalOrientation = computeControlOrientation(clampedX, clampedY, SCREEN_WIDTH, SCREEN_HEIGHT);
        if (finalOrientation !== orientation) {
          selectionChanged();
          setOrientation(finalOrientation);
        }
      },
    })
  ).current;

  const handleResetPress = () => {
    tapLight();
    onReset();
  };

  const isResetVisible =
    isImmersive ||
    selectedConstituency != null ||
    mapCompareActive ||
    focusedDistrict !== '' ||
    stateCode !== 'IN';

  return (
    <Animated.View
      style={[
        styles.container,
        orientation === 'horizontal' && styles.containerHorizontal,
        orientation === 'vertical' && styles.containerVertical,
        orientation === 'corner-grid' && styles.containerCornerGrid,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Draggable Grip Handle */}
      <View style={styles.dragHandleContainer}>
        <View style={styles.dragHandlePill}>
          <Ionicons
            name={orientation === 'horizontal' ? 'reorder-two' : 'ellipsis-vertical'}
            size={13}
            color="#C5A059"
          />
        </View>
      </View>

      {/* Control Actions Container */}
      <View
        style={[
          styles.actionsWrapper,
          orientation === 'horizontal' && styles.actionsHorizontal,
          orientation === 'vertical' && styles.actionsVertical,
          orientation === 'corner-grid' && styles.actionsCornerGrid,
        ]}
      >
        {/* Search */}
        {stateCode !== 'IN' && (
          <View style={styles.actionItem}>
            <Pressable
              style={[styles.actionButton, styles.searchButton]}
              onPress={() => {
                tapLight();
                onOpenSearch();
              }}
              accessibilityLabel={t('common.search')}
            >
              <Ionicons name="search" size={19} color="#60A5FA" />
            </Pressable>
            {orientation !== 'corner-grid' && (
              <Text style={styles.actionButtonLabel} numberOfLines={1}>
                {t('common.search')}
              </Text>
            )}
          </View>
        )}

        {/* Compare */}
        {stateCode !== 'IN' && (
          <View style={styles.actionItem}>
            <Pressable
              style={[styles.actionButton, styles.compareButton]}
              onPress={() => {
                tapLight();
                onOpenCompare();
              }}
              accessibilityLabel={t('common.compare', { defaultValue: 'Compare' })}
            >
              <Ionicons name="git-compare" size={19} color="#A78BFA" />
            </Pressable>
            {orientation !== 'corner-grid' && (
              <Text style={styles.actionButtonLabel} numberOfLines={1}>
                {t('common.compare', { defaultValue: 'Compare' })}
              </Text>
            )}
          </View>
        )}

        {/* Reset (with glowing slow blink in immersion mode) */}
        {isResetVisible && (
          <View style={styles.actionItem}>
            <Animated.View
              style={[
                styles.actionButton,
                styles.resetButton,
                isImmersive && {
                  borderColor: '#FCD34D',
                  borderWidth: 2,
                  shadowColor: '#FCD34D',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: pulseAnim,
                  shadowRadius: 16,
                  elevation: 12,
                  backgroundColor: '#1E293B',
                },
              ]}
            >
              <Pressable
                style={styles.innerPressable}
                onPress={handleResetPress}
                accessibilityLabel={t('common.reset', { defaultValue: 'Reset' })}
              >
                <Ionicons
                  name="refresh"
                  size={19}
                  color={isImmersive ? '#FCD34D' : '#F1F5F9'}
                />
              </Pressable>
            </Animated.View>
            {orientation !== 'corner-grid' && (
              <Text
                style={[
                  styles.actionButtonLabel,
                  isImmersive && { color: '#FCD34D', fontWeight: '800' },
                ]}
                numberOfLines={1}
              >
                {t('common.reset', { defaultValue: 'Reset' })}
              </Text>
            )}
          </View>
        )}

        {/* 3D Extrusion View */}
        <View style={styles.actionItem}>
          <Pressable
            style={[styles.actionButton, is3DMode && styles.activeButton]}
            onPress={() => {
              tapLight();
              onToggle3D();
            }}
            accessibilityLabel={t('mapExtended.view3D', { defaultValue: '3D View' })}
          >
            <Ionicons name="cube" size={19} color={is3DMode ? '#FCD34D' : '#FFFFFF'} />
          </Pressable>
          {orientation !== 'corner-grid' && (
            <Text
              style={[styles.actionButtonLabel, is3DMode && { color: '#FCD34D' }]}
              numberOfLines={1}
            >
              {t('mapExtended.view3D', { defaultValue: '3D View' })}
            </Text>
          )}
        </View>

        {/* District Filter */}
        {stateCode !== 'IN' && (
          <View style={styles.actionItem}>
            <Pressable
              style={[
                styles.actionButton,
                focusedDistrict !== '' && styles.activeButton,
                !selectedConstituency && styles.actionButtonDisabled,
              ]}
              onPress={() => {
                if (!selectedConstituency) return;
                tapLight();
                onToggleDistrict();
              }}
              disabled={!selectedConstituency}
              accessibilityLabel={t('mapExtended.district', { defaultValue: 'District' })}
            >
              <Ionicons
                name="funnel"
                size={19}
                color={
                  focusedDistrict !== ''
                    ? '#FCD34D'
                    : selectedConstituency
                    ? '#FFFFFF'
                    : '#475569'
                }
              />
            </Pressable>
            {orientation !== 'corner-grid' && (
              <Text
                style={[
                  styles.actionButtonLabel,
                  focusedDistrict !== '' && { color: '#FCD34D' },
                ]}
                numberOfLines={1}
              >
                {t('mapExtended.district', { defaultValue: 'District' })}
              </Text>
            )}
          </View>
        )}

        {/* Delimitation / Seat Density Toggle */}
        {stateCode !== 'IN' && (
          <View style={styles.actionItem}>
            <Pressable
              style={[styles.actionButton, showDelimitation && styles.delimButtonActive]}
              onPress={() => {
                tapLight();
                onToggleDelimitation();
              }}
              accessibilityLabel={t('mapExtended.density', { defaultValue: 'Density' })}
            >
              <Ionicons
                name="layers"
                size={19}
                color={showDelimitation ? '#34D399' : '#FFFFFF'}
              />
            </Pressable>
            {orientation !== 'corner-grid' && (
              <Text
                style={[
                  styles.actionButtonLabel,
                  showDelimitation && { color: '#34D399' },
                ]}
                numberOfLines={1}
              >
                {t('mapExtended.density', { defaultValue: 'Density' })}
              </Text>
            )}
          </View>
        )}

        {/* Locate Me */}
        <View style={styles.actionItem}>
          <Pressable
            style={[
              styles.actionButton,
              styles.locateButton,
              locating && styles.actionButtonDisabled,
            ]}
            onPress={() => {
              tapLight();
              onLocateMe();
            }}
            disabled={locating}
            accessibilityLabel={t('mapExtended.locate', { defaultValue: 'Locate' })}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#FCD34D" />
            ) : (
              <Ionicons name="locate" size={19} color="#FCD34D" />
            )}
          </Pressable>
          {orientation !== 'corner-grid' && (
            <Text style={styles.actionButtonLabel} numberOfLines={1}>
              {t('mapExtended.locate', { defaultValue: 'Locate' })}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 95,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    padding: 6,
  },
  containerVertical: {
    alignItems: 'center',
  },
  containerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerCornerGrid: {
    maxWidth: 125,
    alignItems: 'center',
  },
  dragHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  dragHandlePill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsVertical: {
    flexDirection: 'column',
    gap: 7,
  },
  actionsHorizontal: {
    flexDirection: 'row',
    gap: 7,
  },
  actionsCornerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    width: 110,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
  },
  actionButton: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C5A059',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  innerPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    borderColor: '#60A5FA',
  },
  compareButton: {
    borderColor: '#A78BFA',
  },
  resetButton: {
    borderColor: '#C5A059',
  },
  activeButton: {
    backgroundColor: '#C5A05930',
    borderColor: '#FCD34D',
    borderWidth: 2,
  },
  delimButtonActive: {
    backgroundColor: '#34D39925',
    borderColor: '#34D399',
    borderWidth: 2,
  },
  locateButton: {
    borderColor: '#FCD34D',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
