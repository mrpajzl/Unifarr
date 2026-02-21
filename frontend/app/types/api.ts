export interface MediaItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  year?: number;
  tmdbId?: number;
  imdbId?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
  voteCount?: number;
  genres?: string; // JSON string
  runtime?: number;
  status?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  monitored?: number;
  libraryPath?: string;
  createdAt?: string;
  updatedAt?: string;
  // TV show completeness (added by backend)
  availableEpisodes?: number;
  totalEpisodes?: number;
  completeness?: number; // 0-1 (percentage as decimal)
}

export interface File {
  id: number;
  path: string;
  filename: string;
  size?: number;
  parsedTitle?: string;
  parsedYear?: number;
  parsedSeason?: number;
  parsedEpisode?: number;
  parsedQuality?: string;
  parsedEdition?: string;
  parsedCodec?: string;
  parsedSource?: string;
  mediaItemId?: number;
  matched?: number;
  matchConfidence?: number;
  createdAt?: string;
  scannedAt?: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  year?: number;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  runtime?: number;
  status?: string;
  imdb_id?: string;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  first_air_date?: string;
  year?: number;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
}

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  media_type?: 'movie' | 'tv';
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
}

export interface TorrentResult {
  title: string;
  magnetUrl?: string;
  torrentUrl?: string;
  size?: number; // bytes
  seeders: number;
  leechers: number;
  quality?: string;
  source?: string;
  provider: string;
}

export interface Download {
  id: number;
  mediaId?: number;
  torrentHash: string;
  name: string;
  status: string;
  progress?: number;
  downloadSpeed?: number;
  uploadSpeed?: number;
  eta?: number;
  size?: number;
  downloaded?: number;
  uploaded?: number;
  ratio?: number;
  savePath?: string;
  addedAt?: string;
  completedAt?: string;
}

export interface QBittorrentTorrent {
  hash: string;
  name: string;
  state: string;
  progress: number;
  dlspeed: number;
  upspeed: number;
  eta: number;
  size: number;
  downloaded: number;
  uploaded: number;
  ratio: number;
  save_path: string;
  added_on: number;
  completion_on?: number;
}
