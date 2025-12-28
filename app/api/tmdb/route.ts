import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const apiKey = searchParams.get('apiKey');
    const tmdbId = searchParams.get('tmdbId');
    const type = searchParams.get('type'); // 'movie' or 'tv'
    const listType = searchParams.get('listType'); // 'trending', 'popular', 'top_rated', 'now_playing', 'upcoming'
    const mediaType = searchParams.get('mediaType'); // 'movie' or 'tv' (for lists)
    const details = searchParams.get('details'); // 'true' to fetch full details

    // Handle media details fetch
    if (tmdbId && type && apiKey && details === 'true') {
      const detailsResponse = await axios.get(
        `${TMDB_BASE_URL}/${type}/${tmdbId}`,
        {
          params: {
            api_key: apiKey,
            language: 'en-US',
          },
        }
      );

      const data = detailsResponse.data;
      return NextResponse.json({
        ...data,
        media_type: type,
        title: type === 'movie' ? data.title : data.name,
      });
    }

    // Handle external IDs lookup (for TVDB ID conversion) - only if details is not requested
    if (tmdbId && type && apiKey && details !== 'true') {
      const externalIdsResponse = await axios.get(
        `${TMDB_BASE_URL}/${type}/${tmdbId}/external_ids`,
        {
          params: {
            api_key: apiKey,
          },
        }
      );

      return NextResponse.json(externalIdsResponse.data);
    }

    // Handle list requests (trending, popular, top_rated, etc.)
    if (listType && apiKey && mediaType) {
      let endpoint = '';
      
      if (listType === 'trending') {
        endpoint = `${TMDB_BASE_URL}/trending/${mediaType}/day`;
      } else if (listType === 'popular') {
        endpoint = `${TMDB_BASE_URL}/${mediaType}/popular`;
      } else if (listType === 'top_rated') {
        endpoint = `${TMDB_BASE_URL}/${mediaType}/top_rated`;
      } else if (listType === 'now_playing' && mediaType === 'movie') {
        endpoint = `${TMDB_BASE_URL}/movie/now_playing`;
      } else if (listType === 'upcoming' && mediaType === 'movie') {
        endpoint = `${TMDB_BASE_URL}/movie/upcoming`;
      } else if (listType === 'on_the_air' && mediaType === 'tv') {
        endpoint = `${TMDB_BASE_URL}/tv/on_the_air`;
      } else if (listType === 'airing_today' && mediaType === 'tv') {
        endpoint = `${TMDB_BASE_URL}/tv/airing_today`;
      } else {
        return NextResponse.json(
          { error: `Invalid listType: ${listType} for mediaType: ${mediaType}` },
          { status: 400 }
        );
      }

      const response = await axios.get(endpoint, {
        params: {
          api_key: apiKey,
          language: 'en-US',
          page: searchParams.get('page') || 1,
        },
      });

      const results = response.data.results.map((item: any) => ({
        ...item,
        media_type: mediaType,
        title: mediaType === 'tv' ? item.name : item.title,
      }));

      return NextResponse.json({
        results,
        page: response.data.page,
        total_pages: response.data.total_pages,
        total_results: response.data.total_results,
      });
    }

    if (!query || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: query and apiKey' },
        { status: 400 }
      );
    }

    // Search both movies and TV shows
    const [moviesResponse, tvResponse] = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/search/movie`, {
        params: {
          api_key: apiKey,
          query: query,
          language: 'en-US',
        },
      }),
      axios.get(`${TMDB_BASE_URL}/search/tv`, {
        params: {
          api_key: apiKey,
          query: query,
          language: 'en-US',
        },
      }),
    ]);

    // Combine results
    const movies = moviesResponse.data.results.map((movie: any) => ({
      ...movie,
      media_type: 'movie',
    }));

    const tvShows = tvResponse.data.results.map((tv: any) => ({
      ...tv,
      media_type: 'tv',
      title: tv.name, // Normalize to title for easier handling
    }));

    const combinedResults = [...movies, ...tvShows];

    return NextResponse.json({
      results: combinedResults,
      total_results: combinedResults.length,
    });
  } catch (error: any) {
    console.error('TMDB API error:', error);
    return NextResponse.json(
      {
        error: error.response?.data?.status_message || error.message || 'TMDB API request failed',
        status: error.response?.status || 500,
      },
      { status: error.response?.status || 500 }
    );
  }
}

