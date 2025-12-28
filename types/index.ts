export interface ServiceConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
}

export interface AppConfig {
  sonarr?: ServiceConfig;
  radarr?: ServiceConfig;
  prowlarr?: ServiceConfig;
  tmdb?: {
    apiKey: string;
  };
}

// Sonarr Types
export interface SonarrSeries {
  id?: number;
  title: string;
  sortTitle?: string;
  status: string;
  ended: boolean;
  overview?: string;
  network?: string;
  airTime?: string;
  images?: Array<{ coverType: string; url: string }>;
  seasons?: SonarrSeason[];
  year?: number;
  path?: string;
  qualityProfileId?: number;
  languageProfileId?: number;
  seasonFolder?: boolean;
  monitored?: boolean;
  useSceneNumbering?: boolean;
  runtime?: number;
  tvdbId?: number;
  tvRageId?: number;
  tvMazeId?: number;
  firstAired?: string;
  seriesType?: string;
  cleanTitle?: string;
  imdbId?: string;
  titleSlug?: string;
  certification?: string;
  genres?: string[];
  tags?: number[];
  added?: string;
  ratings?: {
    value?: number;
    votes?: number;
  };
  statistics?: {
    previousAiring?: string;
    episodeFileCount?: number;
    episodeCount?: number;
    totalEpisodeCount?: number;
    sizeOnDisk?: number;
    percentOfEpisodes?: number;
  };
}

export interface SonarrSeason {
  seasonNumber: number;
  monitored: boolean;
  statistics?: {
    previousAiring?: string;
    episodeFileCount?: number;
    episodeCount?: number;
    totalEpisodeCount?: number;
    sizeOnDisk?: number;
    percentOfEpisodes?: number;
  };
}

export interface SonarrEpisode {
  id?: number;
  seriesId?: number;
  tvdbId?: number;
  episodeFileId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
  airDate?: string;
  airDateUtc?: string;
  overview?: string;
  episodeFile?: SonarrEpisodeFile;
  hasFile?: boolean;
  monitored?: boolean;
  unverifiedSceneNumbering?: boolean;
  grabDate?: string;
  series?: SonarrSeries;
  images?: Array<{ coverType: string; url: string }>;
  ratings?: {
    value?: number;
    votes?: number;
  };
}

export interface SonarrEpisodeFile {
  id?: number;
  seriesId?: number;
  seasonNumber?: number;
  relativePath?: string;
  path?: string;
  size?: number;
  dateAdded?: string;
  sceneName?: string;
  indexerFlags?: number;
  quality?: {
    quality?: {
      id?: number;
      name?: string;
      source?: string;
      resolution?: number;
      modifier?: string;
    };
    revision?: {
      version?: number;
      real?: number;
      isRepack?: boolean;
    };
  };
  mediaInfo?: {
    audioChannels?: number;
    audioCodec?: string;
    audioLanguages?: string;
    audioStreamCount?: number;
    videoBitDepth?: number;
    videoBitrate?: number;
    videoCodec?: string;
    videoFps?: number;
    videoDynamicRange?: string;
    videoDynamicRangeType?: string;
    resolution?: string;
    runTime?: string;
    scanType?: string;
    subtitles?: string;
  };
  language?: {
    id?: number;
    name?: string;
  };
  releaseGroup?: string;
  edition?: string;
}

export interface SonarrRelease {
  guid?: string;
  quality?: {
    quality?: {
      id?: number;
      name?: string;
      source?: string;
      resolution?: number;
      modifier?: string;
    };
    revision?: {
      version?: number;
      real?: number;
      isRepack?: boolean;
    };
  };
  age?: number;
  ageHours?: number;
  ageMinutes?: number;
  size?: number;
  indexer?: string;
  indexerId?: number;
  releaseGroup?: string;
  subGroup?: string;
  releaseHash?: string;
  title?: string;
  fullSeason?: boolean;
  sceneSource?: boolean;
  seasonNumber?: number;
  language?: {
    id?: number;
    name?: string;
  };
  languageWeight?: number;
  airDate?: string;
  seriesTitle?: string;
  episodeNumbers?: number[];
  absoluteEpisodeNumbers?: number[];
  mappedSeasonNumber?: number;
  mappedEpisodeNumbers?: number[];
  approved?: boolean;
  temporarilyRejected?: boolean;
  rejected?: boolean;
  tvdbId?: number;
  tvRageId?: number;
  rejections?: string[];
  publishDate?: string;
  commentUrl?: string;
  downloadUrl?: string;
  infoUrl?: string;
  downloadAllowed?: boolean;
  releaseWeight?: number;
  preferredWordScore?: number;
}

