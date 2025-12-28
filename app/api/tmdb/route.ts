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

    // Handle external IDs lookup (for TVDB ID conversion)
    if (tmdbId && type && apiKey) {
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

