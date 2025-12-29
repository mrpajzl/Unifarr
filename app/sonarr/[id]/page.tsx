'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { AppConfig, SonarrSeries } from '@/types';
import Navigation from '@/components/Navigation';
import TorrentSearchModal from '@/components/TorrentSearchModal';
import Link from 'next/link';
import EpisodesList from '@/components/EpisodesList';

export default function SeriesDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [config, setConfig] = useState<AppConfig>({});
  const [series, setSeries] = useState<SonarrSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTorrentModal, setShowTorrentModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  useEffect(() => {
    const loadConfigAsync = async () => {
      const saved = await getConfig();
      setConfig(saved);
      if (saved.sonarr?.enabled && id) {
        loadSeries(saved, parseInt(id));
      } else {
        setLoading(false);
        if (!saved.sonarr?.enabled) {
          setError('Sonarr is not enabled');
        }
      }
    };
    loadConfigAsync();
  }, [id]);

  const loadSeries = async (cfg: AppConfig, seriesId: number) => {
    if (!cfg.sonarr?.url || !cfg.sonarr?.apiKey) {
      setError('Sonarr not configured');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cfg.sonarr.url,
          apiKey: cfg.sonarr.apiKey,
          endpoint: `/series/${seriesId}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSeries(data);
      } else {
        setError('Failed to load series');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const getPosterUrl = (item: SonarrSeries) => {
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

    const serviceConfig = config.sonarr;
    if (!serviceConfig?.url || !serviceConfig?.apiKey) {
      return originalUrl;
    }

    const imagePath = encodeURIComponent(originalUrl);
    const serviceUrl = encodeURIComponent(serviceConfig.url);
    const apiKey = encodeURIComponent(serviceConfig.apiKey);
    
    return `/api/image?path=${imagePath}&service=sonarr&url=${serviceUrl}&apiKey=${apiKey}`;
  };

  const getFanartUrl = (item: SonarrSeries) => {
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

    const serviceConfig = config.sonarr;
    if (!serviceConfig?.url || !serviceConfig?.apiKey) {
      return originalUrl;
    }

    const imagePath = encodeURIComponent(originalUrl);
    const serviceUrl = encodeURIComponent(serviceConfig.url);
    const apiKey = encodeURIComponent(serviceConfig.apiKey);
    
    return `/api/image?path=${imagePath}&service=sonarr&url=${serviceUrl}&apiKey=${apiKey}`;
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

  if (!config.sonarr?.enabled) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              Sonarr is not enabled. Please enable it in Settings.
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
            <p className="text-gray-600 dark:text-gray-400">Loading series details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error || 'Series not found'}</p>
          </div>
          <Link
            href="/sonarr"
            className="mt-4 inline-block px-4 py-2 bg-sonarr text-white rounded-lg hover:bg-blue-400"
          >
            Back to Series
          </Link>
        </div>
      </div>
    );
  }

  const posterUrl = getPosterUrl(series);
  const fanartUrl = getFanartUrl(series);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navigation />
      
      {/* Hero Section with Fanart */}
      <div className="relative min-h-[400px] overflow-hidden">
        {fanartUrl ? (
          <>
            <img
              src={fanartUrl}
              alt={series.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/60 to-gray-900"></div>
            <div className="absolute inset-0 bg-black/40"></div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900"></div>
        )}
        <div className="relative flex flex-col min-h-[400px]">
          {/* Top bar with back button */}
          <div className="flex justify-between items-start p-4 sm:p-6 lg:p-8">
            <Link
              href="/sonarr"
              className="px-4 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-700/80 backdrop-blur-sm"
            >
              ← Back to Series
            </Link>
          </div>
          
          {/* Content area */}
          <div className="flex-1 flex items-end pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex items-end gap-6 flex-wrap">
                {/* Poster on the left */}
                {posterUrl ? (
                  <div className="hidden md:block flex-shrink-0">
                    <img
                      src={posterUrl}
                      alt={series.title}
                      className="w-40 rounded-lg shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="hidden md:block w-40 aspect-[2/3] bg-gray-200/20 dark:bg-gray-700/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Title and Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                    {series.title}
                  </h1>
                  {series.year && (
                    <p className="text-xl text-gray-200 mb-4 drop-shadow-md">{series.year}</p>
                  )}
                  
                  {/* Ratings */}
                  {series.ratings && series.ratings.value && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg font-semibold text-white drop-shadow-md">
                        {series.ratings.value.toFixed(1)}/10
                      </span>
                      {series.ratings.votes && (
                        <span className="text-sm text-gray-300 drop-shadow-md">
                          ({series.ratings.votes.toLocaleString()} votes)
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Genres */}
                  {series.genres && series.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {series.genres.map((genre, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm border border-white/30"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Quick Stats Row */}
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${
                      series.status === 'continuing'
                        ? 'bg-green-500/80 text-white'
                        : series.status === 'ended'
                        ? 'bg-gray-500/80 text-white'
                        : 'bg-yellow-500/80 text-white'
                    }`}>
                      {series.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${
                      series.monitored
                        ? 'bg-blue-500/80 text-white'
                        : 'bg-gray-500/80 text-white'
                    }`}>
                      {series.monitored ? 'Monitored' : 'Not Monitored'}
                    </span>
                    {series.statistics && (
                      <>
                        <span className="text-white text-sm drop-shadow-md">
                          {series.statistics.episodeCount || 0} / {series.statistics.totalEpisodeCount || 0} Episodes
                        </span>
                        {series.statistics.percentOfEpisodes !== undefined && (
                          <span className="text-white text-sm drop-shadow-md">
                            {series.statistics.percentOfEpisodes.toFixed(1)}% Complete
                          </span>
                        )}
                        {series.statistics.sizeOnDisk && (
                          <span className="text-white text-sm drop-shadow-md">
                            {formatFileSize(series.statistics.sizeOnDisk)}
                          </span>
                        )}
                      </>
                    )}
                    {series.certification && (
                      <span className="text-white text-sm drop-shadow-md">
                        {series.certification}
                      </span>
                    )}
                    {series.runtime && (
                      <span className="text-white text-sm drop-shadow-md">
                        {series.runtime} min
                      </span>
                    )}
                  </div>
                  
                  {/* Action Button */}
                  <div className="mt-4">
                    <button
                      onClick={() => setShowTorrentModal(true)}
                      className="px-6 py-2 bg-sonarr text-white rounded-lg hover:bg-blue-400 font-medium shadow-lg"
                    >
                      Search Torrents
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Overview */}
          {series.overview && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Overview</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{series.overview}</p>
            </div>
          )}

          {/* Series Information */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Series Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {series.network && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Network</span>
                  <p className="text-gray-900 dark:text-white">{series.network}</p>
                </div>
              )}
              {series.airTime && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Air Time</span>
                  <p className="text-gray-900 dark:text-white">{series.airTime}</p>
                </div>
              )}
              {series.firstAired && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">First Aired</span>
                  <p className="text-gray-900 dark:text-white">{formatDate(series.firstAired)}</p>
                </div>
              )}
              {series.seriesType && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Series Type</span>
                  <p className="text-gray-900 dark:text-white">{series.seriesType}</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {series.imdbId && (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">IMDB ID</span>
                <p className="text-gray-900 dark:text-white">
                  <a
                    href={`https://www.imdb.com/title/${series.imdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {series.imdbId}
                  </a>
                </p>
              </div>
            )}
            {series.tvdbId && (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">TVDB ID</span>
                <p className="text-gray-900 dark:text-white">
                  <a
                    href={`https://www.thetvdb.com/series/${series.tvdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {series.tvdbId}
                  </a>
                </p>
              </div>
            )}
            {series.added && (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Added to Library</span>
                <p className="text-gray-900 dark:text-white">{formatDate(series.added)}</p>
              </div>
            )}
            {series.path && (
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Library Path</span>
                <p className="text-sm text-gray-900 dark:text-white break-all">{series.path}</p>
              </div>
            )}
          </div>
        </div>

        {/* Episodes List */}
        {series.id && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Episodes</h2>
            <EpisodesList 
              seriesId={series.id} 
              seriesTitle={series.title}
              selectedSeason={selectedSeason}
              seasons={series.seasons}
              onSeasonChange={setSelectedSeason}
            />
          </div>
        )}
      </div>

      <TorrentSearchModal
        isOpen={showTorrentModal}
        onClose={() => setShowTorrentModal(false)}
        series={series || null}
      />
    </div>
  );
}

