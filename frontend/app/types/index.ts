export type MediaType = 'movie' | 'tv'

export interface MediaItem {
  id: number
  type: MediaType
  title: string
  year?: number
  tmdbId?: number
  imdbId?: string
  overview?: string
  posterPath?: string
  backdropPath?: string
  voteAverage?: number
  voteCount?: number
  genres?: string // JSON array
  runtime?: number
  status?: string
  numberOfSeasons?: number
  numberOfEpisodes?: number
  monitored?: number
  libraryPath?: string
  createdAt?: string
  updatedAt?: string
}

export interface MediaFile {
  id: number
  path: string
  filename: string
  size?: number
  parsedTitle?: string
  parsedYear?: number
  parsedSeason?: number
  parsedEpisode?: number
  parsedQuality?: string
  parsedEdition?: string
  parsedCodec?: string
  parsedSource?: string
  mediaItemId?: number
  matched?: number
  matchConfidence?: number
  createdAt?: string
  scannedAt?: string
}

export interface Download {
  id: number
  mediaItemId?: number
  torrentHash: string
  name?: string
  status?: string
  progress?: number
  downloadSpeed?: number
  eta?: number
  error?: string
  createdAt?: string
  completedAt?: string
}

export interface TMDBSearchResult {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  overview?: string
  poster_path?: string
  backdrop_path?: string
  vote_average?: number
  media_type?: string
  // Added by backend to indicate if already in library
  inLibrary?: boolean
  localId?: number
}

export interface TMDBMovieDetails {
  id: number
  title: string
  year: number
  overview: string
  poster_path?: string
  backdrop_path?: string
  vote_average: number
  vote_count: number
  genres: Array<{ id: number; name: string }>
  runtime?: number
  status: string
  imdb_id?: string
  release_date: string
}

export interface TMDBTVDetails {
  id: number
  name: string
  year: number
  overview: string
  poster_path?: string
  backdrop_path?: string
  vote_average: number
  vote_count: number
  genres: Array<{ id: number; name: string }>
  status: string
  number_of_seasons: number
  number_of_episodes: number
  first_air_date: string
}

export interface TorrentResult {
  title: string
  size: string
  seeders: number
  leechers: number
  magnetUrl: string
  provider: string
  quality?: string
  uploadDate?: string
}

export type ViewMode = 'grid' | 'list'
export type SortBy = 'title' | 'dateAdded' | 'rating' | 'fileSize' | 'year'
export type SortOrder = 'asc' | 'desc'

export interface FilterOptions {
  genre?: string
  year?: number
  quality?: string
  matchStatus?: 'all' | 'matched' | 'unmatched'
}
