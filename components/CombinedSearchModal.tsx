'use client';

import { useState, useEffect, useCallback } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig, CombinedSearchResult, RadarrMovie, SonarrSeries, RadarrQualityProfile, RadarrRootFolder, SonarrQualityProfile, SonarrRootFolder, SonarrLanguageProfile } from '@/types';

interface CombinedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMediaAdded: () => void;
}

export default function CombinedSearchModal({ isOpen, onClose, onMediaAdded }: CombinedSearchModalProps) {
  const [config, setConfig] = useState<AppConfig>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CombinedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<CombinedSearchResult | null>(null);
  const [radarrMovies, setRadarrMovies] = useState<RadarrMovie[]>([]);
  const [sonarrSeries, setSonarrSeries] = useState<SonarrSeries[]>([]);
  const [radarrQualityProfiles, setRadarrQualityProfiles] = useState<RadarrQualityProfile[]>([]);
  const [radarrRootFolders, setRadarrRootFolders] = useState<RadarrRootFolder[]>([]);
  const [sonarrQualityProfiles, setSonarrQualityProfiles] = useState<SonarrQualityProfile[]>([]);
  const [sonarrRootFolders, setSonarrRootFolders] = useState<SonarrRootFolder[]>([]);
  const [sonarrLanguageProfiles, setSonarrLanguageProfiles] = useState<SonarrLanguageProfile[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = getConfig();
      setConfig(saved);
      loadDatabaseMedia(saved);
      loadConfig(saved);
    } else {
      // Reset search when modal closes
      setSearchTerm('');
      setSearchResults([]);
      setSelectedMedia(null);
      setError(null);
    }
  }, [isOpen]);

  const loadDatabaseMedia = async (cfg: AppConfig) => {
    // Load Radarr movies
    if (cfg.radarr?.enabled && cfg.radarr?.url && cfg.radarr?.apiKey) {
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/movie',
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setRadarrMovies(data);
        }
      } catch (err) {
        console.error('Failed to load Radarr movies:', err);
      }
    }

    // Load Sonarr series
    if (cfg.sonarr?.enabled && cfg.sonarr?.url && cfg.sonarr?.apiKey) {
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.sonarr.url,
            apiKey: cfg.sonarr.apiKey,
            endpoint: '/series',
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setSonarrSeries(data);
        }
      } catch (err) {
        console.error('Failed to load Sonarr series:', err);
      }
    }
  };

  const loadConfig = async (cfg: AppConfig) => {
    // Load Radarr config
    if (cfg.radarr?.url && cfg.radarr?.apiKey) {
      try {
        const qualityResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/qualityProfile',
          }),
        });
        if (qualityResponse.ok) {
          const qualityData = await qualityResponse.json();
          setRadarrQualityProfiles(qualityData);
        }

        const rootResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/rootFolder',
          }),
        });
        if (rootResponse.ok) {
          const rootData = await rootResponse.json();
          setRadarrRootFolders(rootData);
        }
      } catch (err) {
        console.error('Failed to load Radarr config:', err);
      }
    }

    // Load Sonarr config
    if (cfg.sonarr?.url && cfg.sonarr?.apiKey) {
      try {
        const qualityResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.sonarr.url,
            apiKey: cfg.sonarr.apiKey,
            endpoint: '/qualityProfile',
          }),
        });
        if (qualityResponse.ok) {
          const qualityData = await qualityResponse.json();
          setSonarrQualityProfiles(qualityData);
        }

        const rootResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.sonarr.url,
            apiKey: cfg.sonarr.apiKey,
            endpoint: '/rootFolder',
          }),
        });
        if (rootResponse.ok) {
          const rootData = await rootResponse.json();
          setSonarrRootFolders(rootData);
        }

        const languageResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.sonarr.url,
            apiKey: cfg.sonarr.apiKey,
            endpoint: '/languageProfile',
          }),
        });
        if (languageResponse.ok) {
          const languageData = await languageResponse.json();
          setSonarrLanguageProfiles(languageData);
        }
      } catch (err) {
        console.error('Failed to load Sonarr config:', err);
      }
    }
  };

  const handleSearch = useCallback(async () => {
    const trimmedTerm = searchTerm.trim();
    
    if (trimmedTerm.length < 3) {
      setSearchResults([]);
      setError(null);
      return;
    }

    if (!config.tmdb?.apiKey) {
      setError('Please configure TMDB API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      // Search TMDB
      const tmdbResponse = await fetch(`/api/tmdb?query=${encodeURIComponent(trimmedTerm)}&apiKey=${encodeURIComponent(config.tmdb.apiKey)}`);
      
      if (!tmdbResponse.ok) {
        const errorData = await tmdbResponse.json();
        throw new Error(errorData.error || 'Failed to search TMDB');
      }

      const tmdbData = await tmdbResponse.json();
      const tmdbResults = tmdbData.results || [];

      // Match with database entries
      const matchedResults: CombinedSearchResult[] = tmdbResults.map((item: any) => {
        const isMovie = item.media_type === 'movie';
        const tmdbId = item.id;
        const title = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date;
        const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;

        if (isMovie) {
          // Match movies by TMDB ID (Radarr uses tmdbId)
          const dbMovie = radarrMovies.find(m => m.tmdbId === tmdbId);
          if (dbMovie) {
            return {
              id: tmdbId,
              title: title,
              overview: item.overview,
              releaseDate: releaseDate,
              posterPath: item.poster_path,
              backdropPath: item.backdrop_path,
              voteAverage: item.vote_average,
              voteCount: item.vote_count,
              popularity: item.popularity,
              mediaType: 'movie' as const,
              inDatabase: true,
              databaseId: dbMovie.id,
              databaseData: dbMovie,
            };
          }
        } else {
          // For TV shows, match by title and year (Sonarr uses TVDB ID, not TMDB ID)
          // We'll do a fuzzy match by title and year
          const dbSeries = sonarrSeries.find(s => {
            const seriesYear = s.year;
            const titleMatch = s.title.toLowerCase() === title.toLowerCase() ||
                              s.cleanTitle?.toLowerCase() === title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const yearMatch = !releaseYear || !seriesYear || seriesYear === releaseYear;
            return titleMatch && yearMatch;
          });
          
          if (dbSeries) {
            return {
              id: tmdbId,
              title: title,
              overview: item.overview,
              releaseDate: releaseDate,
              posterPath: item.poster_path,
              backdropPath: item.backdrop_path,
              voteAverage: item.vote_average,
              voteCount: item.vote_count,
              popularity: item.popularity,
              mediaType: 'tv' as const,
              inDatabase: true,
              databaseId: dbSeries.id,
              databaseData: dbSeries,
            };
          }
        }

        return {
          id: tmdbId,
          title: title,
          overview: item.overview,
          releaseDate: releaseDate,
          posterPath: item.poster_path,
          backdropPath: item.backdrop_path,
          voteAverage: item.vote_average,
          voteCount: item.vote_count,
          popularity: item.popularity,
          mediaType: isMovie ? 'movie' as const : 'tv' as const,
          inDatabase: false,
        };
      });

      // Sort: database entries first, then by popularity
      matchedResults.sort((a, b) => {
        if (a.inDatabase && !b.inDatabase) return -1;
        if (!a.inDatabase && b.inDatabase) return 1;
        return (b.popularity || 0) - (a.popularity || 0);
      });

      setSearchResults(matchedResults);
    } catch (err: any) {
      setError(err.message || 'Failed to search');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, config.tmdb?.apiKey, radarrMovies, sonarrSeries]);

  // Debounced search effect
  useEffect(() => {
    // Clear results if search term is too short
    if (searchTerm.trim().length < 3) {
      setSearchResults([]);
      setError(null);
      return;
    }

    // Only search if TMDB API key is configured
    if (!config.tmdb?.apiKey) {
      return;
    }

    // Set up debounce timer
    const debounceTimer = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms debounce delay

    // Cleanup function to clear timer if search term changes
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchTerm, config.tmdb?.apiKey, handleSearch]);

  const handleAddMedia = async (media: CombinedSearchResult) => {
    if (media.mediaType === 'movie') {
      if (!config.radarr?.url || !config.radarr?.apiKey) {
        setError('Radarr is not configured');
        return;
      }

      if (radarrRootFolders.length === 0) {
        setError('No root folders configured. Please configure a root folder in Radarr settings.');
        return;
      }

      if (radarrQualityProfiles.length === 0) {
        setError('No quality profiles configured. Please configure a quality profile in Radarr settings.');
        return;
      }

      setAdding(true);
      setError(null);

      try {
        // Validate media.id is present
        if (!media.id) {
          throw new Error('Movie ID is missing');
        }

        // Lookup movie in Radarr to get full details
        // The correct endpoint is /movie/lookup/tmdb?tmdbId={id}
        const lookupResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: config.radarr.url,
            apiKey: config.radarr.apiKey,
            endpoint: `/movie/lookup/tmdb?tmdbId=${media.id}`,
          }),
        });

        if (!lookupResponse.ok) {
          const errorData = await lookupResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to lookup movie in Radarr');
        }

        const movieData = await lookupResponse.json();
        
        // The /movie/lookup/tmdb endpoint returns a single MovieResource, not an array
        if (!movieData || !movieData.tmdbId) {
          throw new Error('Invalid movie data returned from Radarr');
        }

        const movieToAdd = movieData;

        const moviePayload = {
          ...movieToAdd,
          qualityProfileId: radarrQualityProfiles[0].id,
          rootFolderPath: radarrRootFolders[0].path,
          monitored: true,
          addOptions: {
            searchForMovie: false,
          },
        };

        const addResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: config.radarr.url,
            apiKey: config.radarr.apiKey,
            endpoint: '/movie',
            method: 'POST',
            data: moviePayload,
          }),
        });

        if (addResponse.ok) {
          onMediaAdded();
          onClose();
          setSearchTerm('');
          setSearchResults([]);
          setSelectedMedia(null);
        } else {
          const errorData = await addResponse.json().catch(() => ({}));
          setError(errorData.error || 'Failed to add movie');
        }
      } catch (err: any) {
        setError(err.message || 'Connection error. Please check if Radarr is running and accessible.');
      } finally {
        setAdding(false);
      }
    } else {
      // TV Show
      if (!config.sonarr?.url || !config.sonarr?.apiKey) {
        setError('Sonarr is not configured');
        return;
      }

      if (sonarrRootFolders.length === 0) {
        setError('No root folders configured. Please configure a root folder in Sonarr settings.');
        return;
      }

      if (sonarrQualityProfiles.length === 0) {
        setError('No quality profiles configured. Please configure a quality profile in Sonarr settings.');
        return;
      }

      if (sonarrLanguageProfiles.length === 0) {
        setError('No language profiles configured. Please configure a language profile in Sonarr settings.');
        return;
      }

      setAdding(true);
      setError(null);

      try {
        // Validate media.id is present
        if (!media.id) {
          throw new Error('Series ID is missing');
        }

        if (!config.tmdb?.apiKey) {
          throw new Error('TMDB API key is required to convert TMDB ID to TVDB ID');
        }

        // Sonarr uses TVDB, not TMDB. First, get TVDB ID from TMDB API
        const externalIdsResponse = await fetch(
          `/api/tmdb?tmdbId=${media.id}&type=tv&apiKey=${encodeURIComponent(config.tmdb.apiKey)}`
        );

        if (!externalIdsResponse.ok) {
          const errorData = await externalIdsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to get TVDB ID from TMDB');
        }

        const externalIds = await externalIdsResponse.json();
        const tvdbId = externalIds.tvdb_id;

        if (!tvdbId) {
          throw new Error(`TVDB ID not found for TMDB ID ${media.id}. The series may not be available on TVDB.`);
        }

        // Lookup series in Sonarr using TVDB ID
        // Sonarr lookup endpoint returns an array of results
        const lookupResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: config.sonarr.url,
            apiKey: config.sonarr.apiKey,
            endpoint: `/series/lookup?term=tvdb:${tvdbId}`,
          }),
        });

        if (!lookupResponse.ok) {
          const errorData = await lookupResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to lookup series in Sonarr');
        }

        const seriesData = await lookupResponse.json();
        
        // Sonarr lookup returns an array - check if it's empty or invalid
        if (!seriesData || (Array.isArray(seriesData) && seriesData.length === 0)) {
          throw new Error(`Series with TVDB ID ${tvdbId} not found in Sonarr. The series may not be available in Sonarr's metadata sources.`);
        }

        const seriesToAdd = Array.isArray(seriesData) ? seriesData[0] : seriesData;

        // Validate the series data has required fields
        if (!seriesToAdd || !seriesToAdd.title) {
          throw new Error('Invalid series data returned from Sonarr');
        }

        const seriesPayload = {
          ...seriesToAdd,
          qualityProfileId: sonarrQualityProfiles[0].id,
          languageProfileId: sonarrLanguageProfiles[0].id,
          rootFolderPath: sonarrRootFolders[0].path,
          monitored: true,
          seasonFolder: true,
          addOptions: {
            searchForMissingEpisodes: false,
          },
        };

        const addResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: config.sonarr.url,
            apiKey: config.sonarr.apiKey,
            endpoint: '/series',
            method: 'POST',
            data: seriesPayload,
          }),
        });

        if (addResponse.ok) {
          onMediaAdded();
          onClose();
          setSearchTerm('');
          setSearchResults([]);
          setSelectedMedia(null);
        } else {
          const errorData = await addResponse.json().catch(() => ({}));
          setError(errorData.error || 'Failed to add series');
        }
      } catch (err: any) {
        setError(err.message || 'Connection error. Please check if Sonarr is running and accessible.');
      } finally {
        setAdding(false);
      }
    }
  };

  const getPosterUrl = (posterPath: string | undefined) => {
    if (!posterPath) return null;
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Search Movies & TV Shows</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type at least 3 characters to search..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                {loading && (
                  <div className="flex items-center px-4 text-gray-500 dark:text-gray-400">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
              {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Type at least 3 characters to start searching...
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {searchResults.map((item) => {
                    const posterUrl = getPosterUrl(item.posterPath);
                    return (
                      <div
                        key={`${item.mediaType}-${item.id}`}
                        className={`flex gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                          item.inDatabase
                            ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                        onClick={() => setSelectedMedia(item)}
                      >
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={item.title}
                            className="w-20 h-28 object-cover rounded"
                          />
                        ) : (
                          <div className="w-20 h-28 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                            {item.inDatabase && (
                              <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded">
                                In Database
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              item.mediaType === 'movie'
                                ? 'bg-orange-500 text-white'
                                : 'bg-blue-500 text-white'
                            }`}>
                              {item.mediaType === 'movie' ? 'Movie' : 'TV Show'}
                            </span>
                          </div>
                          {item.releaseDate && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(item.releaseDate).getFullYear()}
                            </p>
                          )}
                          {item.overview && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 line-clamp-3">
                              {item.overview}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Media Details */}
            {selectedMedia && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedMedia.title}
                        {selectedMedia.releaseDate && ` (${new Date(selectedMedia.releaseDate).getFullYear()})`}
                      </h4>
                      {selectedMedia.inDatabase && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                          In Database
                        </span>
                      )}
                    </div>
                    {selectedMedia.overview && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {selectedMedia.overview}
                      </p>
                    )}
                    {selectedMedia.voteAverage && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Rating: {selectedMedia.voteAverage.toFixed(1)}/10 ({selectedMedia.voteCount} votes)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedMedia(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {!selectedMedia.inDatabase && (
                  <button
                    onClick={() => handleAddMedia(selectedMedia)}
                    disabled={adding}
                    className={`w-full px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 ${
                      selectedMedia.mediaType === 'movie'
                        ? 'bg-radarr hover:bg-orange-400'
                        : 'bg-sonarr hover:bg-blue-400'
                    }`}
                  >
                    {adding ? 'Adding...' : `Add ${selectedMedia.mediaType === 'movie' ? 'Movie' : 'TV Show'}`}
                  </button>
                )}
                {selectedMedia.inDatabase && selectedMedia.databaseId && (
                  <div className="mt-2">
                    <a
                      href={`/${selectedMedia.mediaType === 'movie' ? 'radarr' : 'sonarr'}/${selectedMedia.databaseId}`}
                      className={`block w-full text-center px-4 py-2 text-white rounded-lg hover:opacity-90 ${
                        selectedMedia.mediaType === 'movie'
                          ? 'bg-radarr hover:bg-orange-400'
                          : 'bg-sonarr hover:bg-blue-400'
                      }`}
                    >
                      View in {selectedMedia.mediaType === 'movie' ? 'Radarr' : 'Sonarr'}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

