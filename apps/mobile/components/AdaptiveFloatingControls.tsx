import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  initialX = SCREEN_WIDTH - 60,
  initialY = 80,
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

  // Minimized / collapsed state to provide 100% unobstructed view when desired
  const [isMinimized, setIsMinimized] = useState(false);

  // Sync initial position when initialY or initialX changes
  useEffect(() => {
    currentPos.current = { x: initialX, y: initialY };
    pan.setValue({ x: initialX, y: initialY });
  }, [initialX, initialY]);

  const isResetVisible =
    isImmersive ||
    selectedConstituency != null ||
    mapCompareActive ||
    focusedDistrict !== '' ||
    stateCode !== 'IN';

  // Glowing pulse animation for Reset button
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(1)).current;
  const rippleOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!isResetVisible) return;

    // Glowing border & background pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );

    // Glowing ripple halo expanding outward
    const rippleLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(rippleScale, {
            toValue: 1.45,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(rippleScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rippleOpacity, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseLoop.start();
    rippleLoop.start();

    return () => {
      pulseLoop.stop();
      rippleLoop.stop();
    };
  }, [isResetVisible, pulseAnim, rippleScale, rippleOpacity]);

  // PanResponder with magnetic snap-to-corner on release
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
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

        const unitWidth = isMinimized ? 48 : orientation === 'horizontal' ? 280 : orientation === 'corner-grid' ? 110 : 52;
        const unitHeight = isMinimized ? 48 : orientation === 'horizontal' ? 52 : orientation === 'corner-grid' ? 160 : 310;

        // Determine nearest magnetic corner dock
        const isLeft = (rawX + unitWidth / 2) < (SCREEN_WIDTH / 2);
        const isTop = (rawY + unitHeight / 2) < (SCREEN_HEIGHT / 2);

        const targetX = isLeft ? 12 : (SCREEN_WIDTH - unitWidth - 12);
        const targetY = isTop ? Math.max(initialY, 70) : Math.max(70, SCREEN_HEIGHT - unitHeight - 95);

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          bounciness: 6,
          speed: 15,
          useNativeDriver: false,
        }).start();

        currentPos.current = { x: targetX, y: targetY };

        const finalOrientation = computeControlOrientation(targetX, targetY, SCREEN_WIDTH, SCREEN_HEIGHT);
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

  const handleToggleMinimize = () => {
    tapLight();
    setIsMinimized((v) => !v);
  };

  // Interpolated animated styles for Glowing Reset button
  const animatedBorderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F59E0B', '#FCD34D'],
  });

  const animatedBackgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1E293B', '#3E2F14'],
  });

  const animatedBorderWidth = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.5, 2.5],
  });

  if (isMinimized) {
    return (
      <Animated.View
        style={[
          styles.minimizedContainer,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={styles.minimizedButton}
          onPress={handleToggleMinimize}
          accessibilityLabel={t('mapExtended.expandControls', { defaultValue: 'Expand Controls' })}
        >
          <Ionicons name="apps" size={20} color="#FCD34D" />
          {isResetVisible && (
            <View style={styles.minimizedResetDot} />
          )}
        </Pressable>
      </Animated.View>
    );
  }

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
      {/* Draggable Grip Handle & Minimize toggle */}
      <View style={styles.dragHandleContainer}>
        <Pressable
          style={styles.dragHandlePill}
          onPress={handleToggleMinimize}
          accessibilityLabel={t('mapExtended.minimizeControls', { defaultValue: 'Minimize Controls' })}
        >
          <Ionicons
            name={orientation === 'horizontal' ? 'reorder-two' : 'chevron-up'}
            size={12}
            color="#C5A059"
          />
        </Pressable>
      </View>

      {/* Floating Action Cluster */}
      <View
        style={[
          styles.actionsWrapper,
          orientation === 'horizontal' && styles.actionsHorizontal,
          orientation === 'vertical' && styles.actionsVertical,
          orientation === 'corner-grid' && styles.actionsCornerGrid,
        ]}
      >
        {/* Search */}
        <View style={styles.actionItem}>
          <Pressable
            style={[styles.actionButton, styles.searchButton]}
            onPress={() => {
              tapLight();
              onOpenSearch();
            }}
            accessibilityLabel={t('common.search')}
          >
            <Ionicons name="search" size={18} color="#60A5FA" />
          </Pressable>
          {orientation !== 'corner-grid' && (
            <Text style={styles.actionButtonLabel} numberOfLines={1}>
              {t('common.search')}
            </Text>
          )}
        </View>

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
              <Ionicons name="git-compare" size={18} color="#A78BFA" />
            </Pressable>
            {orientation !== 'corner-grid' && (
              <Text style={styles.actionButtonLabel} numberOfLines={1}>
                {t('common.compare', { defaultValue: 'Compare' })}
              </Text>
            )}
          </View>
        )}

        {/* Reset (with Glowing Pulse & Blinking Halo) */}
        {isResetVisible && (
          <View style={styles.actionItem}>
            <View style={styles.resetButtonWrapper}>
              {/* Outer Glowing Ripple Ring */}
              <Animated.View
                style={[
                  styles.resetHaloRipple,
                  {
                    transform: [{ scale: rippleScale }],
                    opacity: rippleOpacity,
                  },
                ]}
                pointerEvents="none"
              />

              {/* Glowing Pulse Button */}
              <Animated.View
                style={[
                  styles.actionButton,
                  styles.resetButton,
                  {
                    borderColor: animatedBorderColor,
                    backgroundColor: animatedBackgroundColor,
                    borderWidth: animatedBorderWidth,
                    elevation: 10,
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
                    size={18}
                    color="#FCD34D"
                  />
                </Pressable>
              </Animated.View>
            </View>

            {orientation !== 'corner-grid' && (
              <Text style={[styles.actionButtonLabel, { color: '#FCD34D', fontWeight: '800' }]} numberOfLines={1}>
                {t('common.reset', { defaultValue: 'Reset' })}
              </Text>
            )}
          </View>
        )}

        {/* 3D Mode Toggle */}
        <View style={styles.actionItem}>
          <Pressable
            style={[styles.actionButton, is3DMode && styles.activeButton]}
            onPress={() => {
              tapLight();
              onToggle3D();
            }}
            accessibilityLabel={t('mapExtended.mode3D', { defaultValue: '3D' })}
          >
            <Ionicons
              name={is3DMode ? 'cube' : 'cube-outline'}
              size={18}
              color={is3DMode ? '#FCD34D' : '#FFFFFF'}
            />
          </Pressable>
          {orientation !== 'corner-grid' && (
            <Text
              style={[
                styles.actionButtonLabel,
                is3DMode && { color: '#FCD34D' },
              ]}
              numberOfLines={1}
            >
              {is3DMode ? '3D ON' : '3D'}
            </Text>
          )}
        </View>

        {/* District Focus Toggle */}
        {stateCode !== 'IN' && selectedConstituency && (
          <View style={styles.actionItem}>
            <Pressable
              style={[styles.actionButton, focusedDistrict !== '' && styles.activeButton]}
              onPress={() => {
                tapLight();
                onToggleDistrict();
              }}
              accessibilityLabel={t('mapExtended.district', { defaultValue: 'District' })}
            >
              <Ionicons
                name="business"
                size={18}
                color={focusedDistrict !== '' ? '#FCD34D' : '#FFFFFF'}
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
                size={18}
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
              <Ionicons name="locate" size={18} color="#FCD34D" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.5)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
    padding: 5,
  },
  minimizedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 95,
  },
  minimizedButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 2,
    borderColor: '#C5A059',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  minimizedResetDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FCD34D',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  containerVertical: {
    alignItems: 'center',
  },
  containerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerCornerGrid: {
    maxWidth: 115,
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
    padding: 2,
  },
  actionsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsVertical: {
    flexDirection: 'column',
    gap: 6,
  },
  actionsHorizontal: {
    flexDirection: 'row',
    gap: 6,
  },
  actionsCornerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    width: 100,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
  },
  actionButton: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C5A059',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  innerPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonWrapper: {
    position: 'relative',
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetHaloRipple: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  searchButton: {
    borderColor: '#60A5FA',
  },
  compareButton: {
    borderColor: '#A78BFA',
  },
  resetButton: {
    borderColor: '#FCD34D',
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
    fontSize: 8.5,
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
