import { StyleSheet } from 'react-native';

/**
 * Styles for the map screen (app/(tabs)/index.tsx).
 * Extracted verbatim — values unchanged.
 */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionButtons: {
    position: 'absolute',
    right: 16,
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  locateButton: {
    backgroundColor: '#4F8EF7',
  },
  compareButton: {
    backgroundColor: '#8B5CF6',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  homeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 142, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F8EF7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // ─── Bottom Sheet ───
  sheetBackground: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: '#4B5563',
    width: 40,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  partyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 14,
  },
  partyBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetTitleGroup: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resultSection: {
    marginBottom: 14,
  },
  resultLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  sheetAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  sheetAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  resultValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  defectionRow: {
    marginBottom: 14,
  },
  triviaRow: {
    marginBottom: 14,
  },
  colorToggleContainer: {
    position: 'absolute',
    left: 16,
  },
  idleTriviaContainer: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F8EF7',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  detailButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // ─── Historical mini-cards ───
  histRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  histMiniCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  histMiniCardCurrent: {
    borderWidth: 1,
    borderColor: '#4F8EF740',
  },
  histMiniYear: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  histMiniParty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  // ─── Delimitation overlay ───
  delimButtonActive: {
    backgroundColor: '#78350F',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  delimBar: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    right: 10,
    backgroundColor: '#1C1917F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FCD34D40',
    elevation: 5,
  },
  delimBarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  delimBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCD34D',
    flex: 1,
  },
  delimBarBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    backgroundColor: '#78350F50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  delimBarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  delimDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  delimBarLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  delimBarSpacer: {
    flex: 1,
  },
  delimBarStat: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  delimBarLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCD34D',
    textAlign: 'center',
  },
});
