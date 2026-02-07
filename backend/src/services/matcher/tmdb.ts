import { TMDB } from 'tmdb-ts';
import { queries } from '../../db/database';

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  media_type?: string;
}

export interface MatchCandidate {
  tmdbId: number;
  title: string;
  year: number;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number;
  confidence: number;
}

/**
 * TMDB Metadata Matcher
 */
export class TMDBMatcher {
  private tmdb: TMDB;

  constructor(apiKey: string) {
    this.tmdb = new TMDB(apiKey);
  }

  /**
   * Search for a movie by title and year
   */
  async searchMovie(title: string, year?: number): Promise<MatchCandidate[]> {
    try {
      const results = await this.tmdb.search.movies({
        query: title,
        year: year,
      });

      if (!results.results || results.results.length === 0) {
        return [];
      }

      return results.results.map(movie => {
        const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
        
        // Calculate confidence score
        let confidence = 0.5;
        if (year && releaseYear === year) confidence += 0.3;
        if (movie.title?.toLowerCase() === title.toLowerCase()) confidence += 0.2;
        
        return {
          tmdbId: movie.id,
          title: movie.title || '',
          year: releaseYear,
          overview: movie.overview || '',
          posterPath: movie.poster_path || null,
          backdropPath: movie.backdrop_path || null,
          rating: movie.vote_average || 0,
          confidence: Math.min(confidence, 1.0),
        };
      }).sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('❌ Error searching TMDB for movie:', error);
      return [];
    }
  }

  /**
   * Search for a TV show by title and year
   */
  async searchTVShow(title: string, year?: number): Promise<MatchCandidate[]> {
    try {
      const results = await this.tmdb.search.tvShows({
        query: title,
        first_air_date_year: year,
      });

      if (!results.results || results.results.length === 0) {
        return [];
      }

      return results.results.map(show => {
        const firstAirYear = show.first_air_date ? parseInt(show.first_air_date.split('-')[0]) : 0;
        
        // Calculate confidence score
        let confidence = 0.5;
        if (year && firstAirYear === year) confidence += 0.3;
        if (show.name?.toLowerCase() === title.toLowerCase()) confidence += 0.2;
        
        return {
          tmdbId: show.id,
          title: show.name || '',
          year: firstAirYear,
          overview: show.overview || '',
          posterPath: show.poster_path || null,
          backdropPath: show.backdrop_path || null,
          rating: show.vote_average || 0,
          confidence: Math.min(confidence, 1.0),
        };
      }).sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('❌ Error searching TMDB for TV show:', error);
      return [];
    }
  }

  /**
   * Get full movie details and save to database
   */
  async matchMovie(tmdbId: number): Promise<number | null> {
    try {
      const movie = await this.tmdb.movies.details(tmdbId);
      
      // Check if already exists
      const existing = queries.getMediaByTmdbId.get(tmdbId);
      if (existing) {
        return (existing as any).id;
      }

      // Insert movie
      const result = queries.insertMedia.run(
        'movie',
        tmdbId,
        movie.imdb_id || null,
        movie.title,
        movie.original_title,
        movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
        movie.overview,
        movie.poster_path,
        movie.backdrop_path,
        movie.vote_average,
        movie.runtime,
        movie.status
      );

      console.log(`✅ Matched movie: ${movie.title} (${tmdbId})`);
      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('❌ Error matching movie:', error);
      return null;
    }
  }

  /**
   * Get full TV show details and save to database
   */
  async matchTVShow(tmdbId: number): Promise<number | null> {
    try {
      const show = await this.tmdb.tvShows.details(tmdbId);
      
      // Check if already exists
      const existing = queries.getMediaByTmdbId.get(tmdbId);
      if (existing) {
        return (existing as any).id;
      }

      // Insert TV show
      const result = queries.insertMedia.run(
        'tv',
        tmdbId,
        null, // TV shows don't have IMDB ID in the main object
        show.name,
        show.original_name,
        show.first_air_date ? parseInt(show.first_air_date.split('-')[0]) : null,
        show.overview,
        show.poster_path,
        show.backdrop_path,
        show.vote_average,
        show.episode_run_time?.[0] || null,
        show.status
      );

      const mediaId = result.lastInsertRowid as number;

      // Insert seasons
      if (show.seasons) {
        for (const season of show.seasons) {
          queries.insertSeason.run(
            mediaId,
            season.season_number,
            season.episode_count,
            season.poster_path || null
          );
        }
      }

      console.log(`✅ Matched TV show: ${show.name} (${tmdbId})`);
      return mediaId;
    } catch (error) {
      console.error('❌ Error matching TV show:', error);
      return null;
    }
  }

  /**
   * Auto-match a file to TMDB
   */
  async autoMatch(file: any): Promise<number | null> {
    const { title, year, season, episode } = file;
    const isMovie = season === null || season === undefined;

    if (isMovie) {
      const candidates = await this.searchMovie(title, year);
      if (candidates.length > 0 && candidates[0].confidence > 0.7) {
        return await this.matchMovie(candidates[0].tmdbId);
      }
    } else {
      const candidates = await this.searchTVShow(title, year);
      if (candidates.length > 0 && candidates[0].confidence > 0.7) {
        return await this.matchTVShow(candidates[0].tmdbId);
      }
    }

    return null;
  }
}

/**
 * Global TMDB matcher instance
 */
let tmdbMatcher: TMDBMatcher | null = null;

/**
 * Initialize TMDB matcher from settings
 */
export function initTMDB(): TMDBMatcher | null {
  try {
    const setting = queries.getSetting.get('tmdb_api_key') as { key: string; value: string } | undefined;
    const apiKey = setting?.value || process.env.TMDB_API_KEY;
    
    if (!apiKey) {
      console.error('❌ TMDB API key not configured');
      return null;
    }

    tmdbMatcher = new TMDBMatcher(apiKey);
    console.log('✅ TMDB matcher initialized');
    return tmdbMatcher;
  } catch (error) {
    console.error('❌ Failed to initialize TMDB:', error);
    return null;
  }
}

/**
 * Get the global TMDB matcher
 */
export function getTMDB(): TMDBMatcher | null {
  return tmdbMatcher;
}
