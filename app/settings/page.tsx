'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getConfig, saveConfig } from '@/lib/config';
import { AppConfig, ServiceConfig, SonarrSystemStatus, RadarrSystemStatus } from '@/types';
import Navigation from '@/components/Navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig>({});
  const [testing, setTesting] = useState<{ sonarr?: boolean; radarr?: boolean; prowlarr?: boolean }>({});
  const [testResults, setTestResults] = useState<{ sonarr?: boolean; radarr?: boolean; prowlarr?: boolean }>({});
  const [sonarrStatus, setSonarrStatus] = useState<SonarrSystemStatus | null>(null);
  const [radarrStatus, setRadarrStatus] = useState<RadarrSystemStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<{ sonarr?: string; radarr?: string }>({});

  useEffect(() => {
    const saved = getConfig();
    setConfig(saved);
    loadServiceStatus(saved);
  }, []);

  const loadServiceStatus = async (cfg: AppConfig) => {
    setStatusLoading(true);
    setStatusError({});

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
          setStatusError(prev => ({ ...prev, sonarr: 'Failed to connect' }));
        }
      } catch (err) {
        setStatusError(prev => ({ ...prev, sonarr: 'Connection error' }));
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
          setStatusError(prev => ({ ...prev, radarr: 'Failed to connect' }));
        }
      } catch (err) {
        setStatusError(prev => ({ ...prev, radarr: 'Connection error' }));
      }
    }

    setStatusLoading(false);
  };

  const updateServiceConfig = (service: 'sonarr' | 'radarr' | 'prowlarr', updates: Partial<ServiceConfig>) => {
    setConfig(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        ...updates,
        enabled: prev[service]?.enabled ?? true,
      },
    }));
  };

  const testConnection = async (service: 'sonarr' | 'radarr' | 'prowlarr') => {
    const serviceConfig = config[service];
    if (!serviceConfig?.url || !serviceConfig?.apiKey) {
      alert(`Please enter ${service} URL and API key first`);
      return;
    }

    setTesting(prev => ({ ...prev, [service]: true }));
    setTestResults(prev => ({ ...prev, [service]: undefined }));

    try {
      let response;
      if (service === 'prowlarr') {
        // Prowlarr uses /api/v1/system/status
        const baseURL = serviceConfig.url.replace(/\/$/, '');
        response = await fetch(`${baseURL}/api/v1/system/status`, {
          method: 'GET',
          headers: {
            'X-Api-Key': serviceConfig.apiKey,
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Radarr/Sonarr use /system/status
        response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: serviceConfig.url,
            apiKey: serviceConfig.apiKey,
            endpoint: '/system/status',
          }),
        });
      }

      if (response.ok) {
        setTestResults(prev => ({ ...prev, [service]: true }));
      } else {
        setTestResults(prev => ({ ...prev, [service]: false }));
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [service]: false }));
    } finally {
      setTesting(prev => ({ ...prev, [service]: false }));
    }
  };

  const handleSave = () => {
    saveConfig(config);
    // Reload service status after saving
    loadServiceStatus(config);
    alert('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Settings
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Sonarr Configuration */}
          <div className="mb-8 p-6 border-2 border-sonarr rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-sonarr">Sonarr</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sonarr?.enabled ?? false}
                    onChange={(e) => {
                      updateServiceConfig('sonarr', { enabled: e.target.checked });
                      if (e.target.checked) {
                        setTimeout(() => loadServiceStatus({ ...config, sonarr: { ...config.sonarr, enabled: true } }), 100);
                      } else {
                        setSonarrStatus(null);
                      }
                    }}
                    className="w-4 h-4 text-sonarr border-gray-300 rounded focus:ring-sonarr"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Enable</span>
                </label>
              </div>
              {config.sonarr?.url && config.sonarr?.apiKey && (
                <button
                  onClick={() => testConnection('sonarr')}
                  disabled={testing.sonarr}
                  className="px-4 py-2 bg-sonarr text-white rounded hover:bg-blue-400 disabled:opacity-50"
                >
                  {testing.sonarr ? 'Testing...' : 'Test Connection'}
                </button>
              )}
            </div>
            {testResults.sonarr === true && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                ✓ Connection successful!
              </div>
            )}
            {testResults.sonarr === false && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                ✗ Connection failed. Please check your URL and API key.
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sonarr URL
                </label>
                <input
                  type="text"
                  value={config.sonarr?.url || ''}
                  onChange={(e) => updateServiceConfig('sonarr', { url: e.target.value })}
                  placeholder="http://localhost:8989"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sonarr focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.sonarr?.apiKey || ''}
                  onChange={(e) => updateServiceConfig('sonarr', { apiKey: e.target.value })}
                  placeholder="Your Sonarr API key"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-sonarr focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            {/* Sonarr Status Card */}
            {config.sonarr?.enabled && (sonarrStatus || statusError.sonarr) && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Status</h3>
                  {sonarrStatus ? (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                      Connected
                    </span>
                  ) : statusError.sonarr ? (
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
                ) : statusError.sonarr ? (
                  <p className="text-red-600 dark:text-red-400">{statusError.sonarr}</p>
                ) : (
                  <p className="text-gray-500">Loading status...</p>
                )}
              </div>
            )}
          </div>

          {/* Radarr Configuration */}
          <div className="mb-8 p-6 border-2 border-radarr rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-radarr">Radarr</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.radarr?.enabled ?? false}
                    onChange={(e) => {
                      updateServiceConfig('radarr', { enabled: e.target.checked });
                      if (e.target.checked) {
                        setTimeout(() => loadServiceStatus({ ...config, radarr: { ...config.radarr, enabled: true } }), 100);
                      } else {
                        setRadarrStatus(null);
                      }
                    }}
                    className="w-4 h-4 text-radarr border-gray-300 rounded focus:ring-radarr"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Enable</span>
                </label>
              </div>
              {config.radarr?.url && config.radarr?.apiKey && (
                <button
                  onClick={() => testConnection('radarr')}
                  disabled={testing.radarr}
                  className="px-4 py-2 bg-radarr text-white rounded hover:bg-orange-400 disabled:opacity-50"
                >
                  {testing.radarr ? 'Testing...' : 'Test Connection'}
                </button>
              )}
            </div>
            {testResults.radarr === true && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                ✓ Connection successful!
              </div>
            )}
            {testResults.radarr === false && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                ✗ Connection failed. Please check your URL and API key.
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Radarr URL
                </label>
                <input
                  type="text"
                  value={config.radarr?.url || ''}
                  onChange={(e) => updateServiceConfig('radarr', { url: e.target.value })}
                  placeholder="http://localhost:7878"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-radarr focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.radarr?.apiKey || ''}
                  onChange={(e) => updateServiceConfig('radarr', { apiKey: e.target.value })}
                  placeholder="Your Radarr API key"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-radarr focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            {/* Radarr Status Card */}
            {config.radarr?.enabled && (radarrStatus || statusError.radarr) && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Status</h3>
                  {radarrStatus ? (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                      Connected
                    </span>
                  ) : statusError.radarr ? (
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
                ) : statusError.radarr ? (
                  <p className="text-red-600 dark:text-red-400">{statusError.radarr}</p>
                ) : (
                  <p className="text-gray-500">Loading status...</p>
                )}
              </div>
            )}
          </div>

          {/* Prowlarr Configuration */}
          <div className="mb-8 p-6 border-2 border-green-500 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400">Prowlarr</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.prowlarr?.enabled ?? false}
                    onChange={(e) => updateServiceConfig('prowlarr', { enabled: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Enable</span>
                </label>
              </div>
              {config.prowlarr?.url && config.prowlarr?.apiKey && (
                <button
                  onClick={() => testConnection('prowlarr')}
                  disabled={testing.prowlarr}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {testing.prowlarr ? 'Testing...' : 'Test Connection'}
                </button>
              )}
            </div>
            {testResults.prowlarr === true && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                ✓ Connection successful!
              </div>
            )}
            {testResults.prowlarr === false && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                ✗ Connection failed. Please check your URL and API key.
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prowlarr URL
                </label>
                <input
                  type="text"
                  value={config.prowlarr?.url || ''}
                  onChange={(e) => updateServiceConfig('prowlarr', { url: e.target.value })}
                  placeholder="http://localhost:9696"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.prowlarr?.apiKey || ''}
                  onChange={(e) => updateServiceConfig('prowlarr', { apiKey: e.target.value })}
                  placeholder="Your Prowlarr API key"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Prowlarr will be used for manual torrent searches if configured
                </p>
              </div>
            </div>
          </div>

          {/* TMDB Configuration */}
          <div className="mb-8 p-6 border-2 border-purple-500 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-purple-600 dark:text-purple-400">TMDB</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  TMDB API Key
                </label>
                <input
                  type="password"
                  value={config.tmdb?.apiKey || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    tmdb: { apiKey: e.target.value }
                  }))}
                  placeholder="Your TMDB API key (get it from https://www.themoviedb.org/settings/api)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Required for combined movie and TV show search
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

