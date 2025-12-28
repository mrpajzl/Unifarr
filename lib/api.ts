import axios, { AxiosInstance } from 'axios';
import { ServiceConfig } from '@/types';

function createApiClient(config: ServiceConfig): AxiosInstance {
  const baseURL = config.url.replace(/\/$/, '');
  
  return axios.create({
    baseURL: `${baseURL}/api/v3`,
    headers: {
      'X-Api-Key': config.apiKey,
      'Content-Type': 'application/json',
    },
  });
}

// Sonarr API functions
export const sonarrApi = {
  async getSystemStatus(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/system/status');
  },

  async getSeries(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/series');
  },

  async getSeriesById(config: ServiceConfig, id: number) {
    const client = createApiClient(config);
    return client.get(`/series/${id}`);
  },

  async addSeries(config: ServiceConfig, series: any) {
    const client = createApiClient(config);
    return client.post('/series', series);
  },

  async updateSeries(config: ServiceConfig, series: any) {
    const client = createApiClient(config);
    return client.put(`/series/${series.id}`, series);
  },

  async deleteSeries(config: ServiceConfig, id: number, deleteFiles = false) {
    const client = createApiClient(config);
    return client.delete(`/series/${id}`, { params: { deleteFiles } });
  },

  async getQualityProfiles(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/qualityProfile');
  },

  async getRootFolders(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/rootFolder');
  },

  async getLanguageProfiles(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/languageProfile');
  },

  async lookupSeries(config: ServiceConfig, term: string) {
    const client = createApiClient(config);
    return client.get('/series/lookup', { params: { term } });
  },

  async getConfig(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/config');
  },

  async updateConfig(config: ServiceConfig, configData: any) {
    const client = createApiClient(config);
    return client.put('/config', configData);
  },

  async getDownloadClients(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/downloadclient');
  },

  async getIndexers(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/indexer');
  },

  async getNotifications(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/notification');
  },

  async getTags(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/tag');
  },

  async getQueue(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/queue');
  },

  async getHistory(config: ServiceConfig, page = 1, pageSize = 20) {
    const client = createApiClient(config);
    return client.get('/history', { params: { page, pageSize } });
  },

  async getCalendar(config: ServiceConfig, start?: string, end?: string) {
    const client = createApiClient(config);
    return client.get('/calendar', { params: { start, end } });
  },

  async getWantedMissing(config: ServiceConfig, page = 1, pageSize = 20) {
    const client = createApiClient(config);
    return client.get('/wanted/missing', { params: { page, pageSize } });
  },

  async getWantedCutoffUnmet(config: ServiceConfig, page = 1, pageSize = 20) {
    const client = createApiClient(config);
    return client.get('/wanted/cutoffunmet', { params: { page, pageSize } });
  },

  async getEpisodes(config: ServiceConfig, seriesId: number) {
    const client = createApiClient(config);
    return client.get('/episode', { params: { seriesId } });
  },

  async getEpisodeById(config: ServiceConfig, id: number) {
    const client = createApiClient(config);
    return client.get(`/episode/${id}`);
  },

  async searchReleases(config: ServiceConfig, episodeId: number) {
    const client = createApiClient(config);
    return client.get('/release', { params: { episodeId } });
  },

  async grabRelease(config: ServiceConfig, guid: string, indexerId: number) {
    const client = createApiClient(config);
    return client.post('/release', { guid, indexerId });
  },

  async command(config: ServiceConfig, name: string, body?: any) {
    const client = createApiClient(config);
    return client.post('/command', { name, ...body });
  },
};

// Radarr API functions
export const radarrApi = {
  async getSystemStatus(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/system/status');
  },

  async getMovies(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/movie');
  },

  async getMovieById(config: ServiceConfig, id: number) {
    const client = createApiClient(config);
    return client.get(`/movie/${id}`);
  },

  async addMovie(config: ServiceConfig, movie: any) {
    const client = createApiClient(config);
    return client.post('/movie', movie);
  },

  async updateMovie(config: ServiceConfig, movie: any) {
    const client = createApiClient(config);
    return client.put(`/movie/${movie.id}`, movie);
  },

  async deleteMovie(config: ServiceConfig, id: number, deleteFiles = false) {
    const client = createApiClient(config);
    return client.delete(`/movie/${id}`, { params: { deleteFiles } });
  },

  async getQualityProfiles(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/qualityProfile');
  },

  async getRootFolders(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/rootFolder');
  },

  async lookupMovie(config: ServiceConfig, term: string) {
    const client = createApiClient(config);
    return client.get('/movie/lookup', { params: { term } });
  },

  async getConfig(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/config');
  },

  async updateConfig(config: ServiceConfig, configData: any) {
    const client = createApiClient(config);
    return client.put('/config', configData);
  },

  async getDownloadClients(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/downloadclient');
  },

  async getIndexers(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/indexer');
  },

  async getNotifications(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/notification');
  },

  async getTags(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/tag');
  },

  async getQueue(config: ServiceConfig) {
    const client = createApiClient(config);
    return client.get('/queue');
  },

  async getHistory(config: ServiceConfig, page = 1, pageSize = 20) {
    const client = createApiClient(config);
    return client.get('/history', { params: { page, pageSize } });
  },

  async getCalendar(config: ServiceConfig, start?: string, end?: string) {
    const client = createApiClient(config);
    return client.get('/calendar', { params: { start, end } });
  },

  async getWantedMissing(config: ServiceConfig, page = 1, pageSize = 20) {
    const client = createApiClient(config);
    return client.get('/wanted/missing', { params: { page, pageSize } });
  },

  async getWantedCutoffUnmet(config: ServiceConfig, page = 1, pageSize = 20) {
    const client = createApiClient(config);
    return client.get('/wanted/cutoffunmet', { params: { page, pageSize } });
  },

  async getReleases(config: ServiceConfig, movieId: number) {
    const client = createApiClient(config);
    return client.get('/release', { params: { movieId } });
  },

  async searchReleases(config: ServiceConfig, query: string) {
    const client = createApiClient(config);
    return client.get('/release', { params: { query } });
  },

  async grabRelease(config: ServiceConfig, guid: string, indexerId: number) {
    const client = createApiClient(config);
    return client.post('/release', { guid, indexerId });
  },

  async command(config: ServiceConfig, name: string, body?: any) {
    const client = createApiClient(config);
    return client.post('/command', { name, ...body });
  },
};

