import { Hono } from 'hono';
import { db } from '../db';
import { files, episodes, mediaItems } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { parseMediaFile, parseMediaPath } from '../lib/parser';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const router = new Hono();

/**
 * GET /api/episode-matcher/:mediaId/unmatched-files
 * Get all unmatched files for a TV show
 */
router.get('/:mediaId/unmatched-files', async (c) => {
  const mediaId = parseInt(c.req.param('mediaId'));
  
  const media = await db.query.mediaItems.findFirst({
    where: eq(mediaItems.id, mediaId),
  });
  
  if (!media || media.type !== 'tv') {
    return c.json({ error: 'TV show not found' }, 404);
  }
  
  // Get all files for this media that aren't matched to episodes
  const unmatchedFiles = await db.query.files.findMany({
    where: and(
      eq(files.mediaId, mediaId),
      isNull(files.episodeId)
    ),
  });
  
  // Parse each file to extract potential season/episode info
  const parsed = unmatchedFiles.map(file => {
    const parsed = parseMediaPath(file.path);
    return {
      id: file.id,
      path: file.path,
      filename: file.path.split('/').pop(),
      size: file.size,
      parsedSeason: parsed.season,
      parsedEpisode: parsed.episode,
      parsedTitle: parsed.title,
    };
  });
  
  return c.json({
    media: {
      id: media.id,
      title: media.title,
      tmdbId: media.tmdbId,
    },
    unmatchedFiles: parsed,
    totalCount: parsed.length,
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
          season: parseInt(match[pattern.seasonGroup]),
          episode: parseInt(match[pattern.episodeGroup]),
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
 * Apply pattern to all unmatched files and match to episodes
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
      eq(files.mediaId, mediaId),
      isNull(files.episodeId)
    ),
  });
  
  // Get all episodes for this show
  const allEpisodes = await db.query.episodes.findMany({
    where: eq(episodes.mediaId, mediaId),
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
    
    // Find matching episode
    const matchingEpisode = allEpisodes.find(
      ep => ep.seasonNumber === season && ep.episodeNumber === episode
    );
    
    if (!matchingEpisode) {
      results.failed.push({
        fileId: file.id,
        filename,
        season,
        episode,
        reason: `Episode S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')} not found in database`,
      });
      continue;
    }
    
    if (autoMatch) {
      // Update file to link to episode
      await db.update(files)
        .set({ episodeId: matchingEpisode.id })
        .where(eq(files.id, file.id));
    }
    
    results.matched.push({
      fileId: file.id,
      filename,
      season,
      episode,
      episodeId: matchingEpisode.id,
      episodeName: matchingEpisode.name,
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
      eq(files.mediaId, mediaId),
      isNull(files.episodeId)
    ),
  });
  
  // Get all episodes
  const allEpisodes = await db.query.episodes.findMany({
    where: eq(episodes.mediaId, mediaId),
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
    
    const matchingEpisode = allEpisodes.find(
      ep => ep.seasonNumber === parsed.season && ep.episodeNumber === parsed.episode
    );
    
    if (!matchingEpisode) {
      results.failed.push({
        fileId: file.id,
        filename: file.path.split('/').pop(),
        season: parsed.season,
        episode: parsed.episode,
        reason: `Episode S${parsed.season.toString().padStart(2, '0')}E${parsed.episode.toString().padStart(2, '0')} not found`,
      });
      continue;
    }
    
    // Match!
    await db.update(files)
      .set({ episodeId: matchingEpisode.id })
      .where(eq(files.id, file.id));
    
    results.matched.push({
      fileId: file.id,
      filename: file.path.split('/').pop(),
      season: parsed.season,
      episode: parsed.episode,
      episodeId: matchingEpisode.id,
      episodeName: matchingEpisode.name,
    });
  }
  
  return c.json({
    total: unmatchedFiles.length,
    matched: results.matched.length,
    failed: results.failed.length,
    results,
  });
});

export default router;
