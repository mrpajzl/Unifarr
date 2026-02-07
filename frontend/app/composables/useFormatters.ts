export const useFormatters = () => {
  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond?: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatTime = (seconds?: number): string => {
    if (!seconds || seconds < 0) return '--';
    if (seconds === Infinity) return '∞';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatProgress = (progress?: number): string => {
    if (!progress) return '0%';
    return `${(progress * 100).toFixed(1)}%`;
  };

  const getTMDBImageUrl = (path?: string, size: 'w200' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'): string => {
    if (!path) return '/placeholder-poster.png';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const parseGenres = (genresJson?: string): string[] => {
    if (!genresJson) return [];
    try {
      const parsed = JSON.parse(genresJson);
      return Array.isArray(parsed) ? parsed.map((g: any) => g.name || g) : [];
    } catch {
      return [];
    }
  };

  return {
    formatBytes,
    formatSpeed,
    formatTime,
    formatProgress,
    getTMDBImageUrl,
    formatDate,
    formatRelativeTime,
    parseGenres,
  };
};
