/**
 * Filename Parser - Extract media info from filenames
 * Inspired by Radarr's LanguageParser and QualityParser
 */

export interface ParsedMediaInfo {
  resolution?: string;
  video?: {
    codec?: string;
    resolution?: string;
  };
  audio?: Array<{
    language: string;
    codec?: string;
    channels?: string;
  }>;
  subtitles?: string[];
}

/**
 * Parse media information from filename
 */
export function parseFilename(filename: string): ParsedMediaInfo {
  const result: ParsedMediaInfo = {};
  
  // Parse resolution
  const resolution = parseResolution(filename);
  if (resolution) {
    result.resolution = resolution;
    result.video = { resolution };
  }
  
  // Parse video codec
  const videoCodec = parseVideoCodec(filename);
  if (videoCodec) {
    result.video = { ...result.video, codec: videoCodec };
  }
  
  // Parse audio tracks
  const audio = parseAudio(filename);
  if (audio.length > 0) {
    result.audio = audio;
  }
  
  // Parse subtitle languages
  const subtitles = parseSubtitles(filename);
  if (subtitles.length > 0) {
    result.subtitles = subtitles;
  }
  
  return result;
}

/**
 * Parse resolution from filename
 * Based on Radarr's ResolutionRegex
 */
function parseResolution(filename: string): string | undefined {
  const patterns = [
    { regex: /\b(?:2160p|3840x2160|4k[-_. ](?:UHD|HEVC|BD)|(?:UHD|HEVC|BD)[-_. ]4k|\[4K\])\b/i, value: '2160p' },
    { regex: /\b(?:1080p|1920x1080|1440p|FHD|1080i)\b/i, value: '1080p' },
    { regex: /\b(?:720p|1280x720|960p)\b/i, value: '720p' },
    { regex: /\b(?:576p)\b/i, value: '576p' },
    { regex: /\b(?:480p|480i|640x480|848x480)\b/i, value: '480p' },
    { regex: /\b(?:360p)\b/i, value: '360p' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(filename)) {
      return pattern.value;
    }
  }
  
  return undefined;
}

/**
 * Parse video codec from filename
 * Based on Radarr's CodecRegex
 */
function parseVideoCodec(filename: string): string | undefined {
  const patterns = [
    { regex: /\b(?:HEVC|H\.?265|x265)\b/i, value: 'HEVC' },
    { regex: /\b(?:AVC|H\.?264|x264)\b/i, value: 'H.264' },
    { regex: /\b(?:XviD)\b/i, value: 'XviD' },
    { regex: /\b(?:DivX)\b/i, value: 'DivX' },
    { regex: /\b(?:VP9)\b/i, value: 'VP9' },
    { regex: /\b(?:AV1)\b/i, value: 'AV1' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(filename)) {
      return pattern.value;
    }
  }
  
  return undefined;
}

/**
 * Parse audio tracks from filename
 * Detects language, codec, and channel configuration
 */
