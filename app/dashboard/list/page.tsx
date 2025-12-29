'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { AppConfig, RadarrMovie, SonarrSeries } from '@/types';
import Navigation from '@/components/Navigation';
import MediaDetailModal from '@/components/MediaDetailModal';

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
  inLibrary?: boolean;
}

function ListViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listType = searchParams.get('type');
  const mediaType = searchParams.get('mediaType') as 'movie' | 'tv' | null;
  const title = searchParams.get('title') || 'Media List';
  
  const [config, setConfig] = useState<AppConfig>({});
  const [items, setItems] = useState<TMDBMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMediaItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [radarrMovies, setRadarrMovies] = useState<RadarrMovie[]>([]);
  const [sonarrSeries, setSonarrSeries] = useState<SonarrSeries[]>([]);

  useEffect(() => {
    const loadConfigAsync = async () => {
      const saved = await getConfig();
      setConfig(saved);
      if (saved.tmdb?.apiKey && listType && mediaType) {
        loadItems(saved.tmdb.apiKey, 1);
      } else {
        setLoading(false);
      }
      loadLibraryData(saved);
    };
    loadConfigAsync();
  }, [listType, mediaType]);

  // Update library status when library data changes
  useEffect(() => {
    const hasLibraryData = radarrMovies.length > 0 || sonarrSeries.length > 0;
    if (!hasLibraryData) return;
    
    setItems(prev => {
      if (prev.length === 0) return prev;
      
      // Check if any items need updating
      const needsUpdate = prev.some(item => {
        const shouldBeInLibrary = checkIfInLibrary(item, radarrMovies, sonarrSeries);
        return item.inLibrary !== shouldBeInLibrary;
      });
      
      if (!needsUpdate) return prev;
      
      return prev.map(item => ({
        ...item,
        inLibrary: checkIfInLibrary(item, radarrMovies, sonarrSeries),
      }));
    });
  }, [radarrMovies, sonarrSeries]);

  const loadLibraryData = async (cfg: AppConfig): Promise<void> => {
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
          const movies = await response.json();
          setRadarrMovies(movies);
        }
      } catch (err) {
        console.error('Error loading Radarr movies:', err);
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
          const series = await response.json();
          setSonarrSeries(series);
        }
      } catch (err) {
        console.error('Error loading Sonarr series:', err);
      }
    }
  };

  const checkIfInLibrary = (item: TMDBMediaItem, movies: RadarrMovie[], series: SonarrSeries[]): boolean => {
    if (item.media_type === 'movie') {
      // Match movies by TMDB ID
      return movies.some(m => m.tmdbId === item.id);
    } else {
      // Match TV shows by title and year
      const title = item.title || item.name || '';
      const releaseDate = item.release_date || item.first_air_date;
      const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;
      
      return series.some(s => {
        const seriesYear = s.year;
        const titleMatch = s.title.toLowerCase() === title.toLowerCase() ||
                          s.cleanTitle?.toLowerCase() === title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const yearMatch = !releaseYear || !seriesYear || seriesYear === releaseYear;
        return titleMatch && yearMatch;
      });
    }
  };

  const loadItems = async (apiKey: string, pageNum: number, append = false) => {
    if (!listType || !mediaType) return;

    try {
      const response = await fetch(
        `/api/tmdb?listType=${listType}&mediaType=${mediaType}&apiKey=${encodeURIComponent(apiKey)}&page=${pageNum}`
      );
      if (response.ok) {
        const data = await response.json();
        // Use current state for library check
        const currentMovies = radarrMovies;
        const currentSeries = sonarrSeries;
        const newItems = (data.results || []).map((item: TMDBMediaItem) => ({
          ...item,
          inLibrary: checkIfInLibrary(item, currentMovies, currentSeries),
        }));
        if (append) {
          setItems(prev => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }
        setTotalPages(data.total_pages || 1);
        setHasMore(pageNum < (data.total_pages || 1));
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore && config.tmdb?.apiKey) {
      setLoading(true);
      loadItems(config.tmdb.apiKey, page + 1, true).finally(() => setLoading(false));
    }
  };

  const getPosterUrl = (posterPath: string | null | undefined) => {
    if (!posterPath) return null;
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  };

  const getMediaTitle = (item: TMDBMediaItem) => {
    return item.title || item.name || 'Unknown';
  };

  const getReleaseYear = (item: TMDBMediaItem) => {
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear() : null;
  };

  const handleMediaClick = (item: TMDBMediaItem) => {
    setSelectedMedia(item);
    setShowDetailModal(true);
  };

  if (!listType || !mediaType) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Invalid list parameters</p>
          </div>
        </div>
      </div>
    );
  }

  if (!config.tmdb?.apiKey) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              TMDB API key is not configured. Please configure it in Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Showing {items.length} {items.length === 1 ? 'item' : 'items'}
              {totalPages > 1 && ` (Page ${page} of ${totalPages})`}
            </p>
          </div>

          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                  style={{ aspectRatio: '2/3' }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No items found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {items.map((item) => {
                  const posterUrl = getPosterUrl(item.poster_path);
                  const title = getMediaTitle(item);
                  const year = getReleaseYear(item);

                  return (
                    <div
                      key={`${item.media_type}-${item.id}`}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                      onClick={() => handleMediaClick(item)}
                    >
                      <div className="aspect-[2/3] relative bg-gray-200 dark:bg-gray-700">
                        {posterUrl ? (
                          <>
                            <img
                              src={posterUrl}
                              alt={title}
                              className="w-full h-full object-cover"
                            />
                            {item.inLibrary && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                In Library
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 font-semibold text-sm">
                                View Details
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              className="w-12 h-12 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                          {title}
                          {year && <span className="text-gray-500 dark:text-gray-400"> ({year})</span>}
                        </h3>
                        {item.vote_average && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <span>⭐</span>
                            <span>{item.vote_average.toFixed(1)}</span>
                            {item.vote_count && (
                              <span className="text-gray-400 dark:text-gray-500">
                                ({item.vote_count.toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MediaDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMedia(null);
        }}
        media={selectedMedia}
        onMediaAdded={() => {
          setShowDetailModal(false);
          setSelectedMedia(null);
        }}
      />
    </>
  );
}

export default function ListViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    }>
      <ListViewContent />
    </Suspense>
  );
}

