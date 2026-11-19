export const CONTENT_LIMITS = {
  post: { discussion: 1500, news: 1500, opinion: 1500, question: 500, poll: 300, alert: 400 },
  comment: 600,
  pollOption: 80,
  pollOptions: 4,
  civic: { title: 120, description: 1200, attachments: 3 },
  short: { title: 80, description: 350, maxSeconds: 60, maxBytes: 25 * 1024 * 1024 },
  feedMedia: { total: 4, image: 3, video: 1, link: 1 },
} as const;

export interface ShortMediaMetadata {
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
  framesPerSecond: number | null;
}

export function exceedsFeedMediaLimit(
  items: readonly { mediaType: 'image' | 'video' | 'link' }[],
): boolean {
  const limit = CONTENT_LIMITS.feedMedia;
  if (items.length > limit.total) return true;
  return (['image', 'video', 'link'] as const).some(
    (type) => items.filter((item) => item.mediaType === type).length > limit[type],
  );
}
