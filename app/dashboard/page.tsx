'use client';

import { useEffect, useState } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig, SonarrSystemStatus, RadarrSystemStatus } from '@/types';
import Navigation from '@/components/Navigation';

export default function DashboardPage() {
  const [config, setConfig] = useState<AppConfig>({});
  const [sonarrStatus, setSonarrStatus] = useState<SonarrSystemStatus | null>(null);
  const [radarrStatus, setRadarrStatus] = useState<RadarrSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ sonarr?: string; radarr?: string }>({});

  useEffect(() => {
    const saved = getConfig();
    setConfig(saved);
    loadStatus(saved);
  }, []);

  const loadStatus = async (cfg: AppConfig) => {
    setLoading(true);
    setError({});

    if (cfg.sonarr?.enabled && cfg.sonarr?.url && cfg.sonarr?.apiKey) {
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.sonarr.url,
            apiKey: cfg.sonarr.apiKey,
            endpoint: '/system/status',
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setSonarrStatus(data);
        } else {
          setError(prev => ({ ...prev, sonarr: 'Failed to connect' }));
        }
      } catch (err) {
        setError(prev => ({ ...prev, sonarr: 'Connection error' }));
      }
    }

    if (cfg.radarr?.enabled && cfg.radarr?.url && cfg.radarr?.apiKey) {
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/system/status',
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setRadarrStatus(data);
        } else {
          setError(prev => ({ ...prev, radarr: 'Failed to connect' }));
        }
      } catch (err) {
        setError(prev => ({ ...prev, radarr: 'Connection error' }));
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sonarr Status Card */}
          {config.sonarr?.enabled ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-sonarr">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-sonarr">Sonarr</h2>
                {sonarrStatus ? (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                    Connected
                  </span>
                ) : error.sonarr ? (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">
                    Error
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                    Loading...
                  </span>
                )}
              </div>
              {sonarrStatus ? (
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p><span className="font-semibold">Version:</span> {sonarrStatus.version}</p>
                  <p><span className="font-semibold">Instance:</span> {sonarrStatus.instanceName || 'Default'}</p>
                  <p><span className="font-semibold">Branch:</span> {sonarrStatus.branch}</p>
                  <p><span className="font-semibold">OS:</span> {sonarrStatus.osName} {sonarrStatus.osVersion}</p>
                </div>
              ) : error.sonarr ? (
                <p className="text-red-600 dark:text-red-400">{error.sonarr}</p>
              ) : (
                <p className="text-gray-500">Loading status...</p>
              )}
            </div>
          ) : null}

          {/* Radarr Status Card */}
          {config.radarr?.enabled ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-radarr">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-radarr">Radarr</h2>
                {radarrStatus ? (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                    Connected
                  </span>
                ) : error.radarr ? (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">
                    Error
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                    Loading...
                  </span>
                )}
              </div>
              {radarrStatus ? (
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p><span className="font-semibold">Version:</span> {radarrStatus.version}</p>
                  <p><span className="font-semibold">Instance:</span> {radarrStatus.instanceName || 'Default'}</p>
                  <p><span className="font-semibold">Branch:</span> {radarrStatus.branch}</p>
                  <p><span className="font-semibold">OS:</span> {radarrStatus.osName} {radarrStatus.osVersion}</p>
                </div>
              ) : error.radarr ? (
                <p className="text-red-600 dark:text-red-400">{error.radarr}</p>
              ) : (
                <p className="text-gray-500">Loading status...</p>
              )}
            </div>
          ) : null}
        </div>

        {!config.sonarr?.enabled && !config.radarr?.enabled && (
          <div className="mt-8 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              No services enabled. Please configure at least one service in Settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

