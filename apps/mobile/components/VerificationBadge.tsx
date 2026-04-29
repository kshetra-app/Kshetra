import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ROLE_CONFIG, type UserRole } from '../lib/moderationTypes';

interface VerificationBadgeProps {
  role: UserRole;
  isVerified?: boolean;
  compact?: boolean;
}

export default function VerificationBadge({ role, isVerified, compact }: VerificationBadgeProps) {
  const config = ROLE_CONFIG[role];

  // Citizens without verification don't show a badge
  if (role === 'citizen' && !isVerified) return null;

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon as any} size={10} color={config.color} />
        {isVerified && (
          <Ionicons name="checkmark-circle" size={10} color="#4F8EF7" />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '15', borderColor: config.color + '30' }]}>
      <Ionicons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      {isVerified && (
        <Ionicons name="checkmark-circle" size={12} color="#4F8EF7" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
});
