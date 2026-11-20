type CandidateVote = number | null | undefined;

export function getSnapshotVoteShares(
  recordedTotal: number | undefined,
  votes: CandidateVote[],
  reportedShares: CandidateVote[],
) {
  const counts = votes.map((vote) =>
    typeof vote === 'number' && Number.isSafeInteger(vote) && vote >= 0 ? vote : null,
  );
  const knownVotes = counts.reduce<number>((sum, vote) => sum + (vote ?? 0), 0);
  const shares = reportedShares.map((share, index) =>
    counts[index] != null && typeof share === 'number' && Number.isFinite(share) && share >= 0 && share <= 100
      ? share
      : null,
  );
  const total = typeof recordedTotal === 'number' && Number.isSafeInteger(recordedTotal) &&
    recordedTotal > 0 && recordedTotal >= knownVotes &&
    shares.every((share, index) => share == null ||
      Math.abs(share - (counts[index]! / recordedTotal) * 100) <= 0.11)
    ? recordedTotal
    : null;

  if (total != null) {
    return {
      total,
      shares: counts.map((vote) => vote == null ? null : vote / total * 100),
      others: counts[0] != null && counts[1] != null
        ? (total - knownVotes) / total * 100
        : null,
    };
  }

  // The source may publish rounded shares even when its total is missing.
  // Withhold an inconsistent set and never infer a total from rounded shares.
  const reportedSum = shares.reduce<number>((sum, share) => sum + (share ?? 0), 0);
  return {
    total: null,
    shares: reportedSum <= 100 ? shares : counts.map(() => null),
    others: null,
  };
}
