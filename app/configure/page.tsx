'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getConfig, saveConfig, hasConfig } from '@/lib/config';
import { AppConfig, ServiceConfig } from '@/types';

export default function ConfigurePage() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig>({});
  const [testing, setTesting] = useState<{ sonarr?: boolean; radarr?: boolean }>({});
  const [testResults, setTestResults] = useState<{ sonarr?: boolean; radarr?: boolean }>({});

  useEffect(() => {
    const loadConfig = async () => {
      const saved = await getConfig();
      setConfig(saved);
    };
    loadConfig();
  }, []);

  const updateServiceConfig = (service: 'sonarr' | 'radarr', updates: Partial<ServiceConfig>) => {
    setConfig(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        ...updates,
        enabled: prev[service]?.enabled ?? true,
      },
    }));
  };

  const testConnection = async (service: 'sonarr' | 'radarr') => {
    const serviceConfig = config[service];
    if (!serviceConfig?.url || !serviceConfig?.apiKey) {
      alert(`Please enter ${service} URL and API key first`);
      return;
    }

    setTesting(prev => ({ ...prev, [service]: true }));
    setTestResults(prev => ({ ...prev, [service]: undefined }));

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: serviceConfig.url,
          apiKey: serviceConfig.apiKey,
          endpoint: '/system/status',
        }),
      });

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

  const handleSave = async () => {
    const success = await saveConfig(config);
    if (success) {
      router.push('/dashboard');
    } else {
      alert('Failed to save configuration. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            Configure Unifarr
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Enter your Sonarr and/or Radarr API keys and URLs to get started.
          </p>

          {/* Sonarr Configuration */}
          <div className="mb-8 p-6 border-2 border-sonarr rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-sonarr">Sonarr</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sonarr?.enabled ?? false}
                    onChange={(e) => updateServiceConfig('sonarr', { enabled: e.target.checked })}
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
                    onChange={(e) => updateServiceConfig('radarr', { enabled: e.target.checked })}
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
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={!config.sonarr?.enabled && !config.radarr?.enabled}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

