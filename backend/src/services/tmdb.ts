export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  year?: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  runtime: number | null;
  status: string;
  imdb_id?: string | null;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  first_air_date: string;
  year?: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
}

export class TMDBService {
  private apiKey: string;
  private baseUrl = 'https://api.themoviedb.org/3';
  private language: string;
  
  constructor(apiKey: string, language: string = 'cs-CZ') {
    if (!apiKey) {
      throw new Error('TMDB_API_KEY is required');
    }
    this.apiKey = apiKey;
    this.language = language;
  }
  
  async fetch<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('api_key', this.apiKey);
    url.searchParams.append('language', this.language);
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
    
    console.log('TMDB API request:', endpoint, params);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json() as any;
      console.error('TMDB API error:', error);
      throw new Error(error.status_message || 'TMDB API request failed');
    }
    
    const data = await response.json() as T;
    console.log('TMDB API response:', endpoint, (data as any).results?.length || 0, 'results');
    return data;
  }
  
  async searchMovies(query: string, year?: number): Promise<TMDBMovie[]> {
    try {
      const response = await this.fetch<{ results: any[] }>('/search/movie', {
        query,
        year,
      });
      
      return response.results.map(movie => ({
        ...movie,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        genres: [],
        runtime: null,
        status: '',
      }));
    } catch (error) {
      console.error('TMDB search movies error:', error);
      throw error;
    }
  }
  
  async searchTVShows(query: string, year?: number): Promise<TMDBTVShow[]> {
    try {
      const response = await this.fetch<{ results: any[] }>('/search/tv', {
        query,
        first_air_date_year: year,
      });
      
      return response.results.map(show => ({
        ...show,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
        genres: [],
        number_of_seasons: 0,
        number_of_episodes: 0,
        status: '',
      }));
    } catch (error) {
      console.error('TMDB search TV shows error:', error);
      throw error;
    }
  }
  
  async getMovieDetails(id: number): Promise<TMDBMovie | null> {
    try {
      const movie = await this.fetch<any>(`/movie/${id}`);
      return {
        ...movie,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        poster_path: movie.poster_path ?? null,
        backdrop_path: movie.backdrop_path ?? null,
      };
    } catch (error) {
      console.error('TMDB get movie details error:', error);
      return null;
    }
  }

  /**
   * Get movie details in both English and user's language
   * Returns: { en: TMDBMovie, localized: TMDBMovie }
   */
  async getMovieDetailsMultilang(id: number): Promise<{ en: TMDBMovie; localized: TMDBMovie } | null> {
    try {
      // Fetch English version
      const enUrl = `${this.baseUrl}/movie/${id}?api_key=${this.apiKey}&language=en-US`;
      const enResponse = await fetch(enUrl);
      if (!enResponse.ok) throw new Error('Failed to fetch English version');
      const enMovie = await enResponse.json();

      // Fetch localized version (if different from English)
      let localizedMovie = enMovie;
      if (this.language !== 'en-US') {
        const localizedUrl = `${this.baseUrl}/movie/${id}?api_key=${this.apiKey}&language=${this.language}`;
        const localizedResponse = await fetch(localizedUrl);
        if (localizedResponse.ok) {
          localizedMovie = await localizedResponse.json();
        }
      }

      const processMovie = (movie: any): TMDBMovie => ({
        ...movie,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        poster_path: movie.poster_path ?? null,
        backdrop_path: movie.backdrop_path ?? null,
      });

      return {
        en: processMovie(enMovie),
        localized: processMovie(localizedMovie),
      };
    } catch (error) {
      console.error('TMDB get movie details (multilang) error:', error);
      return null;
    }
  }
  
  async getTVShowDetails(id: number): Promise<TMDBTVShow | null> {
    try {
      const show = await this.fetch<any>(`/tv/${id}`);
      return {
        ...show,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
      };
    } catch (error) {
      console.error('TMDB get TV show details error:', error);
      return null;
    }
  }

  /**
   * Get TV show details in both English and user's language
   * Returns: { en: TMDBTVShow, localized: TMDBTVShow }
   */
  async getTVShowDetailsMultilang(id: number): Promise<{ en: TMDBTVShow; localized: TMDBTVShow } | null> {
    try {
      // Fetch English version
      const enUrl = `${this.baseUrl}/tv/${id}?api_key=${this.apiKey}&language=en-US`;
      const enResponse = await fetch(enUrl);
      if (!enResponse.ok) throw new Error('Failed to fetch English version');
      const enShow = await enResponse.json();

      // Fetch localized version (if different from English)
      let localizedShow = enShow;
      if (this.language !== 'en-US') {
        const localizedUrl = `${this.baseUrl}/tv/${id}?api_key=${this.apiKey}&language=${this.language}`;
        const localizedResponse = await fetch(localizedUrl);
        if (localizedResponse.ok) {
          localizedShow = await localizedResponse.json();
        }
      }

      const processShow = (show: any): TMDBTVShow => ({
        ...show,
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
      });

      return {
        en: processShow(enShow),
        localized: processShow(localizedShow),
      };
    } catch (error) {
      console.error('TMDB get TV show details (multilang) error:', error);
      return null;
    }
  }
  
  async getTVSeason(showId: number, seasonNumber: number): Promise<any> {
    try {
      const season = await this.fetch<any>(`/tv/${showId}/season/${seasonNumber}`);
      return season;
    } catch (error) {
      console.error(`TMDB get TV season ${seasonNumber} error:`, error);
      throw error;
    }
  }
  
  async searchMulti(query: string): Promise<Array<TMDBMovie | TMDBTVShow>> {
    try {
      const response = await this.fetch<{ results: any[] }>('/search/multi', { query });
      
      return response.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .map(item => {
          if (item.media_type === 'movie') {
            return {
              ...item,
              year: item.release_date ? new Date(item.release_date).getFullYear() : undefined,
              genres: [],
              runtime: null,
              status: '',
            } as TMDBMovie;
          } else {
            return {
              ...item,
              year: item.first_air_date ? new Date(item.first_air_date).getFullYear() : undefined,
              genres: [],
              number_of_seasons: 0,
              number_of_episodes: 0,
              status: '',
            } as TMDBTVShow;
          }
        });
    } catch (error) {
      console.error('TMDB multi search error:', error);
      throw error;
    }
  }
}
