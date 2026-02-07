export interface MediaRequest {
  id: number;
  userId: number;
  username?: string;
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  year?: number;
  posterPath?: string;
  status: 'pending' | 'approved' | 'denied' | 'downloaded';
  userNote?: string;
  adminNote?: string;
  requestedAt: string;
  processedAt?: string;
  mediaItemId?: number;
}

export const useRequests = () => {
  const config = useRuntimeConfig();
  const { token } = useAuth();

  const getHeaders = () => ({
    Authorization: `Bearer ${token.value}`,
    'Content-Type': 'application/json',
  });

  // List requests
  const list = async (): Promise<MediaRequest[]> => {
    try {
      const response = await $fetch<{ requests: MediaRequest[] }>(
        `${config.public.apiBase}/api/requests`,
        {
          headers: getHeaders(),
        }
      );
      return response.requests;
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      throw error;
    }
  };

  // Create request
  const create = async (data: {
    tmdbId: number;
    type: 'movie' | 'tv';
    title: string;
    year?: number;
    posterPath?: string;
    userNote?: string;
  }): Promise<MediaRequest> => {
    try {
      const response = await $fetch<{ request: MediaRequest }>(
        `${config.public.apiBase}/api/requests`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: data,
        }
      );
      return response.request;
    } catch (error) {
      console.error('Failed to create request:', error);
      throw error;
    }
  };

  // Approve request (admin only)
  const approve = async (id: number, adminNote?: string): Promise<MediaRequest> => {
    try {
      const response = await $fetch<{ request: MediaRequest }>(
        `${config.public.apiBase}/api/requests/${id}/approve`,
        {
          method: 'PATCH',
          headers: getHeaders(),
          body: { adminNote },
        }
      );
      return response.request;
    } catch (error) {
      console.error('Failed to approve request:', error);
      throw error;
    }
  };

  // Deny request (admin only)
  const deny = async (id: number, adminNote?: string): Promise<MediaRequest> => {
    try {
      const response = await $fetch<{ request: MediaRequest }>(
        `${config.public.apiBase}/api/requests/${id}/deny`,
        {
          method: 'PATCH',
          headers: getHeaders(),
          body: { adminNote },
        }
      );
      return response.request;
    } catch (error) {
      console.error('Failed to deny request:', error);
      throw error;
    }
  };

  // Delete request
  const remove = async (id: number): Promise<void> => {
    try {
      await $fetch(`${config.public.apiBase}/api/requests/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
    } catch (error) {
      console.error('Failed to delete request:', error);
      throw error;
    }
  };

  return {
    list,
    create,
    approve,
    deny,
    remove,
  };
};
