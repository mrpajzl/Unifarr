'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RadarrMovie, SonarrSeries } from '@/types';
import { getConfig } from '@/lib/config';

type MediaItem = RadarrMovie | SonarrSeries;
type ViewMode = 'grid' | 'table';
type SortField = 'title' | 'year' | 'status' | 'monitored' | 'added' | 'rating' | 'hasFile';
type SortDirection = 'asc' | 'desc';

interface MediaViewProps {
  items: MediaItem[];
  type: 'movie' | 'series';
  loading?: boolean;
}

const getStoredViewMode = (): ViewMode => {
  if (typeof window === 'undefined') return 'table';
  const stored = localStorage.getItem('mediaViewMode');
  return (stored === 'grid' || stored === 'table') ? stored : 'table';
};

const setStoredViewMode = (mode: ViewMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mediaViewMode', mode);
};

export default function MediaView({ items, type, loading = false }: MediaViewProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode());
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    setStoredViewMode(viewMode);
  }, [viewMode]);

  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'year':
          aValue = a.year || 0;
          bValue = b.year || 0;
          break;
        case 'status':
          aValue = a.status?.toLowerCase() || '';
          bValue = b.status?.toLowerCase() || '';
          break;
        case 'monitored':
          aValue = a.monitored ? 1 : 0;
          bValue = b.monitored ? 1 : 0;
          break;
        case 'added':
          aValue = a.added ? new Date(a.added).getTime() : 0;
          bValue = b.added ? new Date(b.added).getTime() : 0;
          break;
        case 'rating':
          if (type === 'movie') {
            const movieA = a as RadarrMovie;
            const movieB = b as RadarrMovie;
            aValue = movieA.ratings?.tmdb?.value || movieA.ratings?.imdb?.value || 0;
            bValue = movieB.ratings?.tmdb?.value || movieB.ratings?.imdb?.value || 0;
          } else {
            const seriesA = a as SonarrSeries;
            const seriesB = b as SonarrSeries;
            aValue = seriesA.ratings?.value || 0;
            bValue = seriesB.ratings?.value || 0;
          }
          break;
        case 'hasFile':
          if (type === 'movie') {
            const movieA = a as RadarrMovie;
            const movieB = b as RadarrMovie;
            aValue = movieA.hasFile ? 1 : 0;
            bValue = movieB.hasFile ? 1 : 0;
          } else {
            // For series, this field doesn't apply, so return 0
            return 0;
          }
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [items, sortField, sortDirection, type]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortButton = ({ field, label, inTable = false }: { field: SortField; label: string; inTable?: boolean }) => {
    const isActive = sortField === field;
    const baseClasses = inTable
      ? "flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-100 cursor-pointer"
      : "flex items-center space-x-1 hover:text-gray-900 dark:hover:text-white cursor-pointer";
    
    return (
      <button
        onClick={() => handleSort(field)}
        className={baseClasses}
      >
        <span>{label}</span>
        {isActive && (
          <span className="text-xs ml-1">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
        {!isActive && inTable && (
          <span className="text-xs ml-1 text-gray-400 dark:text-gray-500">↕</span>
        )}
      </button>
    );
  };

  const getPosterUrl = (item: MediaItem) => {
    // First, try to find an image with remoteUrl (external URL, doesn't need authentication)
    const posterImage = item.images?.find(img => img.coverType === 'poster');
    const fanartImage = item.images?.find(img => img.coverType === 'fanart');
    const firstImage = item.images?.[0];
    
    // Prefer remoteUrl if available (these are external URLs from TMDB/TVDB)
    const remoteUrl = (posterImage as any)?.remoteUrl || 
                      (fanartImage as any)?.remoteUrl || 
                      (firstImage as any)?.remoteUrl;
    
    if (remoteUrl && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
      return remoteUrl;
    }
    
    // Fall back to local URL
    const originalUrl = posterImage?.url || fanartImage?.url || firstImage?.url;
    
    if (!originalUrl) {
      return null;
    }

    // If the URL is already absolute (starts with http:// or https://), return as is
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      return originalUrl;
    }

    // Get config to determine which service to use
    const config = getConfig();
    const service = type === 'movie' ? 'radarr' : 'sonarr';
    const serviceConfig = type === 'movie' ? config.radarr : config.sonarr;

    // If service is not configured, return the original URL (will likely fail, but better than nothing)
    if (!serviceConfig?.url || !serviceConfig?.apiKey) {
      return originalUrl;
    }

    // Transform relative URL to use our proxy
    const imagePath = encodeURIComponent(originalUrl);
    const serviceUrl = encodeURIComponent(serviceConfig.url);
    const apiKey = encodeURIComponent(serviceConfig.apiKey);
    
    return `/api/image?path=${imagePath}&service=${service}&url=${serviceUrl}&apiKey=${apiKey}`;
  };

  const getStatusColor = (status: string) => {
    if (type === 'movie') {
      return status === 'released' 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        : status === 'announced'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    } else {
      return status === 'continuing'
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        : status === 'ended'
        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {sortedItems.length} {type === 'movie' ? 'movies' : 'series'}
          </span>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Sort by:</span>
            <SortButton field="title" label="Title" />
            <span>•</span>
            <SortButton field="year" label="Year" />
            <span>•</span>
            <SortButton field="status" label="Status" />
            <span>•</span>
            <SortButton field="monitored" label="Monitored" />
            {type === 'movie' && (
              <>
                <span>•</span>
                <SortButton field="rating" label="Rating" />
                <span>•</span>
                <SortButton field="hasFile" label="Has File" />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${
              viewMode === 'grid'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-label="Grid view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded ${
              viewMode === 'table'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-label="Table view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedItems.map((item) => {
            const posterUrl = getPosterUrl(item);
            const isMovie = type === 'movie';
            const movie = isMovie ? item as RadarrMovie : null;
            const series = !isMovie ? item as SonarrSeries : null;

            return (
              <Link
                key={item.id}
                href={type === 'movie' ? `/radarr/${item.id}` : `/sonarr/${item.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer block"
              >
                <div className="aspect-[2/3] relative bg-gray-200 dark:bg-gray-700">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate mb-1">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{item.year || 'N/A'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${
                      item.monitored
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {item.monitored ? 'Monitored' : 'Not Monitored'}
                    </span>
                    {isMovie && movie?.hasFile !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        movie.hasFile
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {movie.hasFile ? 'Has File' : 'No File'}
                      </span>
                    )}
                    {!isMovie && series && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {series.statistics?.episodeCount || 0}/{series.statistics?.totalEpisodeCount || 0}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <SortButton field="title" label="Title" inTable={true} />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <SortButton field="status" label="Status" inTable={true} />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <SortButton field="year" label="Year" inTable={true} />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <SortButton field="monitored" label="Monitored" inTable={true} />
                  </th>
                  {type === 'movie' ? (
                    <th className="px-6 py-3 text-left">
                      <SortButton field="hasFile" label="Has File" inTable={true} />
                    </th>
                  ) : (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Episodes
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedItems.map((item) => {
                  const isMovie = type === 'movie';
                  const movie = isMovie ? item as RadarrMovie : null;
                  const series = !isMovie ? item as SonarrSeries : null;
                  const posterUrl = getPosterUrl(item);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(type === 'movie' ? `/radarr/${item.id}` : `/sonarr/${item.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {posterUrl && (
                            <img
                              src={posterUrl}
                              alt={item.title}
                              className="h-10 w-10 rounded mr-3 object-cover"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.title}
                            </div>
                            {isMovie && movie?.studio && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {movie.studio}
                              </div>
                            )}
                            {!isMovie && series?.network && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {series.network}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.year || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.monitored
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {item.monitored ? 'Yes' : 'No'}
                        </span>
                      </td>
                      {type === 'movie' ? (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            movie?.hasFile
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {movie?.hasFile ? 'Yes' : 'No'}
                          </span>
                        </td>
                      ) : (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {series?.statistics?.episodeCount || 0} / {series?.statistics?.totalEpisodeCount || 0}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No {type === 'movie' ? 'movies' : 'series'} found
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

