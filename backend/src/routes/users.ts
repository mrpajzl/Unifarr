/**
 * User Management & Profile Routes
 * 
 * Admin routes:
 * - GET /api/users - list all users
 * - GET /api/users/pending - pending approval queue
 * - PATCH /api/users/:id - update user (role, approval)
 * - DELETE /api/users/:id - delete user
 * 
 * User routes:
 * - GET /api/users/me - get own profile
 * - PATCH /api/users/me - update own profile
 * - PATCH /api/users/me/password - change password
 */

import { Hono } from 'hono';
import { prisma } from '../db/prisma';
import { requireAuth, requireRole, getCurrentUser } from '../middleware/auth';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors';
import bcrypt from 'bcrypt';

const router = new Hono();

// ──────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/users
 * List all users with filtering and pagination (admin only)
 */
router.get('/', requireAuth, requireRole('admin'), async (c) => {
  const query = c.req.query();
  
  // Filters
  const role = query.role;
  const approved = query.approved === 'true' ? true : query.approved === 'false' ? false : undefined;
  const limit = parseInt(query.limit || '50');
  const offset = parseInt(query.offset || '0');

  // Build where clause
  const where: any = {};
  if (role) where.role = role;
  if (approved !== undefined) where.approved = approved;

  // Get total count
  const total = await prisma.user.count({ where });

  // Get users with stats
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      role: true,
      approved: true,
      preferredLanguage: true,
      createdAt: true,
      _count: {
        select: {
          mediaRequests: true,
          processedRequests: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  // Format response
  const formattedUsers = users.map(user => ({
    id: user.id,
    username: user.username,
    role: user.role,
    approved: user.approved,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt,
    _stats: {
      mediaRequests: user._count.mediaRequests,
      processedRequests: user._count.processedRequests,
    },
  }));

  return c.json({
    users: formattedUsers,
    total,
    limit,
    offset,
  });
});

/**
 * GET /api/users/pending
 * Get users awaiting approval (admin only)
 */
router.get('/pending', requireAuth, requireRole('admin'), async (c) => {
  const pendingUsers = await prisma.user.findMany({
    where: { approved: false },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return c.json({
    pendingUsers,
    count: pendingUsers.length,
  });
});

/**
 * PATCH /api/users/:id
 * Update user (role, approval status) - admin only
 */
router.patch('/:id', requireAuth, requireRole('admin'), async (c) => {
  const userId = parseInt(c.req.param('id'));
  const currentUser = getCurrentUser(c);
  
  if (!userId || isNaN(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  const body = await c.req.json();
  const { role, approved } = body;

  // Validate role
  if (role && !['user', 'moderator', 'admin'].includes(role)) {
    throw new ValidationError('Invalid role. Must be: user, moderator, or admin');
  }

  // Check user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  // Prevent changing own role (security)
  if (userId === currentUser.id && role && role !== user.role) {
    throw new ForbiddenError('Cannot change your own role');
  }

  // Update user
  const updateData: any = {};
  if (role !== undefined) updateData.role = role;
  if (approved !== undefined) updateData.approved = approved;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      role: true,
      approved: true,
      preferredLanguage: true,
      createdAt: true,
    },
  });

  return c.json({
    success: true,
    user: updatedUser,
  });
});

/**
 * DELETE /api/users/:id
 * Delete user - admin only
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  const userId = parseInt(c.req.param('id'));
  const currentUser = getCurrentUser(c);
  
  if (!userId || isNaN(userId)) {
    throw new ValidationError('Invalid user ID');
  }

  // Check user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  // Prevent deleting yourself
  if (userId === currentUser.id) {
    throw new ForbiddenError('Cannot delete your own account');
  }

  // Delete user
  await prisma.user.delete({
    where: { id: userId },
  });

  return c.json({
    success: true,
    message: `User "${user.username}" deleted successfully`,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// USER PROFILE ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (c) => {
  const currentUser = getCurrentUser(c);

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      username: true,
      role: true,
      approved: true,
      preferredLanguage: true,
      createdAt: true,
      _count: {
        select: {
          mediaRequests: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return c.json({
    id: user.id,
    username: user.username,
    role: user.role,
    approved: user.approved,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt,
    _stats: {
      mediaRequests: user._count.mediaRequests,
    },
  });
});

/**
 * PATCH /api/users/me
 * Update own profile (language, etc.)
 */
router.patch('/me', requireAuth, async (c) => {
  const currentUser = getCurrentUser(c);
  const body = await c.req.json();
  
  const { preferredLanguage } = body;

  // Validate language (ISO 639-1 codes)
  const validLanguages = ['en', 'cs', 'de', 'fr', 'es', 'it', 'pl', 'ru', 'ja', 'ko', 'zh'];
  if (preferredLanguage && !validLanguages.includes(preferredLanguage)) {
    throw new ValidationError(
      `Invalid language. Supported: ${validLanguages.join(', ')}`
    );
  }

  // Update user
  const updateData: any = {};
  if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;

  const updatedUser = await prisma.user.update({
    where: { id: currentUser.id },
    data: updateData,
    select: {
      id: true,
      username: true,
      role: true,
      approved: true,
      preferredLanguage: true,
    },
  });

  return c.json({
    success: true,
    user: updatedUser,
  });
});

/**
 * PATCH /api/users/me/password
 * Change own password
 */
router.patch('/me/password', requireAuth, async (c) => {
  const currentUser = getCurrentUser(c);
  const body = await c.req.json();
  
  const { currentPassword, newPassword } = body;

  // Validation
  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('New password must be at least 6 characters');
  }

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify current password
  const passwordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatch) {
    throw new ValidationError('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: currentUser.id },
    data: { password: hashedPassword },
  });

  return c.json({
    success: true,
    message: 'Password updated successfully',
  });
});

export default router;
