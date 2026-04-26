import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
}

function SettingRow({ icon, label, value, onPress, color = '#4F8EF7' }: SettingRowProps) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress} disabled={!onPress}>
      <View style={[styles.settingIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color="#374151" />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color="#4F8EF7" />
        </View>
        <Text style={styles.headerTitle}>Guest User</Text>
        <Text style={styles.headerSubtitle}>
          Sign in to save favourites and get alerts
        </Text>
        <Pressable style={styles.signInButton}>
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.card}>
          <SettingRow icon="information-circle" label="Version" value="0.1.0" />
          <SettingRow icon="map" label="State" value="Telangana" />
          <SettingRow icon="people" label="Constituencies" value="119" />
          <SettingRow icon="server" label="Data" value="2023 Elections" />
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications"
            label="Notifications"
            value="Coming Soon"
            color="#F59E0B"
          />
          <SettingRow
            icon="moon"
            label="Theme"
            value="Dark"
            color="#8B5CF6"
          />
          <SettingRow
            icon="language"
            label="Language"
            value="English"
            color="#10B981"
          />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingRow
            icon="shield-checkmark"
            label="Privacy Policy"
            onPress={() => {}}
            color="#10B981"
          />
          <SettingRow
            icon="document-text"
            label="Terms of Service"
            onPress={() => {}}
            color="#6B7280"
          />
          <SettingRow
            icon="logo-github"
            label="Source Code"
            onPress={() => Linking.openURL('https://github.com')}
            color="#9CA3AF"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>KSHETRA</Text>
        <Text style={styles.footerText}>
          India's Political Intelligence Platform
        </Text>
        <Text style={styles.footerVersion}>v0.1.0 · Phase 1</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#4F8EF7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  signInText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F8EF7',
    letterSpacing: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 4,
  },
  footerVersion: {
    fontSize: 11,
    color: '#1F2937',
    marginTop: 2,
  },
});
