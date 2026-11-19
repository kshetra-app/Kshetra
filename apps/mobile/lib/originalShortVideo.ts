import { File } from 'expo-file-system';
import { CONTENT_LIMITS } from '@kshetra/shared';
import { supabase } from './supabase';

const BUCKET = 'short-videos';
const PATH = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.mp4$/;

export async function uploadOriginalShortVideo(uri: string, userId: string, shortId: string) {
  const file = new File(uri);
  if (!file.exists || !file.size || file.size > CONTENT_LIMITS.short.maxBytes) {
    throw new Error('Choose an MP4 video up to 25 MB.');
  }
  const path = `${userId}/${shortId}.mp4`;
  if (!PATH.test(path)) throw new Error('Sign in again to upload this video.');
  const { error } = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: 'video/mp4',
    upsert: false,
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error('Could not upload the video. Check your connection and try again.');
  }
  return path;
}

export async function resolveOriginalShortVideo(path: string) {
  if (!PATH.test(path)) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
  return error ? null : data?.signedUrl ?? null;
}
