/** Extract tags without dropping combining marks or joiners used in native scripts. */
export function extractContentHashtags(text: string): string[] {
  const tags = text.matchAll(/#([\p{L}\p{N}_][\p{L}\p{M}\p{N}_\u200c\u200d]*)/gu);
  return [...new Set(Array.from(tags, (match) => match[1].normalize('NFC').toLowerCase()))];
}
