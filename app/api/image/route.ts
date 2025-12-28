import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    const service = searchParams.get('service'); // 'sonarr' or 'radarr'
    const url = searchParams.get('url');
    const apiKey = searchParams.get('apiKey');

    if (!path || !service || !url || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Decode the path (it was URL-encoded when passed as query parameter)
    const decodedPath = decodeURIComponent(path);
    // Clean the path - ensure it starts with /
    const imagePath = decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`;
    const baseURL = decodeURIComponent(url).replace(/\/$/, '');
    const decodedApiKey = decodeURIComponent(apiKey);
    
    // First, try to get system status to check for URL base path
    let urlBase = '';
    try {
      const systemStatusUrl = `${baseURL}/api/v3/system/status`;
      const systemResponse = await axios.get(systemStatusUrl, {
        headers: {
          'X-Api-Key': decodedApiKey,
        },
        timeout: 5000,
      });
      if (systemResponse.data?.urlBase) {
        urlBase = systemResponse.data.urlBase;
        console.log('Found URL base from system status:', urlBase);
      }
    } catch (error) {
      console.log('Could not fetch system status, proceeding without URL base');
    }
    
    // Parse the image path to separate base path from query params
    const [imageBasePath, existingQuery] = imagePath.split('?');
    const existingParams = existingQuery ? `?${existingQuery}` : '';
    
    // Extract series/movie ID and image type from path (e.g., /MediaCover/76/poster.jpg -> 76, poster)
    const idMatch = imagePath.match(/\/MediaCover\/(\d+)\/([^\/\?]+)/);
    const mediaId = idMatch ? idMatch[1] : null;
    const imageType = idMatch ? idMatch[2].replace(/\.[^.]*$/, '') : null; // Remove extension
    
    // Construct URLs with different authentication methods, including URL base if found
    const urlBasePath = urlBase ? (urlBase.startsWith('/') ? urlBase : `/${urlBase}`).replace(/\/$/, '') : '';
    const urlWithHeader = `${baseURL}${urlBasePath}${imagePath}`;
    const urlWithQueryKey = `${baseURL}${urlBasePath}${imageBasePath}${existingParams ? existingParams + '&' : '?'}apikey=${decodedApiKey}`;
    const urlWithoutAuth = `${baseURL}${urlBasePath}${imagePath}`;
    
    // Also try with X-Api-Key header (some instances use this for images)
    const urlWithHeaderAuth = `${baseURL}${urlBasePath}${imagePath}${existingParams ? existingParams + '&' : '?'}apikey=${decodedApiKey}`;

    console.log('Trying to fetch image from:', urlWithHeader);
    console.log('Service:', service, 'Path:', imagePath);

    // Try multiple authentication methods
    let response;
    let lastError: any = null;
    
    // Method 1: API key in BOTH header AND query parameter (some instances require both)
    try {
      console.log('Trying with API key in both header and query parameter...');
      response = await axios.get(urlWithHeaderAuth, {
        headers: {
          'X-Api-Key': decodedApiKey,
        },
        responseType: 'arraybuffer',
        validateStatus: () => true,
        maxRedirects: 5,
        timeout: 10000,
      });
      const contentType = response.headers['content-type'] || '';
      const isHtml = contentType.includes('html') || 
                     (response.data && Buffer.from(response.data).toString('utf-8', 0, 100).trim().startsWith('<!'));
      if (response.status === 200 && !isHtml && contentType.startsWith('image/')) {
        console.log('Success with both header and query parameter auth');
        // Success!
      } else {
        console.log('Both auth methods failed:', response.status, contentType, isHtml);
        lastError = { method: 'both', status: response.status, contentType, isHtml };
      }
    } catch (error: any) {
      console.error('Both auth methods error:', error.message);
      lastError = { method: 'both', error: error.message };
    }
    
    // Method 2: API key as query parameter only
    if (!response || response.status !== 200 || 
        (response.headers['content-type'] && response.headers['content-type'].includes('html'))) {
      try {
        console.log('Trying with API key as query parameter only...');
        response = await axios.get(urlWithQueryKey, {
          responseType: 'arraybuffer',
          validateStatus: () => true,
          maxRedirects: 5,
          timeout: 10000,
        });
        const contentType = response.headers['content-type'] || '';
        const isHtml = contentType.includes('html') || 
                       (response.data && Buffer.from(response.data).toString('utf-8', 0, 100).trim().startsWith('<!'));
        if (response.status === 200 && !isHtml && contentType.startsWith('image/')) {
          console.log('Success with query parameter auth');
          // Success!
        } else {
          console.log('Query param failed:', response.status, contentType, isHtml);
          lastError = { method: 'query', status: response.status, contentType, isHtml };
        }
      } catch (error: any) {
        console.error('Query param auth error:', error.message);
        lastError = { method: 'query', error: error.message };
      }
    }
    
    // Method 3: API key in header only (if methods 1 and 2 didn't work)
    if (!response || response.status !== 200 || 
        (response.headers['content-type'] && response.headers['content-type'].includes('html'))) {
      try {
        console.log('Trying with API key in header...');
        response = await axios.get(urlWithHeader, {
          headers: {
            'X-Api-Key': decodedApiKey,
          },
          responseType: 'arraybuffer',
          validateStatus: () => true,
          maxRedirects: 5,
          timeout: 10000,
        });
        const contentType = response.headers['content-type'] || '';
        const isHtml = contentType.includes('html') || 
                       (response.data && Buffer.from(response.data).toString('utf-8', 0, 100).trim().startsWith('<!'));
        if (response.status === 200 && !isHtml && contentType.startsWith('image/')) {
          console.log('Success with header auth');
          // Success!
        } else {
          console.log('Header auth failed:', response.status, contentType, isHtml);
          lastError = { method: 'header', status: response.status, contentType, isHtml };
        }
      } catch (error: any) {
        console.error('Header auth error:', error.message);
        lastError = { method: 'header', error: error.message };
      }
    }
    
    // Method 4: Try accessing through API endpoint if we have media ID
    if ((!response || response.status !== 200 || 
        (response.headers['content-type'] && response.headers['content-type'].includes('html'))) 
        && mediaId && imageType) {
      try {
        console.log('Trying to fetch through API endpoint...');
        // Try to get the series/movie data which might include image URLs
        const apiEndpoint = service === 'sonarr' ? `/api/v3/series/${mediaId}` : `/api/v3/movie/${mediaId}`;
        const apiUrl = `${baseURL}${urlBasePath}${apiEndpoint}`;
        const apiResponse = await axios.get(apiUrl, {
          headers: {
            'X-Api-Key': decodedApiKey,
          },
          timeout: 5000,
        });
        
        // Look for the image in the API response
        if (apiResponse.data?.images) {
          const image = apiResponse.data.images.find((img: any) => 
            img.coverType === imageType || img.url?.includes(imageType)
          );
          if (image?.url) {
            // Try to fetch the image URL from the API response
            const apiImageUrl = image.url.startsWith('http') 
              ? image.url 
              : `${baseURL}${urlBasePath}${image.url.startsWith('/') ? image.url : `/${image.url}`}`;
            console.log('Found image URL from API:', apiImageUrl);
            
            response = await axios.get(apiImageUrl, {
              headers: {
                'X-Api-Key': decodedApiKey,
              },
              responseType: 'arraybuffer',
              validateStatus: () => true,
              maxRedirects: 5,
              timeout: 10000,
            });
            const contentType = response.headers['content-type'] || '';
            const isHtml = contentType.includes('html') || 
                           (response.data && Buffer.from(response.data).toString('utf-8', 0, 100).trim().startsWith('<!'));
            if (response.status === 200 && !isHtml && contentType.startsWith('image/')) {
              console.log('Success through API endpoint');
              // Success!
            } else {
              console.log('API endpoint method failed:', response.status, contentType, isHtml);
              lastError = { method: 'api-endpoint', status: response.status, contentType, isHtml };
            }
          }
        }
      } catch (error: any) {
        console.error('API endpoint error:', error.message);
        lastError = { method: 'api-endpoint', error: error.message };
      }
    }
    
    // Method 5: No authentication (if all other methods didn't work)
    if (!response || response.status !== 200 || 
        (response.headers['content-type'] && response.headers['content-type'].includes('html'))) {
      try {
        console.log('Trying without authentication...');
        response = await axios.get(urlWithoutAuth, {
          responseType: 'arraybuffer',
          validateStatus: () => true,
          maxRedirects: 5,
          timeout: 10000,
        });
        const contentType = response.headers['content-type'] || '';
        const isHtml = contentType.includes('html') || 
                       (response.data && Buffer.from(response.data).toString('utf-8', 0, 100).trim().startsWith('<!'));
        if (response.status === 200 && !isHtml && contentType.startsWith('image/')) {
          console.log('Success without auth');
          // Success!
        } else {
          console.log('No auth failed:', response.status, contentType, isHtml);
          lastError = { method: 'no-auth', status: response.status, contentType, isHtml };
        }
      } catch (error: any) {
        console.error('No auth error:', error.message);
        lastError = { method: 'no-auth', error: error.message };
      }
    }

    // Check if we got a valid image response
    if (!response) {
      return NextResponse.json(
        { error: 'Failed to fetch image: No response received', lastError },
        { status: 500 }
      );
    }
    
    const contentType = response.headers['content-type'] || '';
    let isHtml = contentType.includes('html') || 
                 (response.data && Buffer.from(response.data).toString('utf-8', 0, 100).trim().startsWith('<!'));

    // Final validation - check if we have a valid image
    if (response.status >= 400 || isHtml || !contentType.startsWith('image/')) {
      const errorText = response.data ? Buffer.from(response.data).toString('utf-8').substring(0, 500) : 'No response data';
      console.error('Image fetch failed after all methods:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        isHtml,
        url: urlWithHeader,
        lastError,
        preview: errorText.substring(0, 200)
      });
      return NextResponse.json(
        { 
          error: `Failed to fetch image: ${response.status} ${response.statusText}`,
          contentType: response.headers['content-type'],
          isHtml,
          url: urlWithHeader,
          lastError,
          preview: errorText.substring(0, 200)
        },
        { status: response.status >= 400 ? response.status : 500 }
      );
    }

    // Return the image with appropriate headers
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { 
        error: error.response?.data?.message || error.message || 'Failed to fetch image',
        status: error.response?.status || 500
      },
      { status: error.response?.status || 500 }
    );
  }
}

