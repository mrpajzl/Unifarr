import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MediaStreamInfo {
  codec: string;
  type: 'video' | 'audio' | 'subtitle';
  language?: string;
  title?: string;
  bitrate?: number;
  resolution?: string; // e.g., "1920x1080"
  fps?: number;
  channels?: number; // For audio
}

export interface MediaFileInfo {
  path: string;
  filename: string;
  size: number; // bytes
  duration: number; // seconds
  bitrate: number; // kbps
  resolution?: string; // e.g., "1920x1080"
  videoCodec?: string;
  audioCodec?: string;
  audioLanguages: string[];
  subtitleLanguages: string[];
  streams: MediaStreamInfo[];
}

/**
 * Extract detailed media info using ffprobe
 */
export async function getMediaFileInfo(filePath: string): Promise<MediaFileInfo | null> {
  try {
    // Check if ffprobe is available
    try {
      await execAsync('which ffprobe');
    } catch {
      console.warn('ffprobe not found in PATH. Please install ffmpeg to get detailed media info.');
      return null;
    }

    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
    );

    const data = JSON.parse(stdout);
    
    if (!data.format || !data.streams) {
      console.error(`Invalid ffprobe output for ${filePath}`);
      return null;
    }

    const format = data.format;
    const streams = data.streams;

    // Extract video stream info
    const videoStream = streams.find((s: any) => s.codec_type === 'video');
    const audioStreams = streams.filter((s: any) => s.codec_type === 'audio');
    const subtitleStreams = streams.filter((s: any) => s.codec_type === 'subtitle');

    // Parse streams
    const parsedStreams: MediaStreamInfo[] = streams.map((s: any) => {
      const stream: MediaStreamInfo = {
        codec: s.codec_name || 'unknown',
        type: s.codec_type,
        language: s.tags?.language,
        title: s.tags?.title,
        bitrate: s.bit_rate ? parseInt(s.bit_rate) / 1000 : undefined, // Convert to kbps
      };

      // Video-specific
      if (s.codec_type === 'video') {
        stream.resolution = `${s.width}x${s.height}`;
        stream.fps = s.r_frame_rate ? eval(s.r_frame_rate) : undefined; // e.g., "24000/1001" -> 23.976
      }

      // Audio-specific
      if (s.codec_type === 'audio') {
        stream.channels = s.channels;
      }

      return stream;
    });

    // Extract audio languages
    const audioLanguages = audioStreams
      .map((s: any) => s.tags?.language || s.tags?.title)
      .filter(Boolean)
      .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i); // Unique

    // Extract subtitle languages
    const subtitleLanguages = subtitleStreams
      .map((s: any) => s.tags?.language || s.tags?.title)
      .filter(Boolean)
      .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i); // Unique

    return {
      path: filePath,
      filename: filePath.split('/').pop() || filePath,
      size: parseInt(format.size || '0'),
      duration: parseFloat(format.duration || '0'),
      bitrate: parseInt(format.bit_rate || '0') / 1000, // Convert to kbps
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
      videoCodec: videoStream?.codec_name,
      audioCodec: audioStreams[0]?.codec_name,
      audioLanguages,
      subtitleLanguages,
      streams: parsedStreams,
    };
  } catch (error) {
    console.error(`Failed to get media info for ${filePath}:`, error);
    return null;
  }
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
