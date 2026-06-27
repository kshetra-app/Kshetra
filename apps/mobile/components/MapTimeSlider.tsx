import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MapTimeSliderProps {
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export default function MapTimeSlider({ years, selectedYear, onYearChange }: MapTimeSliderProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const playIntervalRef = useRef<any>(null);

  // Auto-play interval handling
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        const currentIndex = years.indexOf(selectedYear);
        const nextIndex = (currentIndex + 1) % years.length;
        onYearChange(years[nextIndex]);
      }, 2000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, selectedYear, years, onYearChange]);

  if (years.length <= 1) return null;

  return (
    <View style={styles.container}>
      {/* Play/Pause Button */}
      <Pressable
        style={styles.playButton}
        onPress={() => setIsPlaying((p) => !p)}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={16}
          color="#FFFFFF"
        />
      </Pressable>

      {/* Timeline track and buttons */}
      <View style={styles.timelineContainer}>
        {/* Horizontal track line */}
        <View style={styles.trackLine} />

        {years.map((year, idx) => {
          const isSelected = selectedYear === year;
          return (
            <Pressable
              key={year}
              style={styles.nodeWrapper}
              onPress={() => {
                setIsPlaying(false);
                onYearChange(year);
              }}
            >
              <View style={[
                styles.nodeDot,
                isSelected && styles.nodeDotActive
              ]}>
                {isSelected && <View style={styles.nodeDotInner} />}
              </View>
              <Text style={[
                styles.nodeLabel,
                isSelected && styles.nodeLabelActive
              ]}>
                {year}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#374151',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  playButton: {
    backgroundColor: '#3B82F6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    minWidth: 180,
    paddingRight: 6,
  },
  trackLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#4B5563',
    zIndex: 0,
  },
  nodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  nodeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeDotActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#93C5FD',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  nodeDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 4,
  },
  nodeLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
