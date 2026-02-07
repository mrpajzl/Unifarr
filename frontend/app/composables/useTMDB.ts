/**
 * TMDB helper composable for working with TMDB images and data
 */
export const useTMDB = () => {

  /**
   * Get TMDB poster image URL
   */
  const getPosterUrl = (path?: string | null, size: 'w200' | 'w500' | 'w780' | 'original' = 'w500'): string => {
    if (!path) return '/placeholder-poster.png';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  /**
   * Get TMDB backdrop image URL
   */
  const getBackdropUrl = (path?: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280'): string => {
    if (!path) return '/placeholder-backdrop.png';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  /**
   * Format runtime in minutes to human readable (e.g. "2h 15m")
   */
  const formatRuntime = (minutes?: number | null): string => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  /**
   * Format date string (ISO) to locale date
   */
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  /**
   * Parse genres JSON to array of genre names
   */
  const parseGenres = (genresJson?: string | null): string[] => {
    if (!genresJson) return [];
    try {
      const parsed = JSON.parse(genresJson);
      return Array.isArray(parsed) ? parsed.map((g: any) => g.name || g) : [];
    } catch {
      return [];
    }
  };

  /**
   * Get TMDB image URL (supports both poster and backdrop sizes)
   */
  const getTMDBImageUrl = (path?: string | null, size: 'w200' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'): string => {
    if (!path) return '/placeholder-poster.png';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  return {
    getPosterUrl,
    getBackdropUrl,
    formatRuntime,
    formatDate,
    parseGenres,
    getTMDBImageUrl,
  };
};
