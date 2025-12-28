import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, apiKey, endpoint, method = 'GET', data } = body;

    if (!url || !apiKey || !endpoint) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const baseURL = url.replace(/\/$/, '');
    const fullUrl = `${baseURL}/api/v3${endpoint}`;

    const config = {
      method,
      url: fullUrl,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
      ...(data && { data }),
    };

    const response = await axios(config);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    
    // Handle network errors (ECONNREFUSED, ETIMEDOUT, etc.)
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { 
          error: `Cannot connect to service at ${error.config?.url || 'the specified URL'}. Please check if the service is running and the URL is correct.`,
          status: 503
        },
        { status: 503 }
      );
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return NextResponse.json(
        { 
          error: 'Request timed out. The service may be slow or unavailable.',
          status: 503
        },
        { status: 503 }
      );
    }
    
    // Handle axios errors with response
    if (error.response) {
      return NextResponse.json(
        { 
          error: error.response.data?.message || error.response.data?.error || error.message || 'Proxy request failed',
          status: error.response.status
        },
        { status: error.response.status }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { 
        error: error.message || 'Proxy request failed',
        status: 500
      },
      { status: 500 }
    );
  }
}