export interface SonarrQualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: Array<{
    id: number;
    name: string;
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
      modifier: string;
    };
    items: any[];
    allowed: boolean;
  }>;
}

export interface SonarrRootFolder {
  id: number;
  path: string;
  freeSpace?: number;
  totalSpace?: number;
}

export interface SonarrLanguageProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  languages: Array<{
    id: number;
    name: string;
    allowed: boolean;
  }>;
}

export interface SonarrSystemStatus {
  version: string;
  buildTime: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isUserInteractive: boolean;
  startupPath: string;
  appData: string;
  osName: string;
  osVersion: string;
  isMonoRuntime: boolean;
  isMono: boolean;
  isLinux: boolean;
  isOsx: boolean;
  isWindows: boolean;
  branch: string;
  authentication: string;
  sqliteVersion: string;
  migrationVersion: number;
  urlBase: string;
  instanceName: string;
  packageVersion: string;
  packageAuthor: string;
  packageUpdateMechanism: string;
}

// Radarr Types
export interface RadarrMovie {
  id?: number;
  title: string;
  sortTitle?: string;
  status: string;
  overview?: string;
  inCinemas?: string;
  physicalRelease?: string;
  digitalRelease?: string;
  images?: Array<{ coverType: string; url: string }>;
  website?: string;
  year?: number;
  hasFile?: boolean;
  youTubeTrailerId?: string;
  studio?: string;
  path?: string;
  qualityProfileId?: number;
  monitored?: boolean;
  minimumAvailability?: string;
  isAvailable?: boolean;
  folderName?: string;
  runtime?: number;
  cleanTitle?: string;
  imdbId?: string;
  tmdbId?: number;
  titleSlug?: string;
  certification?: string;
  genres?: string[];
  tags?: number[];
  added?: string;
  ratings?: {
    imdb?: { votes: number; value: number; type: string };
    tmdb?: { votes: number; value: number; type: string };
    rottenTomatoes?: { votes: number; value: number; type: string };
  };
  movieFile?: {
    movieId: number;
    relativePath: string;
    path: string;
    size: number;
    dateAdded: string;
    quality: {
      quality: {
        id: number;
        name: string;
        source: string;
        resolution: number;
        modifier: string;
      };
      revision: {
        version: number;
        real: number;
        isRepack: boolean;
      };
    };
    mediaInfo?: any;
  };
  statistics?: {
    previousAiring?: string;
    sizeOnDisk?: number;
    percentOfEpisodes?: number;
  };
}

export interface RadarrQualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: Array<{
    id: number;
    name: string;
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
      modifier: string;
    };
    items: any[];
    allowed: boolean;
  }>;
}

export interface RadarrRootFolder {
  id: number;
  path: string;
  freeSpace?: number;
  totalSpace?: number;
}

export interface RadarrSystemStatus {
  version: string;
  buildTime: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isUserInteractive: boolean;
  startupPath: string;
  appData: string;
  osName: string;
  osVersion: string;
  isMonoRuntime: boolean;
  isMono: boolean;
  isLinux: boolean;
  isOsx: boolean;
  isWindows: boolean;
  branch: string;
  authentication: string;
  sqliteVersion: string;
  migrationVersion: number;
  urlBase: string;
  instanceName: string;
  packageVersion: string;
  packageAuthor: string;
  packageUpdateMechanism: string;
}

// TMDB Types
export interface TMDBMovie {
  id: number;
  title: string;
  overview?: string;
  release_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  media_type?: 'movie';
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  media_type?: 'tv';
}

export interface TMDBSearchResult {
  page: number;
  results: Array<TMDBMovie | TMDBTVShow>;
  total_results: number;
  total_pages: number;
}

export interface CombinedSearchResult {
  id: number;
  title: string;
  overview?: string;
  releaseDate?: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
  voteCount?: number;
  popularity?: number;
  mediaType: 'movie' | 'tv';
  inDatabase: boolean;
  databaseId?: number;
  databaseData?: RadarrMovie | SonarrSeries;
}