function parseAudio(filename: string): Array<{ language: string; codec?: string; channels?: string }> {
  const audioTracks: Array<{ language: string; codec?: string; channels?: string }> = [];
  
  // Detect audio codecs
  const audioCodecPatterns = [
    { regex: /\b(?:Atmos|TrueHD[-_. ]Atmos)\b/i, codec: 'Dolby Atmos' },
    { regex: /\b(?:TrueHD)\b/i, codec: 'TrueHD' },
    { regex: /\b(?:DTS[-_. ]?X)\b/i, codec: 'DTS:X' },
    { regex: /\b(?:DTS[-_. ]?HD[-_. ]?MA|DTS-MA)\b/i, codec: 'DTS-HD MA' },
    { regex: /\b(?:DTS[-_. ]?HD|DTS-HD)\b/i, codec: 'DTS-HD' },
    { regex: /\b(?:DTS)\b/i, codec: 'DTS' },
    { regex: /\b(?:DD[+P]|E[-_. ]?AC[-_. ]?3)\b/i, codec: 'DD+' },
    { regex: /\b(?:DD|AC[-_. ]?3)\b/i, codec: 'AC3' },
    { regex: /\b(?:AAC)\b/i, codec: 'AAC' },
    { regex: /\b(?:FLAC)\b/i, codec: 'FLAC' },
    { regex: /\b(?:MP3)\b/i, codec: 'MP3' },
    { regex: /\b(?:Opus)\b/i, codec: 'Opus' },
  ];
  
  let codec: string | undefined;
  for (const pattern of audioCodecPatterns) {
    if (pattern.regex.test(filename)) {
      codec = pattern.codec;
      break;
    }
  }
  
  // Detect channel configuration
  const channels = parseChannels(filename);
  
  // Parse languages (based on Radarr's LanguageParser)
  const languagePatterns = [
    { regex: /\b(?:CZ|Czech)\b/i, lang: 'Czech' },
    { regex: /\b(?:SK|Slovak)\b/i, lang: 'Slovak' },
    { regex: /\b(?:EN|ENG|English)\b/i, lang: 'English' },
    { regex: /\b(?:DE|GER|German)\b/i, lang: 'German' },
    { regex: /\b(?:FR|FRE|French|TRUEFRENCH)\b/i, lang: 'French' },
    { regex: /\b(?:ES|SPA|Spanish|Español|Castellano)\b/i, lang: 'Spanish' },
    { regex: /\b(?:IT|ITA|Italian)\b/i, lang: 'Italian' },
    { regex: /\b(?:PL|Polish)\b/i, lang: 'Polish' },
    { regex: /\b(?:RU|RUS|Russian)\b/i, lang: 'Russian' },
    { regex: /\b(?:JP|JPN|JAP|Japanese)\b/i, lang: 'Japanese' },
    { regex: /\b(?:KO|KOR|Korean)\b/i, lang: 'Korean' },
    { regex: /\b(?:PT|POR|Portuguese|PT-BR)\b/i, lang: 'Portuguese' },
    { regex: /\b(?:NL|DUT|Dutch)\b/i, lang: 'Dutch' },
    { regex: /\b(?:SV|SWE|Swedish)\b/i, lang: 'Swedish' },
    { regex: /\b(?:NO|NOR|Norwegian)\b/i, lang: 'Norwegian' },
    { regex: /\b(?:DA|DAN|Danish)\b/i, lang: 'Danish' },
    { regex: /\b(?:FI|FIN|Finnish)\b/i, lang: 'Finnish' },
    { regex: /\b(?:HU|HUN|Hungarian)\b/i, lang: 'Hungarian' },
    { regex: /\b(?:TR|TUR|Turkish)\b/i, lang: 'Turkish' },
    { regex: /\b(?:AR|ARA|Arabic)\b/i, lang: 'Arabic' },
    { regex: /\b(?:HE|HEB|Hebrew)\b/i, lang: 'Hebrew' },
    { regex: /\b(?:TH|THA|Thai)\b/i, lang: 'Thai' },
    { regex: /\b(?:VI|VIE|Vietnamese)\b/i, lang: 'Vietnamese' },
    { regex: /\b(?:ZH|CHI|Chinese)\b/i, lang: 'Chinese' },
    { regex: /\b(?:HI|HIN|Hindi)\b/i, lang: 'Hindi' },
  ];
  
  const detectedLanguages = new Set<string>();
  for (const pattern of languagePatterns) {
    if (pattern.regex.test(filename)) {
      detectedLanguages.add(pattern.lang);
    }
  }
  
  // If no specific language detected, check for multi-language indicators
  if (detectedLanguages.size === 0) {
    if (/\b(?:MULTI|MULTiSUBS?)\b/i.test(filename)) {
      detectedLanguages.add('Multi');
    } else if (/\b(?:DL|DUAL)\b/i.test(filename)) {
      detectedLanguages.add('Dual Audio');
    }
  }
  
  // Create audio track entries
  if (detectedLanguages.size > 0) {
    for (const lang of detectedLanguages) {
      audioTracks.push({ language: lang, codec, channels });
    }
  } else if (codec || channels) {
    // If we have codec/channels but no language, create unknown track
    audioTracks.push({ language: 'Unknown', codec, channels });
  }
  
  return audioTracks;
}

/**
 * Parse channel configuration from filename
 */
function parseChannels(filename: string): string | undefined {
  const channelPatterns = [
    { regex: /\b(?:7\.1\.4|7\.1\.2)\b/i, value: '7.1.4' },
    { regex: /\b(?:7\.1)\b/i, value: '7.1' },
    { regex: /\b(?:5\.1)\b/i, value: '5.1' },
    { regex: /\b(?:2\.0)\b/i, value: '2.0' },
    { regex: /\b(?:Stereo)\b/i, value: '2.0' },
    { regex: /\b(?:Mono)\b/i, value: '1.0' },
  ];
  
  for (const pattern of channelPatterns) {
    if (pattern.regex.test(filename)) {
      return pattern.value;
    }
  }
  
  return undefined;
}

/**
 * Parse subtitle languages from filename
 */
function parseSubtitles(filename: string): string[] {
  const subtitles = new Set<string>();
  
  // Look for subtitle indicators
  const subPatterns = [
    { regex: /\b(?:CZ[-_. ]?SUB|SUB[-_. ]?CZ)\b/i, lang: 'Czech' },
    { regex: /\b(?:EN[-_. ]?SUB|SUB[-_. ]?EN)\b/i, lang: 'English' },
    { regex: /\b(?:DE[-_. ]?SUB|SUB[-_. ]?DE)\b/i, lang: 'German' },
    { regex: /\b(?:PL[-_. ]?SUB|SUB[-_. ]?PL)\b/i, lang: 'Polish' },
    { regex: /\b(?:FR[-_. ]?SUB|SUB[-_. ]?FR)\b/i, lang: 'French' },
    { regex: /\b(?:ES[-_. ]?SUB|SUB[-_. ]?ES)\b/i, lang: 'Spanish' },
    { regex: /\b(?:IT[-_. ]?SUB|SUB[-_. ]?IT)\b/i, lang: 'Italian' },
    { regex: /\b(?:MULTI[-_. ]?SUB|MULTiSUBS?)\b/i, lang: 'Multi' },
  ];
  
  for (const pattern of subPatterns) {
    if (pattern.regex.test(filename)) {
      subtitles.add(pattern.lang);
    }
  }
  
  return Array.from(subtitles);
}
