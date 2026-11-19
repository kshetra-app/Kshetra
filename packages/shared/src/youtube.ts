/** The Shorts player embeds a video by its YouTube ID. Ignore tracking parameters. */
export function getYouTubeVideoId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    let id: string | null;
    if (url.hostname === 'youtu.be') {
      id = url.pathname.slice(1);
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : (url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1] ?? null);
    } else {
      return null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
