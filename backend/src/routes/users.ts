import { Hono } from 'hono';
import { prisma } from '../db/prisma';
import { authenticate, getUser, requireAdmin } from '../lib/auth';

const router = new Hono();

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticate, requireAdmin, async (c) => {
  try {
    const allUsers = await prisma.user.findMany({ 
      select: {
        id: true,
        username: true,
        role: true,
        approved: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ users: allUsers });
  } catch (error: any) {
    console.error('Get users error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/users/:id/approve
 * Approve a user (admin only)
 */
router.post('/:id/approve', authenticate, requireAdmin, async (c) => {
  try {
    const userId = parseInt(c.req.param('id'));
    
    if (!userId) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true, approved: true },
    });
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (user.approved) {
      return c.json({ error: 'User is already approved' }, 400);
    }

    // Approve user
    await prisma.user.updateMany(
      { data: { approved: true },
       where: { id: userId } });

    return c.json({ 
      message: `User ${user.username} approved successfully`,
      user: {
        id: user.id,
        username: user.username,
        approved: true,
      },
    });
  } catch (error: any) {
    console.error('Approve user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/users/:id/reject
 * Reject/delete a pending user (admin only)
 */
router.post('/:id/reject', authenticate, requireAdmin, async (c) => {
  try {
    const userId = parseInt(c.req.param('id'));
    const authUser = getUser(c);
    
    if (!userId) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Can't delete yourself
    if (userId === authUser?.userId) {
      return c.json({ error: 'Cannot reject your own account' }, 400);
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true, approved: true },
    });
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Clean up foreign key references before deleting user
    try {
      // Set processedBy to NULL for requests processed by this user
      await prisma.mediaRequest.updateMany({
        data: { processedBy: null },
        where: { processedBy: userId },
      });
      
      // Delete requests created by this user
      await prisma.mediaRequest.deleteMany({
        where: { userId },
      });
    } catch (err) {
      console.warn('Error cleaning up media requests:', err);
    }
    
    // Delete user
    await prisma.user.delete({ where: { id: userId } });

    return c.json({ 
      message: `User ${user.username} deleted successfully`,
    });
  } catch (error: any) {
    console.error('Reject user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (c) => {
  try {
    const userId = parseInt(c.req.param('id'));
    const authUser = getUser(c);
    
    if (!userId) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Can't delete yourself
    if (userId === authUser?.userId) {
      return c.json({ error: 'Cannot delete your own account' }, 400);
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true },
    });
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Clean up foreign key references before deleting user
    try {
      // Set processedBy to NULL for requests processed by this user
      await prisma.mediaRequest.updateMany({
        data: { processedBy: null },
        where: { processedBy: userId },
      });
      
      // Delete requests created by this user
      await prisma.mediaRequest.deleteMany({
        where: { userId },
      });
    } catch (err) {
      console.warn('Error cleaning up media requests:', err);
    }
    
    // Delete user
    await prisma.user.delete({ where: { id: userId } });

    return c.json({ 
      message: `User ${user.username} deleted successfully`,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PUT /api/users/:id/role
 * Change user role (admin only)
 */
router.put('/:id/role', authenticate, requireAdmin, async (c) => {
  try {
    const userId = parseInt(c.req.param('id'));
    const { role } = await c.req.json();
    const authUser = getUser(c);
    
    if (!userId) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    if (!role || !['admin', 'user'].includes(role)) {
      return c.json({ error: 'Invalid role. Must be "admin" or "user"' }, 400);
    }

    // Can't change your own role
    if (userId === authUser?.userId) {
      return c.json({ error: 'Cannot change your own role' }, 400);
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Update role
    await prisma.user.updateMany(
      { data: { role },
       where: { id: userId } });

    return c.json({ 
      message: `User ${user.username} role updated to ${role}`,
      user: {
        id: user.id,
        username: user.username,
        role,
      },
    });
  } catch (error: any) {
    console.error('Update role error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default router;
