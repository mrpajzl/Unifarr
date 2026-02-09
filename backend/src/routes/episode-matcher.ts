import { Hono } from 'hono';
import { db } from '../db';
import { files, mediaItems } from '../db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { parseMediaFile, parseMediaPath } from '../lib/parser';

const router = new Hono();

/**
 * GET /api/episode-matcher/:mediaId/files
 * Get all files for a TV show with their match status
 */
router.get('/:mediaId/files', async (c) => {
  const mediaId = parseInt(c.req.param('mediaId'));
  
  const media = await db.query.mediaItems.findFirst({
    where: eq(mediaItems.id, mediaId),
  });
  
  if (!media || media.type !== 'tv') {
    return c.json({ error: 'TV show not found' }, 404);
  }
  
  // Get ALL files for this media
  const allFiles = await db.query.files.findMany({
    where: eq(files.mediaItemId, mediaId),
  });
  
  // Parse each file to extract potential season/episode info
  const parsed = allFiles.map(file => {
    const parsed = parseMediaPath(file.path);
    return {
      id: file.id,
      path: file.path,
      filename: file.path.split('/').pop(),
      size: file.size,
      season: file.parsedSeason,
      episode: file.parsedEpisode,
      parsedSeason: parsed.season || file.parsedSeason,
      parsedEpisode: parsed.episode || file.parsedEpisode,
      parsedTitle: parsed.title,
      isMatched: file.parsedSeason !== null && file.parsedEpisode !== null,
    };
  });
  
  const matched = parsed.filter(f => f.isMatched);
  const unmatched = parsed.filter(f => !f.isMatched);
  
  return c.json({
    media: {
      id: media.id,
      title: media.title,
      tmdbId: media.tmdbId,
    },
    allFiles: parsed,
    matchedFiles: matched,
    unmatchedFiles: unmatched,
    totalCount: parsed.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
  });
});

/**
 * POST /api/episode-matcher/:mediaId/analyze-pattern
 * Analyze a pattern from sample filenames
 * Body: { sampleFile: string }
 */
router.post('/:mediaId/analyze-pattern', async (c) => {
  const mediaId = parseInt(c.req.param('mediaId'));
  const { sampleFile } = await c.req.json();
  
  if (!sampleFile) {
    return c.json({ error: 'sampleFile is required' }, 400);
  }
  
  // Extract pattern using common TV show patterns
  const patterns = [
    {
      name: 'S01E05',
      regex: /S(\d{1,2})E(\d{1,3})/i,
      seasonGroup: 1,
      episodeGroup: 2,
    },
    {
      name: '1x05',
      regex: /(\d{1,2})x(\d{1,3})/i,
      seasonGroup: 1,
      episodeGroup: 2,
    },
    {
      name: 'Season 1 Episode 5',
      regex: /Season\s*(\d{1,2})\s*Episode\s*(\d{1,3})/i,
      seasonGroup: 1,
      episodeGroup: 2,
    },
    {
      name: '105 (3-digit)',
      regex: /(?:^|[^\d])(\d{1})(\d{2})(?:[^\d]|$)/,
      seasonGroup: 1,
      episodeGroup: 2,
    },
  ];
  
  const filename = sampleFile.split('/').pop() || sampleFile;
  
  for (const pattern of patterns) {
    const match = filename.match(pattern.regex);
    if (match) {
      return c.json({
        detected: true,
        patternName: pattern.name,
        regex: pattern.regex.source,
        flags: pattern.regex.flags,
        seasonGroup: pattern.seasonGroup,
        episodeGroup: pattern.episodeGroup,
        example: {
          filename,
          parsedSeason: parseInt(match[pattern.seasonGroup]),
          parsedEpisode: parseInt(match[pattern.episodeGroup]),
        },
      });
    }
  }
  
  return c.json({
    detected: false,
    message: 'Could not detect a known pattern',
  });
});

/**
 * POST /api/episode-matcher/:mediaId/apply-pattern
 * Apply pattern to all unmatched files and update season/episode
 * Body: { regex: string, seasonGroup: number, episodeGroup: number, autoMatch: boolean }
 */
