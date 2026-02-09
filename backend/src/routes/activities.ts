import { Hono } from 'hono';
import { getActivityManager } from '../services/activity-manager';

const app = new Hono();

/**
 * GET /api/activities
 * Get all activities
 */
app.get('/', (c) => {
  const manager = getActivityManager();
  const activities = manager.getAll();
  return c.json({ activities });
});

/**
 * GET /api/activities/active
 * Get active (running) activities
 */
app.get('/active', (c) => {
  const manager = getActivityManager();
  const activities = manager.getActive();
  return c.json({ activities });
});

/**
 * GET /api/activities/recent
 * Get recent completed/failed activities
 */
app.get('/recent', (c) => {
  const limit = parseInt(c.req.query('limit') || '10');
  const manager = getActivityManager();
  const activities = manager.getRecent(limit);
  return c.json({ activities });
});

/**
 * GET /api/activities/:id
 * Get specific activity
 */
app.get('/:id', (c) => {
  const id = c.req.param('id');
  const manager = getActivityManager();
  const activity = manager.get(id);
  
  if (!activity) {
    return c.json({ error: 'Activity not found' }, 404);
  }
  
  return c.json(activity);
});

/**
 * DELETE /api/activities
 * Clear all activities
 */
app.delete('/', (c) => {
  const manager = getActivityManager();
  manager.clear();
  return c.json({ success: true });
});

export default app;
