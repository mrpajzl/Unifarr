'use client';

import { useState, useEffect } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig, RadarrMovie, RadarrQualityProfile, RadarrRootFolder } from '@/types';

interface MovieSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieAdded: () => void;
}

export default function MovieSearchModal({ isOpen, onClose, onMovieAdded }: MovieSearchModalProps) {
  const [config, setConfig] = useState<AppConfig>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<RadarrMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<RadarrMovie | null>(null);
  const [qualityProfiles, setQualityProfiles] = useState<RadarrQualityProfile[]>([]);
  const [rootFolders, setRootFolders] = useState<RadarrRootFolder[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const loadConfigAsync = async () => {
        const saved = await getConfig();
        setConfig(saved);
        loadConfig(saved);
      };
      loadConfigAsync();
    }
  }, [isOpen]);

  const loadConfig = async (cfg: AppConfig) => {
    if (!cfg.radarr?.url || !cfg.radarr?.apiKey) return;

    try {
      // Load quality profiles
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
        setQualityProfiles(qualityData);
      }

      // Load root folders
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
        setRootFolders(rootData);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || !config.radarr?.url || !config.radarr?.apiKey) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.radarr.url,
          apiKey: config.radarr.apiKey,
          endpoint: `/movie/lookup?term=${encodeURIComponent(searchTerm)}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        setError('Failed to search movies');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovie = async (movie: RadarrMovie) => {
    if (!config.radarr?.url || !config.radarr?.apiKey) return;

    if (rootFolders.length === 0) {
      setError('No root folders configured. Please configure a root folder in Radarr settings.');
      return;
    }

    if (qualityProfiles.length === 0) {
      setError('No quality profiles configured. Please configure a quality profile in Radarr settings.');
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const movieToAdd = {
        ...movie,
        qualityProfileId: qualityProfiles[0].id,
        rootFolderPath: rootFolders[0].path,
        monitored: true,
        addOptions: {
          searchForMovie: false, // We'll trigger search manually
        },
      };

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.radarr.url,
          apiKey: config.radarr.apiKey,
          endpoint: '/movie',
          method: 'POST',
          data: movieToAdd,
        }),
      });

      if (response.ok) {
        onMovieAdded();
        onClose();
        setSearchTerm('');
        setSearchResults([]);
        setSelectedMovie(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add movie');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setAdding(false);
    }
  };

  const getPosterUrl = (movie: RadarrMovie) => {
    const posterImage = movie.images?.find(img => img.coverType === 'poster');
    const remoteUrl = (posterImage as any)?.remoteUrl;
    
    if (remoteUrl && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
      return remoteUrl;
    }
    
    const originalUrl = posterImage?.url;
    if (!originalUrl) return null;
    
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      return originalUrl;
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add New Movie</h3>
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for a movie..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-radarr"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !searchTerm.trim()}
                  className="px-6 py-2 bg-radarr text-white rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
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
                  {searchResults.map((movie) => {
                    const posterUrl = getPosterUrl(movie);
                    return (
                      <div
                        key={movie.tmdbId}
                        className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => setSelectedMovie(movie)}
                      >
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={movie.title}
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
                          <h4 className="font-semibold text-gray-900 dark:text-white">{movie.title}</h4>
                          {movie.year && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{movie.year}</p>
                          )}
                          {movie.overview && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 line-clamp-3">
                              {movie.overview}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Movie Details */}
            {selectedMovie && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedMovie.title} {selectedMovie.year && `(${selectedMovie.year})`}
                    </h4>
                    {selectedMovie.overview && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {selectedMovie.overview}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedMovie(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => handleAddMovie(selectedMovie)}
                  disabled={adding}
                  className="w-full px-4 py-2 bg-radarr text-white rounded-lg hover:bg-orange-400 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Movie'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