router.post('/:mediaId/apply-pattern', async (c) => {
  const mediaId = parseInt(c.req.param('mediaId'));
  const { regex, seasonGroup, episodeGroup, flags, autoMatch } = await c.req.json();
  
  if (!regex || seasonGroup === undefined || episodeGroup === undefined) {
    return c.json({ error: 'regex, seasonGroup, and episodeGroup are required' }, 400);
  }
  
  const media = await db.query.mediaItems.findFirst({
    where: eq(mediaItems.id, mediaId),
  });
  
  if (!media || media.type !== 'tv') {
    return c.json({ error: 'TV show not found' }, 404);
  }
  
  // Get all unmatched files
  const unmatchedFiles = await db.query.files.findMany({
    where: and(
      eq(files.mediaItemId, mediaId),
      or(
        isNull(files.season),
        isNull(files.episode)
      )
    ),
  });
  
  const pattern = new RegExp(regex, flags || 'i');
  const results = {
    matched: [] as any[],
    failed: [] as any[],
  };
  
  for (const file of unmatchedFiles) {
    const filename = file.path.split('/').pop() || file.path;
    const match = filename.match(pattern);
    
    if (!match) {
      results.failed.push({
        fileId: file.id,
        filename,
        reason: 'Pattern did not match',
      });
      continue;
    }
    
    const season = parseInt(match[seasonGroup]);
    const episode = parseInt(match[episodeGroup]);
    
    if (isNaN(season) || isNaN(episode)) {
      results.failed.push({
        fileId: file.id,
        filename,
        reason: 'Invalid season/episode numbers',
      });
      continue;
    }
    
    if (autoMatch) {
      // Update file with season/episode
      await db.update(files)
        .set({ 
          parsedSeason: season,
          parsedEpisode: episode,
        })
        .where(eq(files.id, file.id));
    }
    
    results.matched.push({
      fileId: file.id,
      filename,
      season,
      episode,
      episodeName: `S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`,
      updated: autoMatch,
    });
  }
  
  return c.json({
    total: unmatchedFiles.length,
    matched: results.matched.length,
    failed: results.failed.length,
    results,
  });
});

/**
 * POST /api/episode-matcher/:mediaId/auto-match
 * Automatically match files using parser
 */
router.post('/:mediaId/auto-match', async (c) => {
  const mediaId = parseInt(c.req.param('mediaId'));
  
  const media = await db.query.mediaItems.findFirst({
    where: eq(mediaItems.id, mediaId),
  });
  
  if (!media || media.type !== 'tv') {
    return c.json({ error: 'TV show not found' }, 404);
  }
  
  // Get all unmatched files
  const unmatchedFiles = await db.query.files.findMany({
    where: and(
      eq(files.mediaItemId, mediaId),
      or(
        isNull(files.season),
        isNull(files.episode)
      )
    ),
  });
  
  const results = {
    matched: [] as any[],
    failed: [] as any[],
  };
  
  for (const file of unmatchedFiles) {
    const parsed = parseMediaPath(file.path);
    
    if (!parsed.season || !parsed.episode) {
      results.failed.push({
        fileId: file.id,
        filename: file.path.split('/').pop(),
        reason: 'Could not parse season/episode from filename',
      });
      continue;
    }
    
    // Match! Update the file
    await db.update(files)
      .set({ 
        parsedSeason: parsed.season,
        parsedEpisode: parsed.episode,
      })
      .where(eq(files.id, file.id));
    
    results.matched.push({
      fileId: file.id,
      filename: file.path.split('/').pop(),
      parsedSeason: parsed.season,
      parsedEpisode: parsed.episode,
      episodeName: `S${parsed.season.toString().padStart(2, '0')}E${parsed.episode.toString().padStart(2, '0')}`,
    });
  }
  
  return c.json({
    total: unmatchedFiles.length,
    matched: results.matched.length,
    failed: results.failed.length,
    results,
  });
});

/**
 * POST /api/episode-matcher/file/:fileId/match
 * Match a single file to season/episode
 * Body: { season: number, episode: number }
 */
router.post('/file/:fileId/match', async (c) => {
  const fileId = parseInt(c.req.param('fileId'));
  const { season, episode } = await c.req.json();
  
  if (season === undefined || episode === undefined) {
    return c.json({ error: 'season and episode are required' }, 400);
  }
  
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
  
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }
  
  // Update file with season/episode
  await db.update(files)
    .set({ 
      parsedSeason: parseInt(season.toString()),
      parsedEpisode: parseInt(episode.toString()),
    })
    .where(eq(files.id, fileId));
  
  return c.json({
    success: true,
    fileId,
    season,
    episode,
    filename: file.path.split('/').pop(),
  });
});

/**
 * POST /api/episode-matcher/file/:fileId/unmatch
 * Remove season/episode match from a file
 */
router.post('/file/:fileId/unmatch', async (c) => {
  const fileId = parseInt(c.req.param('fileId'));
  
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
  
  if (!file) {
    return c.json({ error: 'File not found' }, 404);
  }
  
  // Clear season/episode
  await db.update(files)
    .set({ 
      parsedSeason: null,
      parsedEpisode: null,
    })
    .where(eq(files.id, fileId));
  
  return c.json({
    success: true,
    fileId,
    filename: file.path.split('/').pop(),
  });
});

export default router;
