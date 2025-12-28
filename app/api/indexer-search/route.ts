import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

interface IndexerField {
  name: string;
  value?: any;
  type?: string;
  label?: string;
}

interface Indexer {
  id: number;
  name: string;
  implementation: string;
  fields: IndexerField[];
  supportsSearch: boolean;
  protocol: string;
  enableInteractiveSearch?: boolean;
  enableAutomaticSearch?: boolean;
  enableRss?: boolean;
}

interface Release {
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
  quality?: {
    quality?: {
      name?: string;
      resolution?: number;
    };
  };
}

// Extract value from indexer fields (case-insensitive search)
function getFieldValue(fields: IndexerField[], fieldName: string): string | undefined {
  const field = fields.find(f => 
    f.name?.toLowerCase() === fieldName.toLowerCase() ||
    f.name === fieldName ||
    f.label?.toLowerCase() === fieldName.toLowerCase()
  );
  const value = field?.value;
  // Handle array values (like categories)
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return value?.toString();
}

// Query a Newznab/Torznab indexer
async function queryIndexer(
  indexer: Indexer,
  searchQuery: string,
  isMovie: boolean
): Promise<Release[]> {
  // Try multiple possible field name variations
  const baseUrl = getFieldValue(indexer.fields, 'baseUrl') || 
                  getFieldValue(indexer.fields, 'baseurl') ||
                  getFieldValue(indexer.fields, 'url');
  const apiPath = getFieldValue(indexer.fields, 'apiPath') || 
                  getFieldValue(indexer.fields, 'apipath') || 
                  '/api';
  const apiKey = getFieldValue(indexer.fields, 'apiKey') || 
                 getFieldValue(indexer.fields, 'apikey');
  const categories = getFieldValue(indexer.fields, 'categories') ||
                     getFieldValue(indexer.fields, 'category');

  // Debug: Log all fields to see what's available
  console.log(`Indexer ${indexer.name} fields:`, indexer.fields.map(f => ({ 
    name: f.name, 
    label: f.label, 
    type: f.type,
    hasValue: !!f.value,
    valueLength: f.value?.toString().length || 0 
  })));

  if (!baseUrl || !apiKey) {
    console.log(`Skipping indexer ${indexer.name}: missing baseUrl (${!!baseUrl}) or apiKey (${!!apiKey})`);
    console.log(`Extracted baseUrl: ${baseUrl}, apiKey: ${apiKey ? '***' + apiKey.slice(-4) : 'MISSING'}`);
    return [];
  }

  console.log(`Using for ${indexer.name}: baseUrl=${baseUrl}, apiPath=${apiPath}, apiKey=***${apiKey.slice(-4)}`);

  try {
    // Build Newznab/Torznab search URL
    // Format: {baseUrl}{apiPath}?t=search&cat={categories}&q={query}&apikey={apikey}&extended=1
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanApiPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
    const cleanApiPath2 = cleanApiPath.replace(/\/$/, '');
    
    // Use appropriate categories for movies vs TV
    // Movies: 2000, TV: 5000
    const defaultCategories = isMovie ? '2000' : '5000';
    const catParam = categories || defaultCategories;
    
    // Build search URL - don't include apikey in URL for Prowlarr, use header instead
    // Build search URL exactly like Radarr does - API key in query string
    // Format: {baseUrl}{apiPath}?t=search&cat={categories}&extended=1&apikey={apikey}&q={query}
    const searchUrl = `${cleanBaseUrl}${cleanApiPath2}?t=search&cat=${catParam}&extended=1&apikey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(searchQuery)}`;

    console.log(`Querying indexer ${indexer.name}: ${searchUrl.replace(apiKey, '***')}`);

    // For Prowlarr, we need both the query parameter AND the header
    // Try with both for maximum compatibility
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Unifarr/1.0',
        'X-Api-Key': apiKey, // Prowlarr may require this header
      },
      timeout: 10000,
    });

    // Check if response is XML
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('xml') && !contentType.includes('text')) {
      console.log(`Unexpected content type from ${indexer.name}: ${contentType}`);
    }

    // Parse XML response
    let xmlData;
    try {
      xmlData = await parseStringPromise(response.data);
    } catch (parseError: any) {
      console.error(`Failed to parse XML from ${indexer.name}:`, parseError.message);
      console.error(`Response preview:`, typeof response.data === 'string' ? response.data.substring(0, 200) : 'Not a string');
      return [];
    }

    const items = xmlData?.rss?.channel?.[0]?.item || [];
    console.log(`Found ${items.length} items from ${indexer.name}`);

    return items.map((item: any) => {
      const guid = item.guid?.[0]?._ || item.guid?.[0] || item.link?.[0];
      const title = item.title?.[0] || 'Unknown';
      const size = item.size?.[0] ? parseInt(item.size[0]) : undefined;
      const pubDate = item.pubDate?.[0];
      const link = item.link?.[0];
      const comments = item.comments?.[0];
      
      // Extract attributes from enclosure or other elements
      const enclosure = item.enclosure?.[0];
      const downloadUrl = enclosure?.$?.url || link;
      
      // Try to extract quality info from title or attributes
      let qualityName = 'Unknown';
      let resolution: number | undefined;
      
      // Simple quality detection from title
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

      // Determine if it's a magnet link or regular download URL
      const isMagnet = downloadUrl?.startsWith('magnet:');
      
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
        protocol: (indexer.implementation === 'Torznab' || indexer.protocol?.toLowerCase() === 'torrent') ? 'torrent' : 'usenet',
        isManualSearch: true, // Mark as manual search result
        quality: {
          quality: {
            name: qualityName,
            resolution,
          },
        },
      };
    });
  } catch (error: any) {
    console.error(`Error querying indexer ${indexer.name}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      const responseData = error.response.data;
      if (typeof responseData === 'string') {
        console.error(`Response data (first 500 chars):`, responseData.substring(0, 500));
      } else {
        console.error(`Response data:`, JSON.stringify(responseData).substring(0, 500));
      }
      console.error(`Response headers:`, error.response.headers);
    }
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceUrl, apiKey, query, isMovie } = body;

    if (!serviceUrl || !apiKey || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters: serviceUrl, apiKey, and query' },
        { status: 400 }
      );
    }

    // Fetch indexers from Radarr/Sonarr
    const baseURL = serviceUrl.replace(/\/$/, '');
    const indexersUrl = `${baseURL}/api/v3/indexer`;

    let indexersResponse;
    try {
      indexersResponse = await axios.get(indexersUrl, {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to fetch indexers: ${error.message}` },
        { status: 500 }
      );
    }

    const indexers: Indexer[] = indexersResponse.data || [];
    
    console.log(`Found ${indexers.length} total indexers`);
    console.log(`Indexer implementations:`, indexers.map(idx => ({ 
      name: idx.name, 
      implementation: idx.implementation, 
      supportsSearch: idx.supportsSearch,
      protocol: idx.protocol 
    })));
    
    // Filter to only enabled indexers that support search
    // Note: enableInteractiveSearch might not be set, so we check supportsSearch as primary filter
    const searchableIndexers = indexers.filter(
      (idx) => idx.supportsSearch && 
      (idx.implementation === 'Newznab' || idx.implementation === 'Torznab') &&
      (idx.enableInteractiveSearch !== false) // Allow undefined/true, but filter out explicitly false
    );

    console.log(`Found ${searchableIndexers.length} searchable Newznab/Torznab indexers`);

    if (searchableIndexers.length === 0) {
      return NextResponse.json(
        { error: 'No searchable Newznab/Torznab indexers found. Make sure you have indexers configured and enabled with search support.' },
        { status: 404 }
      );
    }

    // Query all indexers in parallel
    const searchPromises = searchableIndexers.map((indexer) =>
      queryIndexer(indexer, query, isMovie === true)
    );

    const results = await Promise.all(searchPromises);
    
    console.log(`Search results from all indexers:`, results.map((r, i) => ({ indexer: searchableIndexers[i].name, count: r.length })));
    
    // Flatten and deduplicate results by GUID
    const allReleases: Release[] = [];
    const seenGuids = new Set<string>();
    
    results.flat().forEach((release) => {
      if (release.guid && !seenGuids.has(release.guid)) {
        seenGuids.add(release.guid);
        allReleases.push(release);
      }
    });

    console.log(`Total unique releases: ${allReleases.length}`);

    // Sort by publish date (newest first)
    allReleases.sort((a, b) => {
      if (!a.publishDate && !b.publishDate) return 0;
      if (!a.publishDate) return 1;
      if (!b.publishDate) return -1;
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });

    return NextResponse.json(allReleases);
  } catch (error: any) {
    console.error('Indexer search error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Indexer search failed';
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        status: 500,
      },
      { status: 500 }
    );
  }
}

