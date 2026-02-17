import { Hono } from 'hono';
import { db } from '../db';
import { mediaRequests, users, mediaItems } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate, requireAdmin, getUser } from '../lib/auth';

const router = new Hono();

/**
 * GET /api/requests
 * List media requests
 * - Admin: See all requests
 * - User: See only their own requests
 */
router.get('/', authenticate, async (c) => {
  try {
    const user = getUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const query = db.select({
      id: mediaRequests.id,
      userId: mediaRequests.userId,
      username: users.username,
      tmdbId: mediaRequests.tmdbId,
      type: mediaRequests.type,
      title: mediaRequests.title,
      year: mediaRequests.year,
      posterPath: mediaRequests.posterPath,
      status: mediaRequests.status,
      userNote: mediaRequests.userNote,
      adminNote: mediaRequests.adminNote,
      requestedAt: mediaRequests.requestedAt,
      processedAt: mediaRequests.processedAt,
      mediaItemId: mediaRequests.mediaItemId,
    })
    .from(mediaRequests)
    .leftJoin(users, eq(mediaRequests.userId, users.id))
    .orderBy(desc(mediaRequests.requestedAt));

    const requests = user.role === 'admin'
      ? await query
      : await query.where(eq(mediaRequests.userId, user.userId));

    return c.json({ requests });
  } catch (error: any) {
    console.error('List requests error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/requests
 * Create a new media request
 */
router.post('/', authenticate, async (c) => {
  try {
    const user = getUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { tmdbId, type, title, year, posterPath, userNote } = await c.req.json();

    if (!tmdbId || !type || !title) {
      return c.json({ error: 'tmdbId, type, and title are required' }, 400);
    }

    if (type !== 'movie' && type !== 'tv') {
      return c.json({ error: 'type must be "movie" or "tv"' }, 400);
    }

    // Check if user already requested this
    const existing = await db.query.mediaRequests.findFirst({
      where: and(
        eq(mediaRequests.userId, user.userId),
        eq(mediaRequests.tmdbId, tmdbId),
        eq(mediaRequests.type, type)
      ),
    });

    if (existing) {
      return c.json({ 
        error: 'You already requested this item',
        existingRequest: existing,
      }, 400);
    }

    // Check if already in library
    const inLibrary = await db.query.mediaItems.findFirst({
      where: and(
        eq(mediaItems.tmdbId, tmdbId),
        eq(mediaItems.type, type)
      ),
    });

    if (inLibrary) {
      return c.json({ 
        error: 'This item is already in the library',
        mediaItem: inLibrary,
      }, 400);
    }

    // Create request
    const [newRequest] = await db.insert(mediaRequests).values({
      userId: user.userId,
      tmdbId,
      type,
      title,
      year: year || null,
      posterPath: posterPath || null,
      userNote: userNote || null,
      status: 'pending',
    }).returning();

    return c.json({ request: newRequest }, 201);
  } catch (error: any) {
    console.error('Create request error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /api/requests/:id/approve
 * Approve a request (admin only)
 */
router.patch('/:id/approve', authenticate, requireAdmin, async (c) => {
  try {
    const user = getUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestId = parseInt(c.req.param('id'));
    const { adminNote } = await c.req.json();

    // Get request
    const request = await db.query.mediaRequests.findFirst({
      where: eq(mediaRequests.id, requestId),
    });

    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    if (request.status !== 'pending') {
      return c.json({ error: `Request is already ${request.status}` }, 400);
    }

    // Update request status
    const [updated] = await db.update(mediaRequests)
      .set({
        status: 'approved',
        processedAt: new Date(),
        processedBy: user.userId,
        adminNote: adminNote || null,
      })
      .where(eq(mediaRequests.id, requestId))
      .returning();

    // TODO: Trigger auto-download flow here

    return c.json({ request: updated });
  } catch (error: any) {
    console.error('Approve request error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /api/requests/:id/deny
 * Deny a request (admin only)
 */
router.patch('/:id/deny', authenticate, requireAdmin, async (c) => {
  try {
    const user = getUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestId = parseInt(c.req.param('id'));
    const { adminNote } = await c.req.json();

    // Get request
    const request = await db.query.mediaRequests.findFirst({
      where: eq(mediaRequests.id, requestId),
    });

    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    if (request.status !== 'pending') {
      return c.json({ error: `Request is already ${request.status}` }, 400);
    }

    // Update request status
    const [updated] = await db.update(mediaRequests)
      .set({
        status: 'denied',
        processedAt: new Date(),
        processedBy: user.userId,
        adminNote: adminNote || null,
      })
      .where(eq(mediaRequests.id, requestId))
      .returning();

    return c.json({ request: updated });
  } catch (error: any) {
    console.error('Deny request error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * DELETE /api/requests/:id
 * Delete a request
 * - Admin: Can delete any request
 * - User: Can only delete their own pending requests
 */
router.delete('/:id', authenticate, async (c) => {
  try {
    const user = getUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestId = parseInt(c.req.param('id'));

    // Get request
    const request = await db.query.mediaRequests.findFirst({
      where: eq(mediaRequests.id, requestId),
    });

    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    // Check permissions
    if (user.role !== 'admin') {
      if (request.userId !== user.userId) {
        return c.json({ error: 'You can only delete your own requests' }, 403);
      }
      if (request.status !== 'pending') {
        return c.json({ error: 'You can only delete pending requests' }, 403);
      }
    }

    // Delete request
    await db.delete(mediaRequests).where(eq(mediaRequests.id, requestId));

    return c.json({ message: 'Request deleted successfully' });
  } catch (error: any) {
    console.error('Delete request error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default router;
