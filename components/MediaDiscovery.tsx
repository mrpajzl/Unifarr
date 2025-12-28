'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { AppConfig, RadarrMovie, SonarrSeries } from '@/types';
import MediaDetailModal from './MediaDetailModal';

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

interface MediaList {
  title: string;
  type: 'trending' | 'popular' | 'top_rated' | 'now_playing' | 'upcoming' | 'on_the_air' | 'airing_today';
  mediaType: 'movie' | 'tv';
  items: TMDBMediaItem[];
  loading: boolean;
}

export default function MediaDiscovery() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig>({});
  const [lists, setLists] = useState<MediaList[]>([
    { title: 'Trending Movies', type: 'trending', mediaType: 'movie', items: [], loading: true },
    { title: 'Trending TV Shows', type: 'trending', mediaType: 'tv', items: [], loading: true },
    { title: 'Popular Movies', type: 'popular', mediaType: 'movie', items: [], loading: true },
    { title: 'Popular TV Shows', type: 'popular', mediaType: 'tv', items: [], loading: true },
    { title: 'Top Rated Movies', type: 'top_rated', mediaType: 'movie', items: [], loading: true },
    { title: 'Top Rated TV Shows', type: 'top_rated', mediaType: 'tv', items: [], loading: true },
  ]);
  const [selectedMedia, setSelectedMedia] = useState<TMDBMediaItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [radarrMovies, setRadarrMovies] = useState<RadarrMovie[]>([]);
  const [sonarrSeries, setSonarrSeries] = useState<SonarrSeries[]>([]);

  useEffect(() => {
    const saved = getConfig();
    setConfig(saved);
    if (saved.tmdb?.apiKey) {
      loadAllLists(saved.tmdb.apiKey);
    } else {
      // Mark all lists as not loading if no API key
      setLists(prev => prev.map(list => ({ ...list, loading: false })));
    }
    loadLibraryData(saved);
  }, []);

  // Update library status when library data changes
  useEffect(() => {
    // Only update if we have library data and items to check
    const hasLibraryData = radarrMovies.length > 0 || sonarrSeries.length > 0;
    if (!hasLibraryData) return;
    
    setLists(prev => {
      // Only update if there are items to update
      const hasItems = prev.some(list => list.items.length > 0);
      if (!hasItems) return prev;
      
      // Check if any items need updating
      const needsUpdate = prev.some(list => 
        list.items.some(item => {
          const shouldBeInLibrary = checkIfInLibrary(item);
          return item.inLibrary !== shouldBeInLibrary;
        })
      );
      
      if (!needsUpdate) return prev;
      
      return prev.map(list => ({
        ...list,
        items: list.items.map(item => ({
          ...item,
          inLibrary: checkIfInLibrary(item),
        })),
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

  const checkIfInLibrary = (item: TMDBMediaItem): boolean => {
    if (item.media_type === 'movie') {
      // Match movies by TMDB ID
      return radarrMovies.some(m => m.tmdbId === item.id);
    } else {
      // Match TV shows by title and year
      const title = item.title || item.name || '';
      const releaseDate = item.release_date || item.first_air_date;
      const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;
      
      return sonarrSeries.some(s => {
        const seriesYear = s.year;
        const titleMatch = s.title.toLowerCase() === title.toLowerCase() ||
                          s.cleanTitle?.toLowerCase() === title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const yearMatch = !releaseYear || !seriesYear || seriesYear === releaseYear;
        return titleMatch && yearMatch;
      });
    }
  };

  const loadAllLists = async (apiKey: string) => {
    const listPromises = lists.map(async (list) => {
      try {
        const response = await fetch(
          `/api/tmdb?listType=${list.type}&mediaType=${list.mediaType}&apiKey=${encodeURIComponent(apiKey)}&page=1`
        );
        if (response.ok) {
          const data = await response.json();
          const items = (data.results || []).slice(0, 10).map((item: TMDBMediaItem) => ({
            ...item,
            inLibrary: checkIfInLibrary(item),
          }));
          return {
            ...list,
            items,
            loading: false,
          };
        } else {
          return { ...list, items: [], loading: false };
        }
      } catch (error) {
        console.error(`Error loading ${list.title}:`, error);
        return { ...list, items: [], loading: false };
      }
    });

    const loadedLists = await Promise.all(listPromises);
    setLists(loadedLists);
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

  const handleViewAll = (list: MediaList) => {
    router.push(`/dashboard/list?type=${list.type}&mediaType=${list.mediaType}&title=${encodeURIComponent(list.title)}`);
  };

  if (!config.tmdb?.apiKey) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
        <p className="text-yellow-800 dark:text-yellow-200 mb-4">
          TMDB API key is not configured. Please configure it in Settings to discover new media.
        </p>
        <a
          href="/settings"
          className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {lists.map((list) => (
          <div key={`${list.type}-${list.mediaType}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{list.title}</h2>
            </div>
            {list.loading ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                    style={{ height: '288px' }}
                  />
                ))}
              </div>
            ) : list.items.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No items found</p>
            ) : (
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
                  {list.items.map((item) => {
                    const posterUrl = getPosterUrl(item.poster_path);
                    const title = getMediaTitle(item);
                    const year = getReleaseYear(item);
                    
                    return (
                      <div
                        key={`${item.media_type}-${item.id}`}
                        className="flex-shrink-0 w-48 cursor-pointer group"
                        onClick={() => handleMediaClick(item)}
                      >
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                          {posterUrl ? (
                            <div className="relative">
                              <img
                                src={posterUrl}
                                alt={title}
                                className="w-full h-72 object-cover"
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
                                <span className="text-white opacity-0 group-hover:opacity-100 font-semibold">
                                  View Details
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-72 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <svg
                                className="w-16 h-16 text-gray-400"
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
                      </div>
                    );
                  })}
                  {/* View All Button */}
                  <div className="flex-shrink-0 w-48 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewAll(list);
                      }}
                      className="w-full h-full min-h-[288px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    >
                      <svg
                        className="w-12 h-12 text-gray-400 dark:text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
                        View All
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
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
          // Optionally show success message or refresh
        }}
      />
    </>
  );
}

