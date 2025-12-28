'use client';

import { useState, useEffect, useMemo } from 'react';
import { SonarrEpisode, AppConfig, SonarrSeason } from '@/types';
import { getConfig } from '@/lib/config';
import TorrentSearchModal from '@/components/TorrentSearchModal';
import SeasonFilterDropdown from '@/components/SeasonFilterDropdown';

interface EpisodesListProps {
  seriesId: number;
  seriesTitle: string;
  selectedSeason?: number | null;
  seasons?: SonarrSeason[];
  onSeasonChange?: (season: number | null) => void;
}

export default function EpisodesList({ 
  seriesId, 
  seriesTitle, 
  selectedSeason: propSelectedSeason,
  seasons,
  onSeasonChange: propOnSeasonChange
}: EpisodesListProps) {
  const [episodes, setEpisodes] = useState<SonarrEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<SonarrEpisode | null>(null);
  const [showTorrentModal, setShowTorrentModal] = useState(false);
  const [filterSeason, setFilterSeason] = useState<number | null>(propSelectedSeason ?? null);
  const [filterMissing, setFilterMissing] = useState(false);
  const [config, setConfig] = useState<AppConfig>({});

  useEffect(() => {
    const saved = getConfig();
    setConfig(saved);
    if (saved.sonarr?.enabled) {
      loadEpisodes(saved);
    } else {
      setLoading(false);
      setError('Sonarr is not enabled');
    }
  }, [seriesId]);

  useEffect(() => {
    if (propSelectedSeason !== undefined) {
      setFilterSeason(propSelectedSeason);
    }
  }, [propSelectedSeason]);

  const handleSeasonChange = (season: number | null) => {
    setFilterSeason(season);
    if (propOnSeasonChange) {
      propOnSeasonChange(season);
    }
  };

  const loadEpisodes = async (cfg: AppConfig) => {
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
          endpoint: `/episode?seriesId=${seriesId}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEpisodes(data);
      } else {
        setError('Failed to load episodes');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const searchForEpisode = (episode: SonarrEpisode) => {
    setSelectedEpisode(episode);
    setShowTorrentModal(true);
  };

  const handleTorrentModalClose = () => {
    setShowTorrentModal(false);
    // Refresh episodes after closing modal to show updated status
    if (config.sonarr?.enabled) {
      loadEpisodes(config);
    }
  };

  const filteredEpisodes = useMemo(() => {
    let filtered = [...episodes];

    if (filterSeason !== null) {
      filtered = filtered.filter(ep => ep.seasonNumber === filterSeason);
    }

    if (filterMissing) {
      filtered = filtered.filter(ep => !ep.hasFile);
    }

    // Sort by season and episode number
    return filtered.sort((a, b) => {
      if (a.seasonNumber !== b.seasonNumber) {
        return a.seasonNumber - b.seasonNumber;
      }
      return a.episodeNumber - b.episodeNumber;
    });
  }, [episodes, filterSeason, filterMissing]);

  const seasonNumbers = useMemo(() => {
    const seasonSet = new Set(episodes.map(ep => ep.seasonNumber));
    return Array.from(seasonSet).sort((a, b) => a - b);
  }, [episodes]);

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
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Loading episodes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  const missingCount = episodes.filter(ep => !ep.hasFile).length;
  const totalCount = episodes.length;

  return (
    <div className="space-y-6">
      {/* Season Filter Dropdown */}
      {seasons && seasons.length > 0 && (
        <SeasonFilterDropdown
          seasons={seasons}
          selectedSeason={filterSeason}
          onSeasonChange={handleSeasonChange}
          episodes={episodes}
        />
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="filterMissing"
              checked={filterMissing}
              onChange={(e) => setFilterMissing(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="filterMissing" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Show Missing Only
            </label>
          </div>
          <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredEpisodes.length} of {totalCount} episodes
            {missingCount > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                ({missingCount} missing)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Episodes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Episode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Air Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEpisodes.map((episode) => (
                <tr
                  key={episode.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !episode.hasFile ? 'bg-red-50 dark:bg-red-900/20' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div>
                      <div className="font-medium">{episode.title || 'Untitled'}</div>
                      {episode.overview && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {episode.overview}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(episode.airDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {episode.hasFile ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Has File
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {episode.episodeFile?.language?.name || episode.episodeFile?.mediaInfo?.audioLanguages || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {episode.episodeFile?.quality?.quality?.name || 'N/A'}
                    {episode.episodeFile?.quality?.revision?.version && episode.episodeFile.quality.revision.version > 1 && (
                      <span className="ml-1 text-xs">v{episode.episodeFile.quality.revision.version}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(episode.episodeFile?.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!episode.hasFile && (
                      <button
                        onClick={() => searchForEpisode(episode)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        Search
                      </button>
                    )}
                    {episode.hasFile && episode.episodeFile && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div>Path: {episode.episodeFile.relativePath || episode.episodeFile.path || 'N/A'}</div>
                        {episode.episodeFile.mediaInfo && (
                          <>
                            {episode.episodeFile.mediaInfo.videoCodec && (
                              <div>Video: {episode.episodeFile.mediaInfo.videoCodec}</div>
                            )}
                            {episode.episodeFile.mediaInfo.audioCodec && (
                              <div>Audio: {episode.episodeFile.mediaInfo.audioCodec}</div>
                            )}
                            {episode.episodeFile.mediaInfo.resolution && (
                              <div>Resolution: {episode.episodeFile.mediaInfo.resolution}</div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredEpisodes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No episodes found</p>
          </div>
        )}
      </div>

      {/* Torrent Search Modal */}
      <TorrentSearchModal
        isOpen={showTorrentModal}
        onClose={handleTorrentModalClose}
        episode={selectedEpisode}
      />
    </div>
  );
}

