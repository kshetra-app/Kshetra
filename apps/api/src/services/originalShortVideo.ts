import { execFile } from 'node:child_process';
import { mkdtemp, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { CONTENT_LIMITS } from '@kshetra/shared';
import { supabase } from '../lib/supabase';

const run = promisify(execFile);
let activeProbes = 0;
export const SHORT_VIDEO_BUCKET = 'short-videos';
export class ShortInspectionUnavailable extends Error {}

export async function inspectOriginalShort(path: string) {
  if (activeProbes >= 2) throw new ShortInspectionUnavailable();
  activeProbes++;
  let directory: string | undefined;
  try {
    const { data, error } = await supabase.storage.from(SHORT_VIDEO_BUCKET).download(path);
    if (error) {
      if (/not found|does not exist/i.test(error.message)) return null;
      throw new ShortInspectionUnavailable();
    }
    if (!data?.size || data.size > CONTENT_LIMITS.short.maxBytes) return null;
    directory = await mkdtemp(join(tmpdir(), 'poligram-short-'));
    const file = join(directory, 'upload.mp4');
    await writeFile(file, Buffer.from(await data.arrayBuffer()));
    try {
      const { stdout } = await run(
        'ffprobe',
        [
          '-v',
          'error',
          '-protocol_whitelist',
          'file',
          '-f',
          'mov',
          '-show_entries',
          'format=duration:format_tags=major_brand:stream=codec_name,codec_type,width,height,avg_frame_rate:stream_disposition=attached_pic:stream_side_data=rotation',
          '-of',
          'json',
          file,
        ],
        { timeout: 6000, maxBuffer: 64 * 1024, windowsHide: true },
      );
      const inspection = JSON.parse(stdout);
      const duration = Number(inspection.format?.duration);
      const streams = (inspection.streams ?? []) as Array<{
        codec_name?: string;
        codec_type: string;
        width?: number;
        height?: number;
        avg_frame_rate?: string;
        disposition?: { attached_pic?: number };
        side_data_list?: { rotation?: number }[];
      }>;
      const video = streams.find(
        (stream) => stream.codec_type === 'video' && !stream.disposition?.attached_pic,
      );
      const audio = streams.find((stream) => stream.codec_type === 'audio');
      if (
        !video?.width ||
        !video.height ||
        video.codec_name !== 'h264' ||
        !Number.isFinite(duration) ||
        duration <= 0 ||
        duration > CONTENT_LIMITS.short.maxSeconds ||
        inspection.format?.tags?.major_brand?.trim() === 'qt'
      )
        return null;
      const rotation =
        video.side_data_list?.find((data) => Number.isFinite(data.rotation))?.rotation ?? 0;
      const [frames, seconds] = (video.avg_frame_rate ?? '').split('/').map(Number);
      const frameRate = frames / seconds;
      return {
        durationSeconds: Math.ceil(duration),
        metadata: {
          mimeType: 'video/mp4',
          bytes: data.size,
          width: Math.abs(rotation) % 180 === 90 ? video.height : video.width,
          height: Math.abs(rotation) % 180 === 90 ? video.width : video.height,
          videoCodec: video.codec_name,
          audioCodec: audio?.codec_name ?? null,
          framesPerSecond:
            Number.isFinite(frameRate) && frameRate > 0 ? Math.round(frameRate * 100) / 100 : null,
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new ShortInspectionUnavailable();
      return null;
    }
  } finally {
    activeProbes--;
    if (directory) {
      await rm(join(directory, 'upload.mp4'), { force: true }).catch(() => undefined);
      await rmdir(directory).catch(() => undefined);
    }
  }
}
