import { AppConfig } from '@/types';

export async function getConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) {
      return {};
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching config:', error);
    return {};
  }
}

export async function saveConfig(config: AppConfig): Promise<boolean> {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.ok;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

export async function hasConfig(): Promise<boolean> {
  const config = await getConfig();
  return !!(config.sonarr?.apiKey && config.sonarr?.url) || 
         !!(config.radarr?.apiKey && config.radarr?.url);
}

