'use client';

import { useEffect, useState } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig, RadarrMovie } from '@/types';
import Navigation from '@/components/Navigation';
import MediaView from '@/components/MediaView';
import MovieSearchModal from '@/components/MovieSearchModal';
import LibraryImportModal from '@/components/LibraryImportModal';
import Link from 'next/link';

export default function RadarrPage() {
  const [config, setConfig] = useState<AppConfig>({});
  const [movies, setMovies] = useState<RadarrMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const loadConfigAsync = async () => {
      const saved = await getConfig();
      setConfig(saved);
      if (saved.radarr?.enabled) {
        loadMovies(saved);
      } else {
        setLoading(false);
      }
    };
    loadConfigAsync();
  }, []);

  const loadMovies = async (cfg: AppConfig) => {
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
          endpoint: '/movie',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMovies(data);
      } else {
        setError('Failed to load movies');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Radarr - Movies</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Import Library
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Add Movie
            </button>
            <Link
              href="/radarr/settings"
              className="px-4 py-2 bg-radarr text-white rounded-lg hover:bg-orange-400"
            >
              Settings
            </Link>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        ) : (
          <MediaView items={movies} type="movie" loading={loading} />
        )}
      </div>

      <MovieSearchModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onMovieAdded={() => {
          setShowAddModal(false);
          loadMovies(config);
        }}
      />

      <LibraryImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          loadMovies(config);
        }}
        service="radarr"
      />
    </div>
  );
}

