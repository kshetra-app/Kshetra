import { getYouTubeVideoId } from '../youtube';

describe('YouTube Shorts playback links', () => {
  const id = 'M7lc1UVf-VE';
  it.each([
    `https://www.youtube.com/watch?v=${id}&t=12`,
    `https://youtu.be/${id}?t=12`,
    `https://m.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ])('resolves the video ID in %s', (link) => {
    expect(getYouTubeVideoId(link)).toBe(id);
  });

  it.each([
    'https://example.com/watch?v=M7lc1UVf-VE',
    'https://youtu.be/invalid',
    'https://youtube.com/watch?v=M7lc1UVf-VEextra',
    'https://username@youtube.com/embed/M7lc1UVf-VE',
    'http://youtu.be/M7lc1UVf-VE',
  ])('rejects unsupported or malformed links', (link) => {
    expect(getYouTubeVideoId(link)).toBeNull();
  });
});
