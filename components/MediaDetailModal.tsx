'use client';

import { useState, useEffect } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig, RadarrMovie, SonarrSeries } from '@/types';

interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  media_type: 'movie' | 'tv';
  genres?: Array<{ id: number; name: string }>;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
}

interface MediaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: TMDBMediaItem | null;
  onMediaAdded?: () => void;
}

export default function MediaDetailModal({ isOpen, onClose, media, onMediaAdded }: MediaDetailModalProps) {
  const [config, setConfig] = useState<AppConfig>({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radarrRootFolders, setRadarrRootFolders] = useState<any[]>([]);
  const [radarrQualityProfiles, setRadarrQualityProfiles] = useState<any[]>([]);
  const [sonarrRootFolders, setSonarrRootFolders] = useState<any[]>([]);
  const [sonarrQualityProfiles, setSonarrQualityProfiles] = useState<any[]>([]);
  const [sonarrLanguageProfiles, setSonarrLanguageProfiles] = useState<any[]>([]);
  const [mediaDetails, setMediaDetails] = useState<TMDBMediaItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  const [libraryItem, setLibraryItem] = useState<RadarrMovie | SonarrSeries | null>(null);

  useEffect(() => {
    const saved = getConfig();
    setConfig(saved);
    if (saved.radarr?.enabled) {
      loadRadarrConfig(saved);
    }
    if (saved.sonarr?.enabled) {
      loadSonarrConfig(saved);
    }
  }, []);

  useEffect(() => {
    if (isOpen && media && config.tmdb?.apiKey) {
      loadMediaDetails();
      checkLibraryStatus();
    }
  }, [isOpen, media, config]);

  const checkLibraryStatus = async () => {
    if (!media) return;

    if (media.media_type === 'movie' && config.radarr?.enabled && config.radarr?.url && config.radarr?.apiKey) {
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: config.radarr.url,
            apiKey: config.radarr.apiKey,
            endpoint: '/movie',
          }),
        });
        if (response.ok) {
          const movies: RadarrMovie[] = await response.json();
          const found = movies.find(m => m.tmdbId === media.id);
          if (found) {
            setInLibrary(true);
            setLibraryItem(found);
          } else {
            setInLibrary(false);
            setLibraryItem(null);
          }
        }
      } catch (err) {
        console.error('Error checking library status:', err);
      }
    } else if (media.media_type === 'tv' && config.sonarr?.enabled && config.sonarr?.url && config.sonarr?.apiKey) {
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: config.sonarr.url,
            apiKey: config.sonarr.apiKey,
            endpoint: '/series',
          }),
        });
        if (response.ok) {
          const series: SonarrSeries[] = await response.json();
          const title = media.title || media.name || '';
          const releaseDate = media.release_date || media.first_air_date;
          const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;
          
          const found = series.find(s => {
            const seriesYear = s.year;
            const titleMatch = s.title.toLowerCase() === title.toLowerCase() ||
                              s.cleanTitle?.toLowerCase() === title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const yearMatch = !releaseYear || !seriesYear || seriesYear === releaseYear;
            return titleMatch && yearMatch;
          });
          
          if (found) {
            setInLibrary(true);
            setLibraryItem(found);
          } else {
            setInLibrary(false);
            setLibraryItem(null);
          }
        }
      } catch (err) {
        console.error('Error checking library status:', err);
      }
    }
  };

  const loadMediaDetails = async () => {
    if (!media || !config.tmdb?.apiKey) return;

    setLoadingDetails(true);
    try {
      const response = await fetch(
        `/api/tmdb?tmdbId=${media.id}&type=${media.media_type}&apiKey=${encodeURIComponent(config.tmdb.apiKey)}&details=true`
      );
      if (response.ok) {
        const data = await response.json();
        setMediaDetails(data);
      }
    } catch (err) {
      console.error('Error loading media details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadRadarrConfig = async (cfg: AppConfig) => {
    if (!cfg.radarr?.url || !cfg.radarr?.apiKey) return;

    try {
      const [rootFoldersRes, qualityProfilesRes] = await Promise.all([
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/rootFolder',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/qualityProfile',
          }),
        }),
      ]);

      if (rootFoldersRes.ok) {
        const folders = await rootFoldersRes.json();
        setRadarrRootFolders(folders);
      }
      if (qualityProfilesRes.ok) {
        const profiles = await qualityProfilesRes.json();
        setRadarrQualityProfiles(profiles);
      }
    } catch (err) {
      console.error('Error loading Radarr config:', err);
    }
  };

  const loadSonarrConfig = async (cfg: AppConfig) => {
    if (!cfg.sonarr?.url || !cfg.sonarr?.apiKey) return;

    try {
      const [rootFoldersRes, qualityProfilesRes, languageProfilesRes] = await Promise.all([
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.sonarr.url,
            apiKey: cfg.sonarr.apiKey,
            endpoint: '/rootFolder',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.sonarr.url,
            apiKey: cfg.sonarr.apiKey,
            endpoint: '/qualityProfile',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.sonarr.url,
            apiKey: cfg.sonarr.apiKey,
            endpoint: '/languageProfile',
          }),
        }),
      ]);

      if (rootFoldersRes.ok) {
        const folders = await rootFoldersRes.json();
        setSonarrRootFolders(folders);
      }
      if (qualityProfilesRes.ok) {
        const profiles = await qualityProfilesRes.json();
        setSonarrQualityProfiles(profiles);
      }
      if (languageProfilesRes.ok) {
        const profiles = await languageProfilesRes.json();
        setSonarrLanguageProfiles(profiles);
      }
    } catch (err) {
      console.error('Error loading Sonarr config:', err);
    }
  };

  const handleAddToLibrary = async () => {
    if (!media) return;

    if (media.media_type === 'movie') {
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

        if (!movieData || !movieData.tmdbId) {
          throw new Error('Invalid movie data returned from Radarr');
        }

        const moviePayload = {
          ...movieData,
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
          if (onMediaAdded) onMediaAdded();
          onClose();
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
        if (!config.tmdb?.apiKey) {
          throw new Error('TMDB API key is required to convert TMDB ID to TVDB ID');
        }

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

        if (!seriesData || (Array.isArray(seriesData) && seriesData.length === 0)) {
          throw new Error(`Series with TVDB ID ${tvdbId} not found in Sonarr. The series may not be available in Sonarr's metadata sources.`);
        }

        const seriesToAdd = Array.isArray(seriesData) ? seriesData[0] : seriesData;

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
          if (onMediaAdded) onMediaAdded();
          onClose();
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

  const getPosterUrl = (posterPath: string | null | undefined) => {
    if (!posterPath) return null;
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  };

  const getBackdropUrl = (backdropPath: string | null | undefined) => {
    if (!backdropPath) return null;
    return `https://image.tmdb.org/t/p/w1280${backdropPath}`;
  };

  const getMediaTitle = () => {
    if (!media) return '';
    return media.title || media.name || 'Unknown';
  };

  const getReleaseYear = () => {
    if (!media) return null;
    const date = media.release_date || media.first_air_date;
    return date ? new Date(date).getFullYear() : null;
  };

  const getRuntime = () => {
    if (!mediaDetails) return null;
    if (media.media_type === 'movie') {
      return mediaDetails.runtime;
    } else {
      return mediaDetails.episode_run_time?.[0];
    }
  };

  if (!isOpen || !media) return null;

  const displayItem = mediaDetails || media;
  const posterUrl = getPosterUrl(displayItem.poster_path);
  const backdropUrl = getBackdropUrl(displayItem.backdrop_path);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Backdrop Image */}
          {backdropUrl && (
            <div className="relative h-64 bg-gray-900">
              <img
                src={backdropUrl}
                alt={getMediaTitle()}
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 px-6 py-6">
            <div className="flex gap-6">
              {/* Poster */}
              {posterUrl ? (
                <div className="flex-shrink-0">
                  <img
                    src={posterUrl}
                    alt={getMediaTitle()}
                    className="w-48 h-72 object-cover rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-48 h-72 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {getMediaTitle()}
                      {getReleaseYear() && (
                        <span className="text-2xl font-normal text-gray-500 dark:text-gray-400 ml-2">
                          ({getReleaseYear()})
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {displayItem.vote_average && (
                        <div className="flex items-center gap-1">
                          <span>⭐</span>
                          <span className="font-semibold">{displayItem.vote_average.toFixed(1)}</span>
                          {displayItem.vote_count && (
                            <span className="text-gray-400 dark:text-gray-500">
                              ({displayItem.vote_count.toLocaleString()})
                            </span>
                          )}
                        </div>
                      )}
                      {getRuntime() && (
                        <span>{getRuntime()} min</span>
                      )}
                      {media.media_type === 'tv' && displayItem.number_of_seasons && (
                        <span>{displayItem.number_of_seasons} season{displayItem.number_of_seasons !== 1 ? 's' : ''}</span>
                      )}
                      {media.media_type === 'tv' && displayItem.number_of_episodes && (
                        <span>{displayItem.number_of_episodes} episode{displayItem.number_of_episodes !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 flex-shrink-0"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Genres */}
                {displayItem.genres && displayItem.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {displayItem.genres.map((genre) => (
                      <span
                        key={genre.id}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overview */}
                {displayItem.overview && (
                  <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                    {displayItem.overview}
                  </p>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                    {error}
                  </div>
                )}

                {/* Library Status */}
                {inLibrary && (
                  <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Already in Library</span>
                    {libraryItem && (libraryItem as RadarrMovie).id && (
                      <a
                        href={`/radarr/${(libraryItem as RadarrMovie).id}`}
                        className="ml-auto text-sm underline hover:no-underline"
                      >
                        View Details →
                      </a>
                    )}
                    {libraryItem && (libraryItem as SonarrSeries).id && (
                      <a
                        href={`/sonarr/${(libraryItem as SonarrSeries).id}`}
                        className="ml-auto text-sm underline hover:no-underline"
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                )}

                {/* Add to Library Button */}
                {!inLibrary && (
                  <button
                    onClick={handleAddToLibrary}
                    disabled={adding || (media.media_type === 'movie' && !config.radarr?.enabled) || (media.media_type === 'tv' && !config.sonarr?.enabled)}
                    className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                      media.media_type === 'movie'
                        ? 'bg-radarr hover:bg-orange-600 text-white'
                        : 'bg-sonarr hover:bg-blue-400 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {adding
                      ? 'Adding to Library...'
                      : media.media_type === 'movie'
                      ? 'Add to Radarr Library'
                      : 'Add to Sonarr Library'}
                  </button>
                )}

                {((media.media_type === 'movie' && !config.radarr?.enabled) ||
                  (media.media_type === 'tv' && !config.sonarr?.enabled)) && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                    {media.media_type === 'movie'
                      ? 'Radarr is not enabled. Please enable it in Settings.'
                      : 'Sonarr is not enabled. Please enable it in Settings.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

