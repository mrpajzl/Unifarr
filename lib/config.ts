import { AppConfig } from '@/types';

const CONFIG_KEY = 'unifarr_config';

export function getConfig(): AppConfig {
  if (typeof window === 'undefined') {
    return {};
  }
  
  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) {
    return {};
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function saveConfig(config: AppConfig): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function hasConfig(): boolean {
  const config = getConfig();
  return !!(config.sonarr?.apiKey && config.sonarr?.url) || 
         !!(config.radarr?.apiKey && config.radarr?.url);
}

