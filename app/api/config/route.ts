import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AppConfig } from '@/types';

function hasDatabaseUrl() {
  return !!process.env.DATABASE_URL;
}

export async function GET() {
  // If no DATABASE_URL is configured, behave as if there is no saved config
  if (!hasDatabaseUrl()) {
    console.warn('DATABASE_URL is not set; returning empty config.');
    return NextResponse.json({});
  }

  try {
    const config = await prisma.config.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      return NextResponse.json({});
    }

    const appConfig: AppConfig = {};
    
    if (config.sonarrUrl && config.sonarrApiKey) {
      appConfig.sonarr = {
        url: config.sonarrUrl,
        apiKey: config.sonarrApiKey,
        enabled: config.sonarrEnabled,
      };
    }

    if (config.radarrUrl && config.radarrApiKey) {
      appConfig.radarr = {
        url: config.radarrUrl,
        apiKey: config.radarrApiKey,
        enabled: config.radarrEnabled,
      };
    }

    if (config.prowlarrUrl && config.prowlarrApiKey) {
      appConfig.prowlarr = {
        url: config.prowlarrUrl,
        apiKey: config.prowlarrApiKey,
        enabled: config.prowlarrEnabled,
      };
    }

    if (config.tmdbApiKey) {
      appConfig.tmdb = {
        apiKey: config.tmdbApiKey,
      };
    }

    return NextResponse.json(appConfig);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // If there is no database configured, we cannot persist config
  if (!hasDatabaseUrl()) {
    console.error('DATABASE_URL is not set; cannot save config.');
    return NextResponse.json(
      { 
        error: 'Database is not configured. Please set DATABASE_URL in your .env file. See README for setup instructions.',
        details: 'For local development, run: docker-compose up -d postgres, then create .env with DATABASE_URL=postgresql://unifarr:unifarr@localhost:5432/unifarr'
      },
      { status: 500 }
    );
  }

  try {
    const appConfig: AppConfig = await request.json();

    await prisma.config.upsert({
      where: { id: 'default' },
      update: {
        sonarrUrl: appConfig.sonarr?.url || null,
        sonarrApiKey: appConfig.sonarr?.apiKey || null,
        sonarrEnabled: appConfig.sonarr?.enabled ?? false,
        radarrUrl: appConfig.radarr?.url || null,
        radarrApiKey: appConfig.radarr?.apiKey || null,
        radarrEnabled: appConfig.radarr?.enabled ?? false,
        prowlarrUrl: appConfig.prowlarr?.url || null,
        prowlarrApiKey: appConfig.prowlarr?.apiKey || null,
        prowlarrEnabled: appConfig.prowlarr?.enabled ?? false,
        tmdbApiKey: appConfig.tmdb?.apiKey || null,
      },
      create: {
        id: 'default',
        sonarrUrl: appConfig.sonarr?.url || null,
        sonarrApiKey: appConfig.sonarr?.apiKey || null,
        sonarrEnabled: appConfig.sonarr?.enabled ?? false,
        radarrUrl: appConfig.radarr?.url || null,
        radarrApiKey: appConfig.radarr?.apiKey || null,
        radarrEnabled: appConfig.radarr?.enabled ?? false,
        prowlarrUrl: appConfig.prowlarr?.url || null,
        prowlarrApiKey: appConfig.prowlarr?.apiKey || null,
        prowlarrEnabled: appConfig.prowlarr?.enabled ?? false,
        tmdbApiKey: appConfig.tmdb?.apiKey || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving config:', error);
    
    // Provide more helpful error messages
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database server')) {
      return NextResponse.json(
        { 
          error: 'Cannot connect to database. Make sure PostgreSQL is running.',
          details: 'Run: docker-compose up -d postgres'
        },
        { status: 500 }
      );
    }
    
    if (error?.code === 'P1003' || error?.message?.includes('database') && error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Database does not exist. Run: npm run db:push',
          details: 'This will create the database schema.'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to save configuration',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

