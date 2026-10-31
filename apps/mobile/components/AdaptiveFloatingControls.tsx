import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tapLight } from '../lib/haptics';
import {
  computeControlOrientation,
  type ControlOrientation,
} from '../lib/adaptiveControlMath';

export { computeControlOrientation, type ControlOrientation };

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
  initialX,
  initialY,
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Sensible dynamic default positions flush to right side below header
  const defaultX = initialX ?? Math.max(0, windowWidth - 58);
  const defaultY = initialY ?? (insets.top > 0 ? insets.top + 75 : 85);

  // Floating coordinates and orientation
  const pan = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const currentPos = useRef({ x: defaultX, y: defaultY });

  // Measured layout dimensions of the control cluster
  const [layoutDimensions, setLayoutDimensions] = useState({ width: 48, height: 120 });
  const layoutDimRef = useRef({ width: 48, height: 120 });

  // Minimized / collapsed state to provide 100% unobstructed view when desired
  const [isMinimized, setIsMinimized] = useState(false);

  // Sync position if initial props explicitly change
  useEffect(() => {
    if (initialX != null || initialY != null) {
      const nextX = initialX ?? currentPos.current.x;
      const nextY = initialY ?? currentPos.current.y;
      currentPos.current = { x: nextX, y: nextY };
      pan.setValue({ x: nextX, y: nextY });
    }
  }, [initialX, initialY, pan]);

  // Keep within screen bounds when window resizes or device rotates
  useEffect(() => {
    const curW = layoutDimRef.current.width;
    const curH = layoutDimRef.current.height;
    const minX = 0;
    const maxX = Math.max(0, windowWidth - curW);
    const minY = insets.top > 0 ? insets.top : 24;
    const maxY = Math.max(minY, windowHeight - curH - (insets.bottom > 0 ? insets.bottom : 12) - 48);

    const safeX = Math.max(minX, Math.min(maxX, currentPos.current.x));
    const safeY = Math.max(minY, Math.min(maxY, currentPos.current.y));

    if (safeX !== currentPos.current.x || safeY !== currentPos.current.y) {
      currentPos.current = { x: safeX, y: safeY };
      pan.setValue({ x: safeX, y: safeY });
    }
  }, [windowWidth, windowHeight, insets, pan]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      layoutDimRef.current = { width, height };
      setLayoutDimensions({ width, height });
    }
  }, []);

  const isResetVisible =
    isImmersive ||
    selectedConstituency != null ||
    mapCompareActive ||
    focusedDistrict !== '' ||
    stateCode !== 'IN' ||
    is3DMode;

  // Glowing pulse & blinking halo animations for Reset button
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(1)).current;
  const rippleOpacity = useRef(new Animated.Value(0.85)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isResetVisible) return;

    // Glowing border & background pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );

    // Glowing ripple halo expanding outward
    const rippleLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(rippleScale, {
            toValue: 1.55,
            duration: 1400,
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
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0.85,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Blinking icon intensity
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.45,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    rippleLoop.start();
    blinkLoop.start();

    return () => {
      pulseLoop.stop();
      rippleLoop.stop();
      blinkLoop.stop();
    };
  }, [isResetVisible, pulseAnim, rippleScale, rippleOpacity, blinkAnim]);

  // Zero-spring, 100% "stay put" PanResponder with true screen edge clamping
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
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const rawX = currentPos.current.x + gestureState.dx;
        const rawY = currentPos.current.y + gestureState.dy;

        const curW = layoutDimRef.current.width;
        const curH = layoutDimRef.current.height;

        // True screen edge bounds:
        // Left: 0 (flush against left bezel)
        // Right: windowWidth - curW (flush against right bezel)
        // Top: insets.top (flush below status bar)
        // Bottom: windowHeight - curH - insets.bottom - 48 (flush above bottom tab bar)
        const minX = 0;
        const maxX = Math.max(0, windowWidth - curW);
        const minY = insets.top > 0 ? insets.top : 24;
        const maxY = Math.max(minY, windowHeight - curH - (insets.bottom > 0 ? insets.bottom : 12) - 48);

        const clampedX = Math.max(minX, Math.min(maxX, rawX));
        const clampedY = Math.max(minY, Math.min(maxY, rawY));

        // STAY PUT: Keep directly at user release coordinate, zero spring, zero bounce-back!
        pan.setValue({ x: clampedX, y: clampedY });
        currentPos.current = { x: clampedX, y: clampedY };
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
    outputRange: ['#F59E0B', '#FEF08A'],
  });

  const animatedBackgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1E293B', '#451A03'],
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
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={styles.minimizedButton}
          onPress={handleToggleMinimize}
          accessibilityLabel={t('mapExtended.expandControls', { defaultValue: 'Expand Controls' })}
        >
          <Ionicons name="apps" size={20} color="#FCD34D" />
          {isResetVisible && <View style={styles.minimizedResetDot} />}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {/* Draggable Grip Handle & Minimize toggle */}
      <View style={styles.dragHandleContainer}>
        <Pressable
          style={styles.dragHandlePill}
          onPress={handleToggleMinimize}
          accessibilityLabel={t('mapExtended.minimizeControls', { defaultValue: 'Minimize Controls' })}
          hitSlop={8}
        >
          <View style={styles.dragHandleBar} />
        </Pressable>
      </View>

      {/* Floating Action Cluster - Transparent and Unobtrusive */}
      <View style={styles.actionsWrapper}>
        {/* Search (State & AC View) */}
        {stateCode !== 'IN' && (
          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionItemPressable}
              onPress={() => {
                tapLight();
                onOpenSearch();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.search')}
            >
              <View style={[styles.actionButton, styles.searchButton]}>
                <Ionicons name="search" size={19} color="#60A5FA" />
              </View>
              <Text style={styles.actionButtonLabel} numberOfLines={1}>
                {t('common.search')}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Compare (State & AC View) */}
        {stateCode !== 'IN' && (
          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionItemPressable}
              onPress={() => {
                tapLight();
                onOpenCompare();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.compare', { defaultValue: 'Compare' })}
            >
              <View style={[styles.actionButton, styles.compareButton]}>
                <Ionicons name="git-compare" size={19} color="#A78BFA" />
              </View>
              <Text style={styles.actionButtonLabel} numberOfLines={1}>
                {t('common.compare', { defaultValue: 'Compare' })}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Reset (with Glowing Pulse & Blinking Halo) */}
        {isResetVisible && (
          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionItemPressable}
              onPress={handleResetPress}
              accessibilityRole="button"
              accessibilityLabel={t('common.reset', { defaultValue: 'Reset' })}
            >
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
                  <Animated.View style={{ opacity: blinkAnim }}>
                    <Ionicons name="refresh" size={19} color="#FCD34D" />
                  </Animated.View>
                </Animated.View>
              </View>

              <Text style={[styles.actionButtonLabel, { color: '#FCD34D', fontWeight: '800' }]} numberOfLines={1}>
                {t('common.reset', { defaultValue: 'Reset' })}
              </Text>
            </Pressable>
          </View>
        )}

        {/* 3D Mode Toggle (Matching original 3D View button) */}
        <View style={styles.actionItem}>
          <Pressable
            style={styles.actionItemPressable}
            onPress={() => {
              tapLight();
              onToggle3D();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('mapExtended.mode3D', { defaultValue: '3D' })}
          >
            <View style={[styles.actionButton, is3DMode && styles.activeButton]}>
              <Ionicons
                name={is3DMode ? 'cube' : 'cube-outline'}
                size={19}
                color={is3DMode ? '#FCD34D' : '#FFFFFF'}
              />
            </View>
            <Text
              style={[
                styles.actionButtonLabel,
                is3DMode && { color: '#FCD34D' },
              ]}
              numberOfLines={1}
            >
              {is3DMode ? '3D ON' : '3D View'}
            </Text>
          </Pressable>
        </View>

        {/* District Focus Toggle (State View with selected AC) */}
        {stateCode !== 'IN' && selectedConstituency && (
          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionItemPressable}
              onPress={() => {
                tapLight();
                onToggleDistrict();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('mapExtended.district', { defaultValue: 'District' })}
            >
              <View style={[styles.actionButton, focusedDistrict !== '' && styles.activeButton]}>
                <Ionicons
                  name="business"
                  size={19}
                  color={focusedDistrict !== '' ? '#FCD34D' : '#FFFFFF'}
                />
              </View>
              <Text
                style={[
                  styles.actionButtonLabel,
                  focusedDistrict !== '' && { color: '#FCD34D' },
                ]}
                numberOfLines={1}
              >
                {t('mapExtended.district', { defaultValue: 'District' })}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Delimitation / Seat Density Toggle (State View) */}
        {stateCode !== 'IN' && (
          <View style={styles.actionItem}>
            <Pressable
              style={styles.actionItemPressable}
              onPress={() => {
                tapLight();
                onToggleDelimitation();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('mapExtended.density', { defaultValue: 'Density' })}
            >
              <View style={[styles.actionButton, showDelimitation && styles.delimButtonActive]}>
                <Ionicons
                  name="layers"
                  size={19}
                  color={showDelimitation ? '#34D399' : '#FFFFFF'}
                />
              </View>
              <Text
                style={[
                  styles.actionButtonLabel,
                  showDelimitation && { color: '#34D399' },
                ]}
                numberOfLines={1}
              >
                {t('mapExtended.density', { defaultValue: 'Density' })}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Locate Me (Deep Crimson circle matching original Locate button) */}
        <View style={styles.actionItem}>
          <Pressable
            style={[styles.actionItemPressable, locating && styles.actionButtonDisabled]}
            onPress={() => {
              tapLight();
              onLocateMe();
            }}
            disabled={locating}
            accessibilityRole="button"
            accessibilityLabel={t('mapExtended.locate', { defaultValue: 'Locate' })}
          >
            <View style={[styles.actionButton, styles.locateButton]}>
              {locating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="navigate" size={19} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.actionButtonLabel} numberOfLines={1}>
              {t('mapExtended.locate', { defaultValue: 'Locate' })}
            </Text>
          </Pressable>
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
    backgroundColor: 'transparent',
    alignItems: 'center',
    overflow: 'visible',
  },
  minimizedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 95,
    overflow: 'visible',
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
  dragHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 3,
  },
  dragHandlePill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  dragHandleBar: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(197, 160, 89, 0.8)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  actionsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 8,
    overflow: 'visible',
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    overflow: 'visible',
  },
  actionItemPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C5A059',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 6,
  },
  innerPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  resetHaloRipple: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
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
    backgroundColor: '#B45309',
    borderColor: '#FCD34D',
    borderWidth: 2,
  },
  delimButtonActive: {
    backgroundColor: '#065F46',
    borderColor: '#34D399',
    borderWidth: 2,
  },
  locateButton: {
    backgroundColor: '#991B1B',
    borderColor: '#EF4444',
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
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
