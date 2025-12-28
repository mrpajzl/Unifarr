'use client';

import { useState, useMemo } from 'react';
import { SonarrSeason, SonarrEpisode } from '@/types';

interface SeasonFilterDropdownProps {
  seasons: SonarrSeason[];
  selectedSeason: number | null;
  onSeasonChange: (season: number | null) => void;
  episodes?: SonarrEpisode[];
}

export default function SeasonFilterDropdown({
  seasons,
  selectedSeason,
  onSeasonChange,
  episodes = [],
}: SeasonFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!seasons || seasons.length === 0) {
    return null;
  }

  // Calculate actual episode counts from episodes data
  const seasonEpisodeCounts = useMemo(() => {
    const counts: Record<number, { hasFile: number; total: number }> = {};
    
    episodes.forEach(episode => {
      const seasonNum = episode.seasonNumber;
      if (!counts[seasonNum]) {
        counts[seasonNum] = { hasFile: 0, total: 0 };
      }
      counts[seasonNum].total++;
      if (episode.hasFile) {
        counts[seasonNum].hasFile++;
      }
    });
    
    return counts;
  }, [episodes]);

  const selectedSeasonData = selectedSeason !== null 
    ? seasons.find(s => s.seasonNumber === selectedSeason)
    : null;

  const getSeasonCounts = (seasonNumber: number) => {
    const counts = seasonEpisodeCounts[seasonNumber];
    if (counts) {
      return { hasFile: counts.hasFile, total: counts.total };
    }
    // Fallback to statistics if episodes data not available
    const season = seasons.find(s => s.seasonNumber === seasonNumber);
    return {
      hasFile: season?.statistics?.episodeCount || 0,
      total: season?.statistics?.totalEpisodeCount || 0,
    };
  };

  return (
    <div className="relative mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Seasons</h2>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white font-medium">
              {selectedSeason !== null 
                ? `Season ${selectedSeason}`
                : 'All Seasons'}
            </span>
            <svg
              className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          {selectedSeason !== null && (() => {
            const counts = getSeasonCounts(selectedSeason);
            return counts.total > 0 ? (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {counts.hasFile} / {counts.total} episodes
              </div>
            ) : null;
          })()}
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-auto">
              <div className="py-1">
                <button
                  onClick={() => {
                    onSeasonChange(null);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedSeason === null
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">All Seasons</span>
                  </div>
                </button>
                {seasons.map((season, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSeasonChange(season.seasonNumber);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700 ${
                      selectedSeason === season.seasonNumber
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">
                          Season {season.seasonNumber}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          season.monitored
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {season.monitored ? 'Monitored' : 'Not Monitored'}
                        </span>
                      </div>
                    </div>
                    {(() => {
                      const counts = getSeasonCounts(season.seasonNumber);
                      return counts.total > 0 ? (
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {counts.hasFile} / {counts.total} episodes
                        </div>
                      ) : null;
                    })()}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

