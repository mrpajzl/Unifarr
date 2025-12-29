'use client';

import { useEffect, useState } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig, SonarrSeries } from '@/types';
import Navigation from '@/components/Navigation';
import MediaView from '@/components/MediaView';
import LibraryImportModal from '@/components/LibraryImportModal';
import Link from 'next/link';

export default function SonarrPage() {
  const [config, setConfig] = useState<AppConfig>({});
  const [series, setSeries] = useState<SonarrSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const loadConfigAsync = async () => {
      const saved = await getConfig();
      setConfig(saved);
      if (saved.sonarr?.enabled) {
        loadSeries(saved);
      } else {
        setLoading(false);
      }
    };
    loadConfigAsync();
  }, []);

  const loadSeries = async (cfg: AppConfig) => {
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
          endpoint: '/series',
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sonarr - Series</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Import Library
            </button>
            <Link
              href="/sonarr/settings"
              className="px-4 py-2 bg-sonarr text-white rounded-lg hover:bg-blue-400"
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
          <MediaView items={series} type="series" loading={loading} />
        )}
      </div>

      <LibraryImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          loadSeries(config);
        }}
        service="sonarr"
      />
    </div>
  );
}

