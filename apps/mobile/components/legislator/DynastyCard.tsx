import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale as ms } from '@/lib/responsive';

interface FamilyMember {
  name?: string;
  relation: string;
  party?: string;
  position?: string;
  years?: string;
}

interface Props {
  isDynast: boolean;
  politicalGeneration: number;
  familyInPolitics: FamilyMember[];
  familyConstituencies?: string[];
}

export default function DynastyCard({ isDynast, politicalGeneration, familyInPolitics, familyConstituencies }: Props) {
  if (!isDynast && familyInPolitics.length === 0) return null;

  const genLabel = politicalGeneration === 1 ? '1st Gen' : politicalGeneration === 2 ? '2nd Gen' : `${politicalGeneration}th Gen`;
  const genColor = politicalGeneration >= 3 ? '#EF4444' : politicalGeneration === 2 ? '#F59E0B' : '#10B981';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="git-network" size={18} color="#F59E0B" />
        <Text style={styles.title}>Political Dynasty</Text>
        <View style={[styles.genBadge, { backgroundColor: genColor + '20' }]}>
          <Text style={[styles.genText, { color: genColor }]}>{genLabel}</Text>
        </View>
      </View>

      {/* Dynasty indicator */}
      {isDynast && (
        <View style={styles.dynastIndicator}>
          <Ionicons name="information-circle" size={14} color="#F59E0B" />
          <Text style={styles.dynastText}>
            This legislator comes from a political family
          </Text>
        </View>
      )}

      {/* Family tree */}
      {familyInPolitics.length > 0 && (
        <View style={styles.familySection}>
          <Text style={styles.familyTitle}>Family in Politics</Text>
          {familyInPolitics.map((member, idx) => (
            <View key={idx} style={styles.memberRow}>
              <View style={styles.memberIcon}>
                <Ionicons name={getRelationIcon(member.relation) as any} size={14} color="#9CA3AF" />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberRelation}>{member.relation}</Text>
                {member.name && <Text style={styles.memberName}>{member.name}</Text>}
                {member.position && <Text style={styles.memberPosition}>{member.position}</Text>}
                {member.party && (
                  <View style={styles.memberPartyChip}>
                    <Text style={styles.memberPartyText}>{member.party}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Family constituencies */}
      {familyConstituencies && familyConstituencies.length > 0 && (
        <View style={styles.constSection}>
          <Text style={styles.constTitle}>Family Constituencies</Text>
          <View style={styles.constChips}>
            {familyConstituencies.map((c, idx) => (
              <View key={idx} style={styles.constChip}>
                <Ionicons name="location" size={10} color="#9CA3AF" />
                <Text style={styles.constChipText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function getRelationIcon(relation: string): string {
  const r = relation.toLowerCase();
  if (r.includes('father') || r.includes('mother') || r.includes('parent')) return 'people';
  if (r.includes('son') || r.includes('daughter') || r.includes('child')) return 'person';
  if (r.includes('spouse') || r.includes('wife') || r.includes('husband')) return 'heart';
  if (r.includes('brother') || r.includes('sister') || r.includes('sibling')) return 'people-circle';
  return 'person';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: ms(15),
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  genBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  genText: {
    fontSize: ms(10),
    fontWeight: '700',
  },
  dynastIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B10',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  dynastText: {
    fontSize: ms(11),
    color: '#F59E0B',
    fontWeight: '500',
    flex: 1,
  },
  familySection: {
    marginBottom: 12,
  },
  familyTitle: {
    fontSize: ms(11),
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  memberIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberRelation: {
    fontSize: ms(10),
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  memberName: {
    fontSize: ms(13),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  memberPosition: {
    fontSize: ms(10),
    color: '#9CA3AF',
  },
  memberPartyChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  memberPartyText: {
    fontSize: ms(9),
    color: '#D1D5DB',
    fontWeight: '600',
  },
  constSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  constTitle: {
    fontSize: ms(11),
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  constChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  constChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  constChipText: {
    fontSize: ms(10),
    color: '#D1D5DB',
    fontWeight: '500',
  },
});
