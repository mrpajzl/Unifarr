export const useApi = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const apiFetch = <T>(url: string, options?: any) => {
    // Get token from localStorage (client-side only)
    const token = typeof window !== 'undefined' ? localStorage.getItem('unifarr_token') : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return $fetch<T>(`${apiBase}${url}`, {
      ...options,
      headers,
    })
  }

  return {
    // Media endpoints
    media: {
      getAll: () => apiFetch<MediaItem[]>('/api/media'),
      getById: (id: number) => apiFetch<MediaItem>(`/api/media/${id}`),
      create: (data: { tmdbId: number; type: MediaType }) => 
        apiFetch<MediaItem>('/api/media', { method: 'POST', body: data }),
      match: (mediaId: number, fileId: number, confidence?: number) =>
        apiFetch(`/api/media/${mediaId}/match`, { 
          method: 'POST', 
          body: { fileId, confidence } 
        }),
      delete: (id: number) => apiFetch(`/api/media/${id}`, { method: 'DELETE' }),
      autoMatch: (fileId: number) => 
        apiFetch<{ success: boolean; message: string }>(`/api/media/auto-match/${fileId}`, { method: 'POST' }),
      autoMatchAll: () => 
        apiFetch<{ success: boolean; matched: number; skipped: number; message: string }>('/api/media/auto-match-all', { method: 'POST' }),
      getEpisodes: (id: number) =>
        apiFetch<{ mediaId: number; tmdbId: number; title: string; seasons: any[] }>(`/api/media/${id}/episodes/matched`),
      
      // Bulk operations
      bulkRefreshMetadata: (ids: number[]) =>
        apiFetch<{ message: string; results: { success: number[]; failed: { id: number; error: string }[] } }>('/api/media/bulk/refresh-metadata', {
          method: 'POST',
          body: { ids }
        }),
      bulkAutoMatch: (ids: number[]) =>
        apiFetch<{ message: string; results: { success: number[]; failed: { id: number; error: string }[] } }>('/api/media/bulk/auto-match', {
          method: 'POST',
          body: { ids }
        }),
      bulkRename: (ids: number[], pattern: string) =>
        apiFetch<{ message: string; pattern: string; ids: number[] }>('/api/media/bulk/rename', {
          method: 'POST',
          body: { ids, pattern }
        }),
      bulkDelete: (ids: number[]) =>
        apiFetch<{ message: string; results: { success: number[]; failed: { id: number; error: string }[] } }>('/api/media/bulk/delete', {
          method: 'POST',
          body: { ids }
        }),
    },

    // Files endpoints
    files: {
      getAll: () => apiFetch<MediaFile[]>('/api/files'),
      getUnmatched: () => apiFetch<MediaFile[]>('/api/files/unmatched'),
      getById: (id: number) => apiFetch<MediaFile>(`/api/files/${id}`),
      scan: (path: string, type?: 'movies' | 'tv') => 
        apiFetch('/api/files/scan', { method: 'POST', body: { path, type } }),
      delete: (id: number) => apiFetch(`/api/files/${id}`, { method: 'DELETE' }),
    },

    // Search endpoints
    search: {
      tmdbMovie: (query: string) => 
        apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/movie?query=${encodeURIComponent(query)}`),
      tmdbTV: (query: string) => 
        apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/tv?query=${encodeURIComponent(query)}`),
      // Convenience methods
      movies: async (query: string): Promise<TMDBSearchResult[]> => {
        const data = await apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/movie?query=${encodeURIComponent(query)}`);
        return data.results.map(r => ({ ...r, media_type: 'movie' as const }));
      },
      tv: async (query: string): Promise<TMDBSearchResult[]> => {
        const data = await apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/tv?query=${encodeURIComponent(query)}`);
        return data.results.map(r => ({ ...r, media_type: 'tv' as const }));
      },
      multi: async (query: string): Promise<TMDBSearchResult[]> => {
        const [movies, tv] = await Promise.all([
          apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/movie?query=${encodeURIComponent(query)}`).then(d => d.results.map(r => ({ ...r, media_type: 'movie' as const }))),
          apiFetch<{ results: TMDBSearchResult[] }>(`/api/search/tmdb/tv?query=${encodeURIComponent(query)}`).then(d => d.results.map(r => ({ ...r, media_type: 'tv' as const }))),
        ]);
        return [...movies, ...tv].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      },
    },

    // Providers/Torrent endpoints (legacy)
    providers: {
      search: async (query: string, type: MediaType) => {
        const data = await apiFetch<{ results: TorrentResult[]; query: string; provider_count: number }>(`/api/providers/search?query=${encodeURIComponent(query)}&type=${type}`);
        return data;
      },
    },

    // Trackers endpoints
    trackers: {
      getAll: () => apiFetch<{ trackers: any[] }>('/api/trackers'),
      getConfigured: () => apiFetch<{ trackers: any[] }>('/api/trackers/configured'),
      test: (trackerId: string, credentials?: any) =>
        apiFetch<{ success: boolean; message?: string; error?: string }>(`/api/trackers/${trackerId}/test`, {
          method: 'POST',
          body: credentials ? { credentials } : undefined,
        }),
      search: async (query: string, type?: 'movie' | 'tv' | 'music', limit?: number) => {
        const data = await apiFetch<{ query: string; results: any[]; total: number }>('/api/trackers/search', {
          method: 'POST',
          body: { query, type, limit },
        });
        return data;
      },
      searchTracker: async (trackerId: string, query: string, type?: 'movie' | 'tv' | 'music') => {
        const data = await apiFetch<{ tracker: string; query: string; results: any[]; total: number }>(`/api/trackers/${trackerId}/search`, {
          method: 'POST',
          body: { query, type },
        });
        return data;
      },
      searchUnified: async (query: string, type?: 'movie' | 'tv', year?: number, limit?: number) => {
        const data = await apiFetch<{ 
          query: string; 
          results: any[]; 
          total: number; 
          rawTotal: number;
          providers: string[];
        }>('/api/search/unified', {
          method: 'POST',
          body: { query, type, year, limit },
        });
        return data;
      },
    },

    // Downloads endpoints
    downloads: {
      getAll: () => apiFetch<{ downloads: Download[] }>('/api/downloads'),
      getActive: () => apiFetch<{ downloads: Download[] }>('/api/downloads/active'),
      add: (magnetUrl: string, mediaId?: number, savePath?: string) =>
        apiFetch('/api/downloads', { 
          method: 'POST', 
          body: { magnetUrl, mediaId, savePath } 
        }),
      get: (hash: string) => apiFetch(`/api/downloads/${hash}`),
      pause: (hash: string) => 
        apiFetch(`/api/downloads/${hash}`, { 
          method: 'PATCH', 
          body: { action: 'pause' } 
        }),
      resume: (hash: string) => 
        apiFetch(`/api/downloads/${hash}`, { 
          method: 'PATCH', 
          body: { action: 'resume' } 
        }),
      delete: (hash: string, deleteFiles = false) =>
        apiFetch(`/api/downloads/${hash}?deleteFiles=${deleteFiles}`, { method: 'DELETE' }),
      sync: () => apiFetch('/api/downloads/sync', { method: 'POST' }),
      test: () => apiFetch('/api/downloads/test', { method: 'POST' }),
    },

    // Webshare endpoints
    webshare: {
      test: () => apiFetch<{ success: boolean; message?: string; error?: string }>('/api/webshare/test', { method: 'POST' }),
      search: (query: string, auto = false) => 
        apiFetch<{ files: any[]; total: number; bestFile: any | null }>(`/api/webshare/search?query=${encodeURIComponent(query)}&auto=${auto}`),
      getDownloadLink: (ident: string) =>
        apiFetch<{ link: string; ident: string }>('/api/webshare/download-link', { method: 'POST', body: { ident } }),
      download: (ident: string, filename: string, mediaId?: number, targetPath?: string) =>
        apiFetch<{ success: boolean; downloadId: string; message: string }>('/api/webshare/download', { 
          method: 'POST', 
          body: { ident, filename, mediaId, targetPath } 
        }),
    },

    // Discover endpoints
    discover: {
      trending: (mediaType: 'movie' | 'tv' | 'all', timeWindow: 'day' | 'week', page = 1) =>
        apiFetch<{ results: TMDBSearchResult[]; page: number; total_pages: number }>(
          `/api/discover/trending/${mediaType}/${timeWindow}?page=${page}`
        ),
      popular: (type: 'movies' | 'tv', page = 1) =>
        apiFetch<{ results: TMDBSearchResult[]; page: number; total_pages: number }>(
          `/api/discover/popular/${type}?page=${page}`
        ),
      topRated: (type: 'movies' | 'tv', page = 1) =>
        apiFetch<{ results: TMDBSearchResult[]; page: number; total_pages: number }>(
          `/api/discover/top-rated/${type}?page=${page}`
        ),
      nowPlaying: (page = 1) =>
        apiFetch<{ results: TMDBSearchResult[]; page: number; total_pages: number }>(
          `/api/discover/now-playing?page=${page}`
        ),
      upcoming: (page = 1) =>
        apiFetch<{ results: TMDBSearchResult[]; page: number; total_pages: number }>(
          `/api/discover/upcoming?page=${page}`
        ),
      details: (mediaType: 'movie' | 'tv', id: number) =>
        apiFetch<any>(`/api/discover/details/${mediaType}/${id}`),
      person: (id: number) =>
        apiFetch<any>(`/api/discover/person/${id}`),
    },

    // Activities endpoints
    activities: {
      getAll: () => apiFetch<{ activities: Activity[] }>('/api/activities'),
      getActive: () => apiFetch<{ activities: Activity[] }>('/api/activities/active'),
      getRecent: (limit = 10) => apiFetch<{ activities: Activity[] }>(`/api/activities/recent?limit=${limit}`),
      get: (id: string) => apiFetch<Activity>(`/api/activities/${id}`),
      clear: () => apiFetch('/api/activities', { method: 'DELETE' }),
    },
  }
}
