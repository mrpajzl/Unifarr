'use client';

import { useEffect, useState } from 'react';
import { getConfig } from '@/lib/config';
import { AppConfig } from '@/types';
import Navigation from '@/components/Navigation';
import MediaDiscovery from '@/components/MediaDiscovery';

export default function DashboardPage() {
  const [config, setConfig] = useState<AppConfig>({});

  useEffect(() => {
    const loadConfig = async () => {
      const saved = await getConfig();
      setConfig(saved);
    };
    loadConfig();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Discover New Media
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore trending, popular, and top-rated movies and TV shows from TMDB
          </p>
        </div>

        <MediaDiscovery />
      </div>
    </div>
  );
}

