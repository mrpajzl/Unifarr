'use client';

import { useState, useEffect } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig, RadarrMovie, SonarrSeries, SonarrEpisode } from '@/types';

interface Release {
  guid?: string;
  quality?: {
    quality?: {
      name?: string;
      resolution?: number;
    };
  };
  size?: number;
  indexer?: string;
  title?: string;
  publishDate?: string;
  downloadUrl?: string;
  magnetUrl?: string;
  indexerId?: number;
  infoUrl?: string;
  commentUrl?: string;
  protocol?: string; // 'torrent' or 'usenet'
  isManualSearch?: boolean; // Flag to indicate if this came from manual search
}

interface TorrentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie?: RadarrMovie | null;
  series?: SonarrSeries | null;
  episode?: SonarrEpisode | null;
}

export default function TorrentSearchModal({ isOpen, onClose, movie, series, episode }: TorrentSearchModalProps) {
  const [config, setConfig] = useState<AppConfig>({});
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [grabbing, setGrabbing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isMovie = !!movie;
  const isSeries = !!series;
  const isEpisode = !!episode;
  const item = movie || series || episode;
  const serviceType = isMovie ? 'radarr' : 'sonarr';
  const serviceConfig = isMovie ? config.radarr : config.sonarr;
  const buttonColor = isMovie ? 'bg-radarr hover:bg-orange-400' : 'bg-sonarr hover:bg-blue-400';
  const focusRingColor = isMovie ? 'focus:ring-radarr' : 'focus:ring-sonarr';

  useEffect(() => {
    if (isOpen && item) {
      const loadConfig = async () => {
        const saved = await getConfig();
        setConfig(saved);
        if (isMovie && movie?.id) {
          searchReleases(saved, movie.id, 'radarr', 'movie');
        } else if (isSeries && series?.id) {
          searchReleases(saved, series.id, 'sonarr', 'series');
        } else if (isEpisode && episode?.id) {
          searchReleases(saved, episode.id, 'sonarr', 'episode');
        }
      };
      loadConfig();
    }
  }, [isOpen, movie, series, episode, isMovie, isSeries, isEpisode]);

  const searchReleases = async (cfg: AppConfig, itemId: number, type: 'radarr' | 'sonarr', searchType: 'movie' | 'series' | 'episode') => {
    const serviceCfg = type === 'radarr' ? cfg.radarr : cfg.sonarr;
    if (!serviceCfg?.url || !serviceCfg?.apiKey) return;

    setLoading(true);
    setError(null);
    setReleases([]);

    try {
      let endpoint = '';
      if (searchType === 'movie') {
        endpoint = `/release?movieId=${itemId}`;
      } else if (searchType === 'series') {
        endpoint = `/release?seriesId=${itemId}`;
      } else if (searchType === 'episode') {
        endpoint = `/release?episodeId=${itemId}`;
      }

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: serviceCfg.url,
          apiKey: serviceCfg.apiKey,
          endpoint,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Filter releases to only show those that match the requested item
        let filteredData = data;
        if (searchType === 'series' && Array.isArray(data)) {
          // For series searches, only show releases that map to the requested series
          filteredData = data.filter((release: any) => {
            // Exclude releases that are explicitly mapped to a different series
            if (release.mappedSeriesId !== undefined && release.mappedSeriesId !== itemId) {
              return false;
            }
            
            // Exclude rejected releases with "Unknown Series" or wrong series alias
            if (release.rejected && release.rejections) {
              const rejections = Array.isArray(release.rejections) ? release.rejections : [release.rejections];
              const rejectionText = rejections.join(' ').toLowerCase();
              if (rejectionText.includes('unknown series') || 
                  (rejectionText.includes('matches an alias for series') && 
                   !rejectionText.includes(`tvdb id: ${itemId}`))) {
                return false;
              }
            }
            
            // Include releases that:
            // 1. Have mappedSeriesId matching itemId, OR
            // 2. Have mappedEpisodeInfo with at least one episode (indicating potential match)
            // Exclude releases with no mapping info at all
            if (release.mappedSeriesId === itemId) {
              return true;
            }
            
            // If mappedSeriesId is not set, check if we have episode info
            if (release.mappedEpisodeInfo && 
                Array.isArray(release.mappedEpisodeInfo) && 
                release.mappedEpisodeInfo.length > 0) {
              // Has episode info, might be relevant (Sonarr is still processing)
              return true;
            }
            
            // No mapping info at all, exclude it
            return false;
          });
        } else if (searchType === 'episode' && Array.isArray(data)) {
          // For episode searches, only show releases that map to the requested episode
          filteredData = data.filter((release: any) => {
            // Check if mappedEpisodeInfo contains the requested episode
            if (release.mappedEpisodeInfo && Array.isArray(release.mappedEpisodeInfo)) {
              return release.mappedEpisodeInfo.some((ep: any) => ep.id === itemId);
            }
            // If no episode mapping, exclude it
            return false;
          });
        } else if (searchType === 'movie' && Array.isArray(data)) {
          // For movie searches, only show releases that map to the requested movie
          filteredData = data.filter((release: any) => {
            // Check if mappedMovieId matches (if available)
            if (release.mappedMovieId !== undefined) {
              return release.mappedMovieId === itemId;
            }
            // If no mapping info, exclude it
            return false;
          });
        }
        
        setReleases(filteredData);
      } else {
        setError('Failed to search releases');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualSearch.trim()) return;

    setSearching(true);
    setError(null);
    setReleases([]);

    try {
      // Prefer Prowlarr if configured, otherwise fall back to Radarr/Sonarr indexers
      let response;
      if (config.prowlarr?.url && config.prowlarr?.apiKey) {
        // Use Prowlarr directly
        response = await fetch('/api/prowlarr-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prowlarrUrl: config.prowlarr.url,
            prowlarrApiKey: config.prowlarr.apiKey,
            query: manualSearch.trim(),
            isMovie: isMovie,
          }),
        });
      } else if (serviceConfig?.url && serviceConfig?.apiKey) {
        // Fall back to Radarr/Sonarr indexers
        response = await fetch('/api/indexer-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceUrl: serviceConfig.url,
            apiKey: serviceConfig.apiKey,
            query: manualSearch.trim(),
            isMovie: isMovie,
          }),
        });
      } else {
        setError('Please configure either Prowlarr or Radarr/Sonarr in Settings');
        setSearching(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setReleases(data);
        if (data.length === 0) {
          setError('No releases found for your search term. Check server logs for details.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || `Failed to search indexers (${response.status})`);
      }
    } catch (err) {
      setError('Connection error while searching indexers');
    } finally {
      setSearching(false);
    }
  };

  const handleGrabRelease = async (release: Release) => {
    if (!serviceConfig?.url || !serviceConfig?.apiKey) return;
    
    // For manual searches, we need downloadUrl or magnetUrl
    if (release.isManualSearch && !release.downloadUrl && !release.magnetUrl) {
      setError('Release is missing download URL or magnet link');
      return;
    }
    
    // For normal searches, we need guid and indexerId
    if (!release.isManualSearch && (!release.guid || !release.indexerId)) {
      setError('Release is missing required information');
      return;
    }

    setGrabbing(release.guid || release.title || 'release');
    setError(null);
    setSuccess(null);

    try {
      let endpoint = '/release';
      let data: any;

      if (release.isManualSearch) {
        // For manual searches, always use /release/push endpoint
        // Manual search results from Prowlarr aren't in Sonarr/Radarr cache, so regular endpoint won't work
        endpoint = '/release/push';
        // Protocol must be capitalized enum value: "Torrent" or "Usenet"
        let protocolValue = 'Torrent'; // default
        if (release.protocol) {
          const protocolLower = release.protocol.toLowerCase();
          protocolValue = protocolLower === 'usenet' ? 'Usenet' : 'Torrent';
        }
        data = {
          title: release.title || 'Unknown',
          downloadUrl: release.downloadUrl || undefined,
          magnetUrl: release.magnetUrl || undefined,
          protocol: protocolValue,
          publishDate: release.publishDate || new Date().toISOString(),
          indexerId: release.indexerId || undefined,
          indexer: release.indexer || undefined,
        };
      } else {
        // Use normal grab endpoint for releases from Radarr/Sonarr search
        data = {
          guid: release.guid,
          indexerId: release.indexerId,
        };
      }

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: serviceConfig.url,
          apiKey: serviceConfig.apiKey,
          endpoint,
          method: 'POST',
          data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        const errorMessage = errorData.error || errorData.message || errorData.title || `Failed to grab release (${response.status})`;
        
        // Check if it's the "cache" error for Sonarr manual searches
        if (errorMessage.includes("Couldn't find requested release in cache") && !isMovie && release.isManualSearch) {
          // For Sonarr manual searches, the release isn't in Sonarr's cache
          // Sonarr only caches releases from its own searches, not from external Prowlarr searches
          setError(`Sonarr couldn't find this release in its cache. Releases from manual Prowlarr searches aren't cached by Sonarr. Please use Sonarr's built-in search (click "Search" in Sonarr for this series/episode) to grab releases, or ensure the indexer is configured directly in Sonarr.`);
          setGrabbing(null);
          return;
        }
        
        // Check if it's a download client error (qBittorrent, etc.)
        if (errorMessage.includes("Download client failed") || errorMessage.includes("download client")) {
          setError(`Failed to add torrent to download client (qBittorrent). Please check: 1) qBittorrent is running and accessible, 2) Download client is properly configured in ${isMovie ? 'Radarr' : 'Sonarr'}, 3) qBittorrent credentials are correct, 4) The torrent URL is accessible. Error: ${errorMessage}`);
          setGrabbing(null);
          return;
        }
        
        setError(errorMessage);
        setGrabbing(null);
        return;
      }

      // Response is OK, parse it
      const responseData = await response.json().catch(() => null);
      
      // Check if the response indicates success
      // For push endpoint, should be an array of ReleaseResource
      // For regular endpoint, might be different format
      if (Array.isArray(responseData) && responseData.length > 0) {
        setSuccess(`Successfully grabbed: ${release.title || 'release'}`);
      } else if (responseData) {
        // Some endpoints might return different success responses
        setSuccess(`Successfully grabbed: ${release.title || 'release'}`);
      } else {
        // Empty response might still be success
        setSuccess(`Successfully grabbed: ${release.title || 'release'}`);
      }
      
      // Refresh releases if we have a movie/episode context
      if (isMovie && movie?.id) {
        setTimeout(() => searchReleases(config, movie.id!, 'radarr', 'movie'), 1000);
      } else if (isSeries && series?.id) {
        setTimeout(() => searchReleases(config, series.id!, 'sonarr', 'series'), 1000);
      } else if (isEpisode && episode?.id) {
        setTimeout(() => searchReleases(config, episode.id!, 'sonarr', 'episode'), 1000);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Connection error';
      setError(errorMessage);
    } finally {
      setGrabbing(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Check if a URL is a torrent file (should not be used for viewing)
  const isTorrentFileUrl = (url?: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.torrent') || 
           lowerUrl.includes('/download') ||
           lowerUrl.includes('application/x-bittorrent');
  };

  // Get the best URL for viewing (prefer commentUrl, avoid torrent files)
  const getViewUrl = (release: Release): string | null => {
    // Prefer commentUrl over infoUrl (commentUrl is more likely to be the actual page)
    const urls = [release.commentUrl, release.infoUrl].filter(Boolean) as string[];
    
    // Find the first URL that is not a torrent file
    for (const url of urls) {
      if (!isTorrentFileUrl(url)) {
        return url;
      }
    }
    
    // If all URLs are torrent files, return null (don't show button)
    return null;
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Search Torrents</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isEpisode && episode ? (
                    <>S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')} - {episode.title || 'Untitled'}</>
                  ) : (
                    <>{item.title} {'year' in item && item.year && `(${item.year})`}</>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Manual Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Manual Search (Custom Text)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                  placeholder="Enter custom search term..."
                  className={`flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingColor}`}
                />
                <button
                  onClick={handleManualSearch}
                  disabled={searching || !manualSearch.trim()}
                  className={`px-6 py-2 ${buttonColor} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
                {item.id && (
                  <button
                    onClick={() => {
                      setManualSearch('');
                      if (isMovie && movie?.id) {
                        searchReleases(config, movie.id, 'radarr', 'movie');
                      } else if (isSeries && series?.id) {
                        searchReleases(config, series.id, 'sonarr', 'series');
                      } else if (isEpisode && episode?.id) {
                        searchReleases(config, episode.id, 'sonarr', 'episode');
                      }
                    }}
                    disabled={loading}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
              </div>
            )}

            {/* Releases List */}
            <div className="max-h-96 overflow-y-auto">
              {loading && (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">Loading releases...</p>
                </div>
              )}

              {!loading && releases.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    {manualSearch ? 'No releases found for your search.' : 'No releases found. Try a manual search.'}
                  </p>
                </div>
              )}

              {!loading && releases.length > 0 && (
                <div className="space-y-3">
                  {releases.map((release, index) => (
                    <div
                      key={release.guid || index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {release.title || 'Unknown Release'}
                          </h4>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>
                              <span className="font-medium">Quality:</span> {release.quality?.quality?.name || 'Unknown'}
                              {release.quality?.quality?.resolution && ` (${release.quality.quality.resolution}p)`}
                            </span>
                            {release.size && (
                              <span>
                                <span className="font-medium">Size:</span> {formatFileSize(release.size)}
                              </span>
                            )}
                            {release.indexer && (
                              <span>
                                <span className="font-medium">Indexer:</span> {release.indexer}
                              </span>
                            )}
                            {release.publishDate && (
                              <span>
                                <span className="font-medium">Published:</span> {formatDate(release.publishDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {(() => {
                            const viewUrl = getViewUrl(release);
                            return viewUrl ? (
                              <a
                                href={viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 whitespace-nowrap flex items-center gap-1"
                                title="Open on torrent site"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View
                              </a>
                            ) : null;
                          })()}
                          <button
                            onClick={() => handleGrabRelease(release)}
                            disabled={
                              grabbing === (release.guid || release.title || 'release') || 
                              (release.isManualSearch 
                                ? (!release.downloadUrl && !release.magnetUrl)
                                : (!release.guid || !release.indexerId))
                            }
                            className={`px-4 py-2 ${buttonColor} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
                          >
                            {grabbing === (release.guid || release.title || 'release') ? 'Grabbing...' : 'Grab'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

