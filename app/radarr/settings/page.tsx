'use client';

import { useEffect, useState } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig } from '@/types';
import Navigation from '@/components/Navigation';

export default function RadarrSettingsPage() {
  const [config, setConfig] = useState<AppConfig>({});
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [qualityProfiles, setQualityProfiles] = useState<any[]>([]);
  const [rootFolders, setRootFolders] = useState<any[]>([]);
  const [downloadClients, setDownloadClients] = useState<any[]>([]);
  const [indexers, setIndexers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const loadConfigAsync = async () => {
      const saved = await getConfig();
      setConfig(saved);
      if (saved.radarr?.enabled) {
        loadAllSettings(saved);
      } else {
        setLoading(false);
      }
    };
    loadConfigAsync();
  }, []);

  const loadAllSettings = async (cfg: AppConfig) => {
    if (!cfg.radarr?.url || !cfg.radarr?.apiKey) {
      setLoading(false);
      return;
    }

    try {
      const [configRes, qualityRes, rootRes, downloadRes, indexerRes, notificationRes, tagRes] = await Promise.all([
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/config',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/qualityProfile',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/rootFolder',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/downloadclient',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/indexer',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/notification',
          }),
        }),
        fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cfg.radarr.url,
            apiKey: cfg.radarr.apiKey,
            endpoint: '/tag',
          }),
        }),
      ]);

      if (configRes.ok) setSystemConfig(await configRes.json());
      if (qualityRes.ok) setQualityProfiles(await qualityRes.json());
      if (rootRes.ok) setRootFolders(await rootRes.json());
      if (downloadRes.ok) setDownloadClients(await downloadRes.json());
      if (indexerRes.ok) setIndexers(await indexerRes.json());
      if (notificationRes.ok) setNotifications(await notificationRes.json());
      if (tagRes.ok) setTags(await tagRes.json());
    } catch (err) {
      console.error('Error loading settings:', err);
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

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'quality', label: 'Quality Profiles' },
    { id: 'folders', label: 'Root Folders' },
    { id: 'download', label: 'Download Clients' },
    { id: 'indexers', label: 'Indexers' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'tags', label: 'Tags' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Radarr Settings
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === tab.id
                        ? 'border-radarr text-radarr'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'general' && systemConfig && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">General Configuration</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(systemConfig).map(([key, value]) => (
                      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {key}
                        </label>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'quality' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quality Profiles</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Upgrade Allowed</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cutoff</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {qualityProfiles.map((profile) => (
                          <tr key={profile.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{profile.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{profile.upgradeAllowed ? 'Yes' : 'No'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{profile.cutoff?.name || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'folders' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Root Folders</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rootFolders.map((folder) => (
                      <div key={folder.id} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                        <div className="font-medium text-gray-900 dark:text-white">{folder.path}</div>
                        {folder.freeSpace !== undefined && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Free: {Math.round(folder.freeSpace / 1024 / 1024 / 1024)} GB
                            {folder.totalSpace && ` / Total: ${Math.round(folder.totalSpace / 1024 / 1024 / 1024)} GB`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'download' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Download Clients</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Enabled</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {downloadClients.map((client) => (
                          <tr key={client.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{client.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{client.implementation}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{client.enable ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'indexers' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Indexers</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Enabled</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {indexers.map((indexer) => (
                          <tr key={indexer.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{indexer.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{indexer.implementation}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{indexer.enable ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Enabled</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {notifications.map((notification) => (
                          <tr key={notification.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{notification.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{notification.implementation}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{notification.onGrab ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'tags' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 bg-radarr text-white rounded-full text-sm"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

