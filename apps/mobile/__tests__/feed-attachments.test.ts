jest.mock('../lib/supabase', () => ({
  supabase: { storage: { from: jest.fn() } },
}));
jest.mock('expo-file-system', () => ({
  File: class {
    exists = true;
    size = 128;
    type = 'image/png';
    async arrayBuffer() { return new ArrayBuffer(128); }
  },
}));

import { supabase } from '../lib/supabase';
import { prepareFeedAttachments } from '../lib/feedAttachments';
import type { PostMedia } from '../lib/feedTypes';

describe('feed attachments', () => {
  const image: PostMedia = { id: 'photo-1', mediaType: 'image', url: 'file:///photo.png' };
  const link: PostMedia = { id: 'link-1', mediaType: 'link', url: 'https://example.com/story' };

  it('sends immutable owner paths and keeps attachments in selection order', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    (supabase.storage.from as jest.Mock).mockReturnValue({ upload });
    const attachments = await prepareFeedAttachments([image, link], 'creator-a');
    expect(supabase.storage.from).toHaveBeenCalledWith('post-media');
    expect(upload).toHaveBeenCalledWith('creator-a/photo-1.png', expect.any(ArrayBuffer), { contentType: 'image/png', upsert: false });
    expect(attachments.map((item) => item.url)).toEqual(['creator-a/photo-1.png', link.url]);
  });

  it('reuses a completed upload when resuming the same selection', async () => {
    const upload = jest.fn().mockResolvedValue({ error: { statusCode: '409', message: 'Already exists' } });
    (supabase.storage.from as jest.Mock).mockReturnValue({ upload });
    await expect(prepareFeedAttachments([image], 'creator-a')).resolves.toMatchObject([{ url: 'creator-a/photo-1.png' }]);
  });

  it('rejects invalid links, unsupported content types and excess attachments', async () => {
    await expect(prepareFeedAttachments([{ ...link, url: 'file:///private' }], 'creator-a')).rejects.toThrow('link');
    await expect(prepareFeedAttachments([{ ...image, mimeType: 'text/html' }], 'creator-a')).rejects.toThrow('Choose a JPEG');
    await expect(prepareFeedAttachments(Array(6).fill(link), 'creator-a')).rejects.toThrow('four');
  });
});
