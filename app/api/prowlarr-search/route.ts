import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

interface ProwlarrIndexer {
  id: number;
  name: string;
  implementation: string;
  protocol: string;
  priority: number;
  enableRss: boolean;
  enableAutomaticSearch: boolean;
  enableInteractiveSearch: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  fields: Array<{
    name: string;
    value?: any;
  }>;
}

interface ProwlarrSearchResult {
  guid: string;
  title: string;
  size?: number;
  indexer?: string;
  indexerId: number;
  publishDate?: string;
  downloadUrl?: string;
  magnetUrl?: string;
  infoUrl?: string;
  commentUrl?: string;
  protocol?: string;
  isManualSearch?: boolean;
  quality?: {
    quality?: {
      name?: string;
      resolution?: number;
    };
  };
}

// Extract value from indexer fields
function getFieldValue(fields: Array<{ name: string; value?: any }>, fieldName: string): string | undefined {
  const field = fields.find(f => 
    f.name?.toLowerCase() === fieldName.toLowerCase()
  );
  const value = field?.value;
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return value?.toString();
}

// Query a Prowlarr indexer directly
async function queryProwlarrIndexer(
  prowlarrUrl: string,
  prowlarrApiKey: string,
  indexer: ProwlarrIndexer,
  searchQuery: string,
  isMovie: boolean
): Promise<ProwlarrSearchResult[]> {
  try {
    // For Cardigann and other Prowlarr-managed indexers, use Prowlarr's Torznab endpoint
    // Format: {prowlarrUrl}/api/v1/indexer/{indexerId}/results/torznab/
    const cleanProwlarrUrl = prowlarrUrl.replace(/\/$/, '');
    
    // Check if indexer has a baseUrl (for external Newznab/Torznab indexers)
    const baseUrl = getFieldValue(indexer.fields, 'baseUrl');
    let searchUrl: string;
    
    if (baseUrl && (indexer.implementation === 'Newznab' || indexer.implementation === 'Torznab')) {
      // External Newznab/Torznab indexer - use its own URL
      const apiPath = getFieldValue(indexer.fields, 'apiPath') || '/api';
      const apiKey = getFieldValue(indexer.fields, 'apiKey') || prowlarrApiKey;
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const cleanApiPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
      const cleanApiPath2 = cleanApiPath.replace(/\/$/, '');
      
      const defaultCategories = isMovie ? '2000' : '5000';
      const categories = getFieldValue(indexer.fields, 'categories') || defaultCategories;
      
      searchUrl = `${cleanBaseUrl}${cleanApiPath2}?t=search&cat=${categories}&extended=1&apikey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(searchQuery)}`;
    } else {
      // Cardigann or other Prowlarr-managed indexer - use Prowlarr's indexer-specific Torznab endpoint
      // Format: {prowlarrUrl}/{indexerId}/api?t=search&cat={categories}&extended=1&apikey={key}&q={query}
      const defaultCategories = isMovie ? '2000' : '5000';
      const categories = getFieldValue(indexer.fields, 'categories') || defaultCategories;
      
      // Prowlarr exposes each indexer at /{indexerId}/api endpoint
      // Include API key in URL query string (Prowlarr requires this)
      searchUrl = `${cleanProwlarrUrl}/${indexer.id}/api?t=search&cat=${categories}&extended=1&apikey=${encodeURIComponent(prowlarrApiKey)}&q=${encodeURIComponent(searchQuery)}`;
    }

    console.log(`Querying Prowlarr indexer ${indexer.name} (${indexer.implementation}): ${searchUrl.replace(prowlarrApiKey, '***')}`);

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Unifarr/1.0',
        'X-Api-Key': prowlarrApiKey, // Prowlarr requires this header
      },
      timeout: 10000,
    });

    // Parse XML response
    let xmlData;
    try {
      xmlData = await parseStringPromise(response.data);
    } catch (parseError: any) {
      console.error(`Failed to parse XML from ${indexer.name}:`, parseError.message);
      return [];
    }

    const items = xmlData?.rss?.channel?.[0]?.item || [];
    console.log(`Found ${items.length} items from Prowlarr indexer ${indexer.name}`);

    return items.map((item: any) => {
      const guid = item.guid?.[0]?._ || item.guid?.[0] || item.link?.[0];
      const title = item.title?.[0] || 'Unknown';
      const size = item.size?.[0] ? parseInt(item.size[0]) : undefined;
      const pubDate = item.pubDate?.[0];
      const link = item.link?.[0];
      const comments = item.comments?.[0];
      
      const enclosure = item.enclosure?.[0];
      const downloadUrl = enclosure?.$?.url || link;
      const isMagnet = downloadUrl?.startsWith('magnet:');
      
      // Extract quality info from title
      let qualityName = 'Unknown';
      let resolution: number | undefined;
      
      if (title.match(/\b(2160p|4K|UHD)\b/i)) {
        qualityName = '2160p';
        resolution = 2160;
      } else if (title.match(/\b(1080p|FHD)\b/i)) {
        qualityName = '1080p';
        resolution = 1080;
      } else if (title.match(/\b(720p|HD)\b/i)) {
        qualityName = '720p';
        resolution = 720;
      } else if (title.match(/\b(480p|SD)\b/i)) {
        qualityName = '480p';
        resolution = 480;
      }

      return {
        guid: guid || downloadUrl || title,
        title,
        size,
        indexer: indexer.name,
        indexerId: indexer.id,
        publishDate: pubDate || new Date().toISOString(),
        downloadUrl: isMagnet ? undefined : downloadUrl,
        magnetUrl: isMagnet ? downloadUrl : undefined,
        infoUrl: link,
        commentUrl: comments,
        protocol: indexer.protocol?.toLowerCase() === 'torrent' ? 'torrent' : 'usenet',
        isManualSearch: true,
        quality: {
          quality: {
            name: qualityName,
            resolution,
          },
        },
      };
    });
  } catch (error: any) {
    console.error(`Error querying Prowlarr indexer ${indexer.name}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      const responseData = error.response.data;
      if (typeof responseData === 'string') {
        console.error(`Response data (first 200 chars):`, responseData.substring(0, 200));
      }
    }
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prowlarrUrl, prowlarrApiKey, query, isMovie } = body;

    if (!prowlarrUrl || !prowlarrApiKey || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters: prowlarrUrl, prowlarrApiKey, and query' },
        { status: 400 }
      );
    }

    // Fetch indexers from Prowlarr
    const baseURL = prowlarrUrl.replace(/\/$/, '');
    const indexersUrl = `${baseURL}/api/v1/indexer`;

    let indexersResponse;
    try {
      indexersResponse = await axios.get(indexersUrl, {
        headers: {
          'X-Api-Key': prowlarrApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to fetch Prowlarr indexers: ${error.message}` },
        { status: 500 }
      );
    }

    const indexers: ProwlarrIndexer[] = indexersResponse.data || [];
    
    console.log(`Found ${indexers.length} total Prowlarr indexers`);
    console.log(`Raw Prowlarr indexer sample (first):`, JSON.stringify(indexers[0], null, 2));
    
    // Filter indexers - be more lenient since Prowlarr might not return all fields
    // For Cardigann indexers, we don't need baseUrl - we'll use Prowlarr's Torznab endpoint
    const searchableIndexers = indexers.filter(
      (idx) => {
        // The indexer must support search
        if (!idx.supportsSearch) {
          return false;
        }
        
        // Check if interactive search is enabled
        // If undefined, assume enabled (Prowlarr might not always return this field)
        const hasInteractiveSearch = idx.enableInteractiveSearch !== false;
        
        // For external Newznab/Torznab indexers, we need baseUrl
        // For Cardigann/Prowlarr-managed indexers, we'll use Prowlarr's API
        const isExternalIndexer = idx.implementation === 'Newznab' || idx.implementation === 'Torznab';
        const hasBaseUrl = idx.fields?.some(f => 
          (f.name?.toLowerCase() === 'baseurl' || f.name?.toLowerCase() === 'url') && f.value
        );
        
        // External indexers need baseUrl, Cardigann indexers don't
        if (isExternalIndexer && !hasBaseUrl) {
          return false;
        }
        
        return hasInteractiveSearch;
      }
    );

    console.log(`Found ${searchableIndexers.length} searchable Prowlarr indexers after filtering`);
    console.log(`Searchable indexers:`, searchableIndexers.map(idx => ({
      id: idx.id,
      name: idx.name,
      implementation: idx.implementation,
      protocol: idx.protocol,
      hasBaseUrl: idx.fields?.some(f => (f.name?.toLowerCase() === 'baseurl' || f.name?.toLowerCase() === 'url') && f.value),
    })));

    if (searchableIndexers.length === 0) {
      // Provide more helpful error message
      const supportsSearchCount = indexers.filter(idx => idx.supportsSearch === true).length;
      const hasBaseUrlCount = indexers.filter(idx => 
        idx.fields?.some(f => (f.name?.toLowerCase() === 'baseurl' || f.name?.toLowerCase() === 'url') && f.value)
      ).length;
      
      return NextResponse.json(
        { 
          error: 'No searchable indexers found in Prowlarr',
          details: {
            totalIndexers: indexers.length,
            supportsSearch: supportsSearchCount,
            hasBaseUrl: hasBaseUrlCount,
            indexerDetails: indexers.map(idx => ({
              id: idx.id,
              name: idx.name,
              implementation: idx.implementation,
              supportsSearch: idx.supportsSearch,
              enableInteractiveSearch: idx.enableInteractiveSearch,
              hasBaseUrl: idx.fields?.some(f => (f.name?.toLowerCase() === 'baseurl' || f.name?.toLowerCase() === 'url') && f.value),
            })),
            message: 'Make sure you have indexers configured in Prowlarr that support search and have valid URLs configured.'
          }
        },
        { status: 404 }
      );
    }

    // Query all indexers in parallel
    const searchPromises = searchableIndexers.map((indexer) =>
      queryProwlarrIndexer(baseURL, prowlarrApiKey, indexer, query, isMovie === true)
    );

    const results = await Promise.all(searchPromises);
    
    // Flatten and deduplicate results by GUID
    const allReleases: ProwlarrSearchResult[] = [];
    const seenGuids = new Set<string>();
    
    results.flat().forEach((release) => {
      if (release.guid && !seenGuids.has(release.guid)) {
        seenGuids.add(release.guid);
        allReleases.push(release);
      }
    });

    console.log(`Total unique releases from Prowlarr: ${allReleases.length}`);

    // Sort by publish date (newest first)
    allReleases.sort((a, b) => {
      if (!a.publishDate && !b.publishDate) return 0;
      if (!a.publishDate) return 1;
      if (!b.publishDate) return -1;
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });

    return NextResponse.json(allReleases);
  } catch (error: any) {
    console.error('Prowlarr search error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Prowlarr search failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        status: 500,
      },
      { status: 500 }
    );
  }
}

