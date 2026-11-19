export function matchesNewsCategory(
  item: {
    category: string;
    categories?: readonly string[];
    breaking?: boolean;
    video?: unknown;
    publishedAt: string;
  },
  category: string,
  now = Date.now(),
): boolean {
  if (category === 'top') return true;
  if (category === 'video') return Boolean(item.video);
  if (category === 'breaking') {
    const age = now - Date.parse(item.publishedAt);
    return item.breaking === true && age >= -300_000 && age <= 6 * 60 * 60 * 1000;
  }
  return item.category === category || (item.categories?.includes(category) ?? false);
}
