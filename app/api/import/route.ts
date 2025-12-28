import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Helper function to extract movie name from folder path
function extractMovieName(folderPath: string): string {
  // Get the folder name (last part of the path)
  const folderName = folderPath.split(/[/\\]/).pop() || folderPath;
  
  // Remove common patterns like year in parentheses, quality indicators, etc.
  // Examples: "Movie Name (2023) [1080p]", "Movie Name 2023", etc.
  let cleaned = folderName
    .replace(/\s*\(\d{4}\)\s*/g, '') // Remove (2023)
    .replace(/\s*\d{4}\s*/g, '') // Remove standalone year
    .replace(/\s*\[.*?\]\s*/g, '') // Remove [1080p], [BluRay], etc.
    .replace(/\s*\{.*?\}\s*/g, '') // Remove {group}
    .replace(/\s*-\s*.*$/, '') // Remove everything after last dash
    .trim();
  
  return cleaned || folderName;
}

// Helper function to search TMDB for a movie or TV show
async function searchTMDB(query: string, apiKey: string, mediaType: 'movie' | 'tv' = 'movie'): Promise<any[]> {
  try {
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const response = await axios.get(`${TMDB_BASE_URL}/search/${endpoint}`, {
      params: {
        api_key: apiKey,
        query: query,
        language: 'en-US',
      },
    });
    return response.data.results || [];
  } catch (error: any) {
    console.error('TMDB search error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { radarrUrl, radarrApiKey, tmdbApiKey, service } = body;

    if (!radarrUrl || !radarrApiKey || !tmdbApiKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: radarrUrl, radarrApiKey, and tmdbApiKey' },
        { status: 400 }
      );
    }

    const serviceType = service || 'radarr'; // Default to radarr

    // Get root folders - this endpoint returns unmappedFolders as part of each root folder
    // This is how Radarr actually implements the import functionality
    const baseURL = radarrUrl.replace(/\/$/, '');
    const rootFoldersResponse = await axios.get(`${baseURL}/api/v3/rootFolder`, {
      headers: {
        'X-Api-Key': radarrApiKey,
      },
    });

    const rootFolders = rootFoldersResponse.data || [];

    // Extract unmapped folders from all root folders
    // Each root folder has an unmappedFolders array with { name, path, relativePath }
    let importList: any[] = [];
    
    for (const rootFolder of rootFolders) {
      if (rootFolder.unmappedFolders && Array.isArray(rootFolder.unmappedFolders)) {
        // Add unmapped folders to the import list
        importList = importList.concat(rootFolder.unmappedFolders.map((folder: any) => ({
          folder: folder.path,
          path: folder.path,
          name: folder.name,
          relativePath: folder.relativePath,
          size: 0, // Size is not provided by Radarr's unmappedFolders
        })));
      }
    }

    // If no unmapped folders found, return empty result
    if (importList.length === 0) {
      return NextResponse.json({
        folders: [],
        message: 'No unmatched folders found. All folders may already be imported.',
      });
    }

    // For each unmatched folder, search TMDB
    // The unmappedFolders from Radarr are already filtered - they don't include folders that are in the library
    const tmdbMediaType = serviceType === 'radarr' ? 'movie' : 'tv';
    const foldersWithMatches = await Promise.all(
      importList.map(async (folder: any) => {
        const folderPath = folder.folder || folder.path || '';
        // Use the folder name from Radarr if available, otherwise extract from path
        const mediaName = folder.name || extractMovieName(folderPath);
        
        // Search TMDB
        const tmdbResults = await searchTMDB(mediaName, tmdbApiKey, tmdbMediaType);
        
        return {
          folder: folderPath,
          folderName: mediaName,
          matches: tmdbResults.slice(0, 5), // Top 5 matches
          size: folder.size || 0,
        };
      })
    );

    return NextResponse.json({
      folders: foldersWithMatches,
      total: foldersWithMatches.length,
    });
  } catch (error: any) {
    console.error('Import scan error:', error);
    return NextResponse.json(
      {
        error: error.response?.data?.message || error.message || 'Failed to scan for importable folders',
        status: error.response?.status || 500,
      },
      { status: error.response?.status || 500 }
    );
  }
}

