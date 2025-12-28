'use client';

import { useState, useEffect, useRef } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig, RadarrQualityProfile, RadarrRootFolder } from '@/types';

interface LibraryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  service?: 'radarr' | 'sonarr';
}

interface FolderMatch {
  folder: string;
  folderName: string;
  matches: Array<{
    id: number;
    title?: string;
    name?: string;
    overview?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string;
    vote_average?: number;
  }>;
  size: number;
}

export default function LibraryImportModal({ 
  isOpen, 
  onClose, 
  onImportComplete,
  service = 'radarr' 
}: LibraryImportModalProps) {
  const [config, setConfig] = useState<AppConfig>({});
  const [folders, setFolders] = useState<FolderMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderMatch | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [qualityProfiles, setQualityProfiles] = useState<RadarrQualityProfile[]>([]);
  const [rootFolders, setRootFolders] = useState<RadarrRootFolder[]>([]);
  const [importing, setImporting] = useState(false);
  const [manualSearchTerm, setManualSearchTerm] = useState<{ [key: string]: string }>({});
  const [manualSearchResults, setManualSearchResults] = useState<{ [key: string]: any[] }>({});
  const [manualSearching, setManualSearching] = useState<{ [key: string]: boolean }>({});
  const searchTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    if (isOpen) {
      const saved = getConfig();
      setConfig(saved);
      loadConfig(saved);
      scanForFolders(saved);
    } else {
      // Reset state when modal closes
      setFolders([]);
      setSelectedFolder(null);
      setSelectedMatch(null);
      setError(null);
      setManualSearchTerm({});
      setManualSearchResults({});
      setManualSearching({});
      // Clear any pending search timeouts
      Object.values(searchTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
      searchTimeoutRef.current = {};
    }
  }, [isOpen]);

  const loadConfig = async (cfg: AppConfig) => {
    const serviceConfig = service === 'radarr' ? cfg.radarr : cfg.sonarr;
    if (!serviceConfig?.url || !serviceConfig?.apiKey) return;

    try {
      // Load quality profiles
      const qualityResponse = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: serviceConfig.url,
          apiKey: serviceConfig.apiKey,
          endpoint: service === 'radarr' ? '/qualityProfile' : '/qualityProfile',
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
          url: serviceConfig.url,
          apiKey: serviceConfig.apiKey,
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

  const scanForFolders = async (cfg: AppConfig) => {
    const serviceConfig = service === 'radarr' ? cfg.radarr : cfg.sonarr;
    if (!serviceConfig?.url || !serviceConfig?.apiKey || !cfg.tmdb?.apiKey) {
      setError('Radarr/Sonarr and TMDB must be configured');
      return;
    }

    setScanning(true);
    setError(null);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radarrUrl: serviceConfig.url,
          radarrApiKey: serviceConfig.apiKey,
          tmdbApiKey: cfg.tmdb.apiKey,
          service: service,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
        if (data.folders?.length === 0) {
          // Check if this is the endpoint not available error
          if (data.error === 'ENDPOINT_NOT_AVAILABLE') {
            setError(data.message || 'Import endpoint not available. Please use Radarr/Sonarr\'s built-in import feature.');
          } else {
            setError(data.message || 'No unmatched folders found');
          }
        }
      } else {
        const errorData = await response.json();
        if (errorData.error === 'ENDPOINT_NOT_AVAILABLE') {
          setError(errorData.message || 'Import endpoint not available. Please use Radarr/Sonarr\'s built-in import feature.');
        } else {
          setError(errorData.error || 'Failed to scan folders');
        }
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async (folder: FolderMatch, tmdbId: number) => {
    const serviceConfig = service === 'radarr' ? config.radarr : config.sonarr;
    if (!serviceConfig?.url || !serviceConfig?.apiKey) return;

    if (rootFolders.length === 0) {
      setError('No root folders configured');
      return;
    }

    if (qualityProfiles.length === 0) {
      setError('No quality profiles configured');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      if (service === 'radarr') {
        // Lookup movie in Radarr by TMDB ID
        // The correct endpoint is /movie/lookup/tmdb?tmdbId={id}
        const lookupResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: serviceConfig.url,
            apiKey: serviceConfig.apiKey,
            endpoint: `/movie/lookup/tmdb?tmdbId=${tmdbId}`,
          }),
        });

        if (!lookupResponse.ok) {
          const errorData = await lookupResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to lookup movie in Radarr: ${lookupResponse.status}`);
        }

        const movieData = await lookupResponse.json();
        
        // The /movie/lookup/tmdb endpoint returns a single MovieResource, not an array
        if (!movieData || !movieData.tmdbId) {
          throw new Error('Invalid movie data returned from Radarr');
        }

        // Add movie with the existing folder path
        const moviePayload = {
          ...movieData,
          qualityProfileId: qualityProfiles[0].id,
          rootFolderPath: rootFolders[0].path,
          path: folder.folder, // Use the existing folder path
          monitored: true,
          addOptions: {
            searchForMovie: false,
          },
        };

        const addResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: serviceConfig.url,
            apiKey: serviceConfig.apiKey,
            endpoint: '/movie',
            method: 'POST',
            data: moviePayload,
          }),
        });

        if (!addResponse.ok) {
          const errorData = await addResponse.json();
          throw new Error(errorData.error || 'Failed to import movie');
        }
      } else {
        // Sonarr import - lookup series by TMDB ID
        const lookupResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: serviceConfig.url,
            apiKey: serviceConfig.apiKey,
            endpoint: `/series/lookup?term=tmdb:${tmdbId}`,
          }),
        });

        if (!lookupResponse.ok) {
          throw new Error('Failed to lookup series in Sonarr');
        }

        const seriesData = await lookupResponse.json();
        const series = Array.isArray(seriesData) ? seriesData[0] : seriesData;

        // Add series with the existing folder path
        const seriesPayload = {
          ...series,
          qualityProfileId: qualityProfiles[0].id,
          rootFolderPath: rootFolders[0].path,
          path: folder.folder, // Use the existing folder path
          monitored: true,
          seasonFolder: true,
          addOptions: {
            ignoreEpisodesWithFiles: false,
            ignoreEpisodesWithoutFiles: false,
            searchForMissingEpisodes: false,
          },
        };

        const addResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: serviceConfig.url,
            apiKey: serviceConfig.apiKey,
            endpoint: '/series',
            method: 'POST',
            data: seriesPayload,
          }),
        });

        if (!addResponse.ok) {
          const errorData = await addResponse.json();
          throw new Error(errorData.error || 'Failed to import series');
        }
      }

      // Remove the imported folder from the list
      setFolders(folders.filter(f => f.folder !== folder.folder));
      setSelectedFolder(null);
      setSelectedMatch(null);
      
      if (folders.length === 1) {
        // Last folder imported, close modal
        onImportComplete();
        onClose();
      } else {
        onImportComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import');
    } finally {
      setImporting(false);
    }
  };

  const getPosterUrl = (posterPath: string | null | undefined, size: 'w92' | 'w200' = 'w200') => {
    if (!posterPath) return null;
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  };

  const handleManualSearch = async (folder: FolderMatch, searchTerm: string) => {
    if (!searchTerm.trim() || !config.tmdb?.apiKey) return;

    const folderKey = folder.folder;
    setManualSearching({ ...manualSearching, [folderKey]: true });

    try {
      const response = await fetch(`/api/tmdb?query=${encodeURIComponent(searchTerm)}&apiKey=${config.tmdb.apiKey}`);
      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        // Filter to only movies for Radarr or TV for Sonarr
        const filteredResults = results.filter((item: any) => 
          service === 'radarr' ? item.media_type === 'movie' : item.media_type === 'tv'
        );
        setManualSearchResults({ ...manualSearchResults, [folderKey]: filteredResults.slice(0, 10) });
      }
    } catch (err) {
      console.error('Manual search error:', err);
    } finally {
      setManualSearching({ ...manualSearching, [folderKey]: false });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Import Library - {service === 'radarr' ? 'Movies' : 'TV Shows'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => scanForFolders(config)}
                  disabled={scanning}
                  className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {scanning ? 'Scanning...' : 'Rescan'}
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {scanning && (
              <div className="mb-4 text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">Scanning for unmatched folders...</p>
              </div>
            )}

            {!scanning && folders.length > 0 && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {folders.map((folder, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {folder.folderName}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {folder.folder}
                        </p>
                        {folder.size > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Size: {formatSize(folder.size)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Manual Search Input */}
                    <div className="mb-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualSearchTerm[folder.folder] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setManualSearchTerm({ ...manualSearchTerm, [folder.folder]: value });
                            
                            // Clear existing timeout
                            if (searchTimeoutRef.current[folder.folder]) {
                              clearTimeout(searchTimeoutRef.current[folder.folder]);
                            }
                            
                            if (!value.trim()) {
                              setManualSearchResults({ ...manualSearchResults, [folder.folder]: [] });
                              return;
                            }
                            
                            // Debounce search - wait 500ms after user stops typing
                            searchTimeoutRef.current[folder.folder] = setTimeout(() => {
                              handleManualSearch(folder, value);
                            }, 500);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && manualSearchTerm[folder.folder]) {
                              // Clear any pending timeout and search immediately
                              if (searchTimeoutRef.current[folder.folder]) {
                                clearTimeout(searchTimeoutRef.current[folder.folder]);
                                delete searchTimeoutRef.current[folder.folder];
                              }
                              handleManualSearch(folder, manualSearchTerm[folder.folder]);
                            }
                          }}
                          placeholder="Search manually..."
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-radarr"
                        />
                        {manualSearching[folder.folder] && (
                          <div className="flex items-center px-3">
                            <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Display matches - compact horizontal layout */}
                    {(folder.matches.length > 0 || (manualSearchResults[folder.folder] && manualSearchResults[folder.folder].length > 0)) ? (
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {manualSearchResults[folder.folder]?.length > 0 ? 'Search Results:' : 'TMDB Matches:'}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {(manualSearchResults[folder.folder]?.length > 0 ? manualSearchResults[folder.folder] : folder.matches).map((match: any) => {
                            const posterUrl = getPosterUrl(match.poster_path, 'w92');
                            const title = match.title || match.name || 'Unknown';
                            const releaseDate = match.release_date || match.first_air_date;
                            const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
                            
                            return (
                              <div
                                key={match.id}
                                className={`flex-shrink-0 border rounded-lg p-1.5 cursor-pointer transition-all w-20 ${
                                  selectedFolder === folder && selectedMatch === match.id
                                    ? 'border-radarr bg-radarr bg-opacity-10'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                                }`}
                                onClick={() => {
                                  setSelectedFolder(folder);
                                  setSelectedMatch(match.id);
                                }}
                              >
                                {posterUrl ? (
                                  <img
                                    src={posterUrl}
                                    alt={title}
                                    className="w-full aspect-[2/3] object-cover rounded mb-1"
                                  />
                                ) : (
                                  <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded mb-1 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                                <p className="text-[10px] font-medium text-gray-900 dark:text-white truncate leading-tight">
                                  {title}
                                </p>
                                {year && (
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {year}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No matches found. Try searching manually above.
                      </p>
                    )}

                    {selectedFolder === folder && selectedMatch && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        {(() => {
                          // Combine automatic and manual search results
                          const allMatches = [
                            ...folder.matches,
                            ...(manualSearchResults[folder.folder] || [])
                          ];
                          const selected = allMatches.find((m: any) => m.id === selectedMatch);
                          
                          if (!selected) return null;
                          
                          const title = selected.title || selected.name || 'Unknown';
                          const releaseDate = selected.release_date || selected.first_air_date;
                          const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
                          
                          return (
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                {selected.poster_path ? (
                                  <img
                                    src={getPosterUrl(selected.poster_path, 'w92')}
                                    alt={title}
                                    className="w-12 h-18 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-18 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {title} {year && `(${year})`}
                                </p>
                                {selected.vote_average && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    ⭐ {selected.vote_average.toFixed(1)}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleImport(folder, selectedMatch)}
                                disabled={importing}
                                className="flex-shrink-0 px-4 py-2 bg-radarr text-white rounded-lg hover:bg-orange-400 disabled:opacity-50 text-sm"
                              >
                                {importing ? 'Importing...' : 'Import'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!scanning && folders.length === 0 && !error && (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  No unmatched folders found. All folders may already be imported.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

