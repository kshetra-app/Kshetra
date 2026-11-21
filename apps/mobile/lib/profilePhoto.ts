import { File } from 'expo-file-system';
import { uuid } from 'expo-modules-core';
import { supabase } from './supabase';

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadProfilePhoto(userId: string, uri: string, mimeType?: string | null): Promise<string> {
  const file = new File(uri);
  const mime = mimeType || file.type;
  const extension = PROFILE_PHOTO_TYPES[mime];
  if (!file.exists || !file.size || file.size > PROFILE_PHOTO_MAX_BYTES || !extension) {
    throw new Error('Invalid profile photo');
  }

  const bucket = supabase.storage.from('avatars');
  const path = `${userId}/${uuid.v4()}.${extension}`;
  const { error } = await bucket.upload(path, await file.arrayBuffer(), { contentType: mime, upsert: false });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function removeReplacedProfilePhoto(userId: string, url: string): Promise<void> {
  const bucket = supabase.storage.from('avatars');
  const prefix = bucket.getPublicUrl(`${userId}/`).data.publicUrl;
  if (!url.startsWith(prefix)) return;
  const fileName = url.slice(prefix.length);
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(fileName)) return;
  await bucket.remove([`${userId}/${fileName}`]);
}
