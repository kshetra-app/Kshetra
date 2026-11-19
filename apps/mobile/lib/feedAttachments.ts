import type { PostMedia } from './feedTypes';
import { supabase } from './supabase';
import { File } from 'expo-file-system';
import { exceedsFeedMediaLimit } from '@kshetra/shared';

export type SubmittedAttachment = Pick<PostMedia, 'mediaType' | 'url' | 'altText'>;
const types = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};

export function validWebLink(value: string) {
  try {
    const url = new URL(value);
    return value.length <= 2048 && ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export async function prepareFeedAttachments(items: PostMedia[], userId: string): Promise<SubmittedAttachment[]> {
  if (exceedsFeedMediaLimit(items)) throw new Error('Attach up to four items: three photos, one video and one link.');
  const result: SubmittedAttachment[] = [];
  for (const item of items) {
    const altText = item.altText?.slice(0, 200);
    if (item.mediaType === 'link') {
      if (!validWebLink(item.url)) throw new Error('Enter a complete http or https link.');
      result.push({ mediaType: 'link', url: item.url, altText });
      continue;
    }
    const file = new File(item.url);
    if (!file.exists || !file.size || file.size > 25 * 1024 * 1024) throw new Error('Choose a file up to 25 MB.');
    const mime = item.mimeType || file.type;
    if (!Object.prototype.hasOwnProperty.call(types, mime) || !mime.startsWith(item.mediaType + '/')) {
      throw new Error('Choose a JPEG, PNG, WebP, MP4, MOV or WebM file.');
    }
    const path = userId + '/' + item.id + '.' + types[mime as keyof typeof types];
    const { error } = await supabase.storage.from('post-media').upload(path, await file.arrayBuffer(), { contentType: mime, upsert: false });
    // Immutable object names permit a retry after the original upload succeeded.
    if (error && !['409','Duplicate','ResourceAlreadyExists'].includes(String((error as { statusCode?: string }).statusCode ?? '')) && !/already exists/i.test(error.message)) {
      throw new Error('The attachment could not be uploaded. Check your connection and retry.');
    }
    result.push({ mediaType: item.mediaType, url: path, altText });
  }
  return result;
}
