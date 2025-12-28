'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { AppConfig, RadarrMovie } from '@/types';
import Navigation from '@/components/Navigation';
import TorrentSearchModal from '@/components/TorrentSearchModal';
import DeleteMovieModal from '@/components/DeleteMovieModal';
import Link from 'next/link';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [config, setConfig] = useState<AppConfig>({});
  const [movie, setMovie] = useState<RadarrMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTorrentModal, setShowTorrentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const saved = getConfig();
    setConfig(saved);
    if (saved.radarr?.enabled && id) {
      loadMovie(saved, parseInt(id));
    } else {
      setLoading(false);
      if (!saved.radarr?.enabled) {
        setError('Radarr is not enabled');
      }
    }
  }, [id]);

  const loadMovie = async (cfg: AppConfig, movieId: number) => {
    if (!cfg.radarr?.url || !cfg.radarr?.apiKey) {
      setError('Radarr not configured');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cfg.radarr.url,
          apiKey: cfg.radarr.apiKey,
          endpoint: `/movie/${movieId}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMovie(data);
      } else {
        setError('Failed to load movie');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const getPosterUrl = (item: RadarrMovie) => {
    const posterImage = item.images?.find(img => img.coverType === 'poster');
    const fanartImage = item.images?.find(img => img.coverType === 'fanart');
    const firstImage = item.images?.[0];
    
    const remoteUrl = (posterImage as any)?.remoteUrl || 
                      (fanartImage as any)?.remoteUrl || 
                      (firstImage as any)?.remoteUrl;
    
    if (remoteUrl && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
      return remoteUrl;
    }
    
    const originalUrl = posterImage?.url || fanartImage?.url || firstImage?.url;
    
    if (!originalUrl) {
      return null;
    }

    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      return originalUrl;
    }

    const serviceConfig = config.radarr;
    if (!serviceConfig?.url || !serviceConfig?.apiKey) {
      return originalUrl;
    }

    const imagePath = encodeURIComponent(originalUrl);
    const serviceUrl = encodeURIComponent(serviceConfig.url);
    const apiKey = encodeURIComponent(serviceConfig.apiKey);
    
    return `/api/image?path=${imagePath}&service=radarr&url=${serviceUrl}&apiKey=${apiKey}`;
  };

  const getFanartUrl = (item: RadarrMovie) => {
    const fanartImage = item.images?.find(img => img.coverType === 'fanart');
    const posterImage = item.images?.find(img => img.coverType === 'poster');
    const firstImage = item.images?.[0];
    
    const remoteUrl = (fanartImage as any)?.remoteUrl || 
                      (posterImage as any)?.remoteUrl || 
                      (firstImage as any)?.remoteUrl;
    
    if (remoteUrl && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
      return remoteUrl;
    }
    
    const originalUrl = fanartImage?.url || posterImage?.url || firstImage?.url;
    
    if (!originalUrl) {
      return null;
    }

    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      return originalUrl;
    }

    const serviceConfig = config.radarr;
    if (!serviceConfig?.url || !serviceConfig?.apiKey) {
      return originalUrl;
    }

    const imagePath = encodeURIComponent(originalUrl);
    const serviceUrl = encodeURIComponent(serviceConfig.url);
    const apiKey = encodeURIComponent(serviceConfig.apiKey);
    
    return `/api/image?path=${imagePath}&service=radarr&url=${serviceUrl}&apiKey=${apiKey}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDeleteMovie = async (deleteFiles: boolean) => {
    if (!config.radarr?.url || !config.radarr?.apiKey || !movie?.id) {
      throw new Error('Radarr not configured or movie ID missing');
    }

    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: config.radarr.url,
        apiKey: config.radarr.apiKey,
        endpoint: `/movie/${movie.id}?deleteFiles=${deleteFiles}`,
        method: 'DELETE',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Failed to delete movie');
    }

    // Redirect to movies list after successful deletion
    router.push('/radarr');
  };

  if (!config.radarr?.enabled) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              Radarr is not enabled. Please enable it in Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading movie details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error || 'Movie not found'}</p>
          </div>
          <Link
            href="/radarr"
            className="mt-4 inline-block px-4 py-2 bg-radarr text-white rounded-lg hover:bg-orange-400"
          >
            Back to Movies
          </Link>
        </div>
      </div>
    );
  }

  const posterUrl = getPosterUrl(movie);
  const fanartUrl = getFanartUrl(movie);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navigation />
      
      {/* Hero Section with Fanart */}
      <div className="relative h-96 overflow-hidden">
        {fanartUrl ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900"></div>
            <img
              src={fanartUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900"></div>
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-8">
            <div className="flex items-end gap-6">
              {/* Poster on the left */}
              {posterUrl ? (
                <div className="hidden md:block flex-shrink-0">
                  <img
                    src={posterUrl}
                    alt={movie.title}
                    className="w-32 rounded-lg shadow-2xl"
                  />
                </div>
              ) : (
                <div className="hidden md:block w-32 aspect-[2/3] bg-gray-200/20 dark:bg-gray-700/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <Link
                href="/radarr"
                className="mb-4 inline-block px-4 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-700/80 backdrop-blur-sm"
              >
                ← Back to Movies
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Stats */}
          <div className="lg:col-span-1">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Info</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span>
                  <p className={`mt-1 px-3 py-1 inline-block rounded-full text-sm ${
                    movie.status === 'released' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : movie.status === 'announced'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {movie.status}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Monitored</span>
                  <p className={`mt-1 px-3 py-1 inline-block rounded-full text-sm ${
                    movie.monitored
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {movie.monitored ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Has File</span>
                  <p className={`mt-1 px-3 py-1 inline-block rounded-full text-sm ${
                    movie.hasFile
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {movie.hasFile ? 'Yes' : 'No'}
                  </p>
                </div>
                {movie.certification && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Certification</span>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{movie.certification}</p>
                  </div>
                )}
                {movie.runtime && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Runtime</span>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{movie.runtime} minutes</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowTorrentModal(true)}
                className="mt-4 w-full px-4 py-2 bg-radarr text-white rounded-lg hover:bg-orange-400"
              >
                Search Torrents
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Movie
              </button>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {movie.title}
              </h1>
              {movie.year && (
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">{movie.year}</p>
              )}

              {/* Ratings */}
              {movie.ratings && (
                <div className="flex flex-wrap gap-4 mb-6">
                  {movie.ratings.tmdb && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">TMDB:</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {movie.ratings.tmdb.value.toFixed(1)}/10
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({movie.ratings.tmdb.votes.toLocaleString()} votes)
                      </span>
                    </div>
                  )}
                  {movie.ratings.imdb && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">IMDB:</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {movie.ratings.imdb.value.toFixed(1)}/10
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({movie.ratings.imdb.votes.toLocaleString()} votes)
                      </span>
                    </div>
                  )}
                  {movie.ratings.rottenTomatoes && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Rotten Tomatoes:</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {movie.ratings.rottenTomatoes.value}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Overview */}
              {movie.overview && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Overview</h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{movie.overview}</p>
                </div>
              )}

              {/* Genres */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Genres</h2>
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map((genre, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Release Dates */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Release Dates</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {movie.inCinemas && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">In Cinemas</span>
                      <p className="text-gray-900 dark:text-white">{formatDate(movie.inCinemas)}</p>
                    </div>
                  )}
                  {movie.physicalRelease && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Physical Release</span>
                      <p className="text-gray-900 dark:text-white">{formatDate(movie.physicalRelease)}</p>
                    </div>
                  )}
                  {movie.digitalRelease && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Digital Release</span>
                      <p className="text-gray-900 dark:text-white">{formatDate(movie.digitalRelease)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* File Information */}
              {movie.movieFile && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">File Information</h2>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Path:</span>
                      <p className="text-sm text-gray-900 dark:text-white break-all">{movie.movieFile.path}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Size:</span>
                      <p className="text-sm text-gray-900 dark:text-white">{formatFileSize(movie.movieFile.size)}</p>
                    </div>
                    {movie.movieFile.quality && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Quality:</span>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {movie.movieFile.quality.quality.name} ({movie.movieFile.quality.quality.resolution}p)
                        </p>
                      </div>
                    )}
                    {movie.movieFile.dateAdded && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Added:</span>
                        <p className="text-sm text-gray-900 dark:text-white">{formatDate(movie.movieFile.dateAdded)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {movie.studio && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Studio</span>
                    <p className="text-gray-900 dark:text-white">{movie.studio}</p>
                  </div>
                )}
                {movie.imdbId && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">IMDB ID</span>
                    <p className="text-gray-900 dark:text-white">
                      <a
                        href={`https://www.imdb.com/title/${movie.imdbId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {movie.imdbId}
                      </a>
                    </p>
                  </div>
                )}
                {movie.tmdbId && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">TMDB ID</span>
                    <p className="text-gray-900 dark:text-white">
                      <a
                        href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {movie.tmdbId}
                      </a>
                    </p>
                  </div>
                )}
                {movie.added && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Added to Library</span>
                    <p className="text-gray-900 dark:text-white">{formatDate(movie.added)}</p>
                  </div>
                )}
                {movie.path && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Library Path</span>
                    <p className="text-sm text-gray-900 dark:text-white break-all">{movie.path}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <TorrentSearchModal
        isOpen={showTorrentModal}
        onClose={() => setShowTorrentModal(false)}
        movie={movie || null}
      />

      <DeleteMovieModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        movie={movie}
        onDelete={handleDeleteMovie}
      />
    </div>
  );
}

