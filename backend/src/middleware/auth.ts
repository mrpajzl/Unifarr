/**
 * Authentication & Authorization Middleware
 * 
 * Features:
 * - JWT token verification
 * - Role-based access control (RBAC) ready
 * - Permission checking (extensible)
 * - User context injection
 */

import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'unifarr-secret-change-in-production';

interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

/**
 * Require authentication - checks if user is logged in
 */
export const requireAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  console.log('[auth] Authorization header:', authHeader ? authHeader.substring(0, 30) + '...' : 'MISSING');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[auth] ❌ No valid Authorization header');
    return c.json({ 
      error: { 
        message: 'Authentication required', 
        code: 'AUTH_REQUIRED' 
      } 
    }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('[auth] Token extracted, length:', token.length);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('[auth] ✅ Token valid for user:', payload.userId);

    // Fetch fresh user data (includes role, preferredLanguage, etc.)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        role: true,
        approved: true,
        preferredLanguage: true, // For future multi-lang support
      },
    });

    if (!user) {
      return c.json({ 
        error: { 
          message: 'User not found', 
          code: 'USER_NOT_FOUND' 
        } 
      }, 401);
    }

    if (!user.approved && user.role !== 'admin') {
      return c.json({ 
        error: { 
          message: 'Account not approved', 
          code: 'ACCOUNT_NOT_APPROVED' 
        } 
      }, 403);
    }

    // Inject user into context (accessible in routes)
    c.set('user', user);
    c.set('userId', user.id);
    c.set('userRole', user.role);

    await next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json({ 
        error: { 
          message: 'Token expired', 
          code: 'TOKEN_EXPIRED' 
        } 
      }, 401);
    }

    return c.json({ 
      error: { 
        message: 'Invalid token', 
        code: 'INVALID_TOKEN' 
      } 
    }, 401);
  }
};

/**
 * Require specific role(s) - RBAC
 * Usage: requireRole('admin') or requireRole(['admin', 'moderator'])
 */
export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (c: Context, next: Next) => {
    const userRole = c.get('userRole') as string | undefined;

    if (!userRole) {
      return c.json({ 
        error: { 
          message: 'Authentication required', 
          code: 'AUTH_REQUIRED' 
        } 
      }, 401);
    }

    if (!roles.includes(userRole)) {
      return c.json({ 
        error: { 
          message: 'Insufficient permissions', 
          code: 'FORBIDDEN',
          details: { required: roles, current: userRole }
        } 
      }, 403);
    }

    await next();
  };
};

/**
 * Optional auth - doesn't block if no token, but injects user if present
 * Useful for routes that work for both authenticated and guest users
 */
export const optionalAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          role: true,
          approved: true,
          preferredLanguage: true,
        },
      });

      if (user) {
        c.set('user', user);
        c.set('userId', user.id);
        c.set('userRole', user.role);
      }
    } catch (error) {
      // Silent fail - continue as guest
    }
  }

  await next();
};

/**
 * Check specific permission (future-proof for granular permissions)
 * Usage: requirePermission('media.delete') or requirePermission(['media.edit', 'media.delete'])
 */
export const requirePermission = (permissions: string | string[]) => {
  const perms = Array.isArray(permissions) ? permissions : [permissions];

  return async (c: Context, next: Next) => {
    const userRole = c.get('userRole') as string | undefined;

    if (!userRole) {
      return c.json({ 
        error: { 
          message: 'Authentication required', 
          code: 'AUTH_REQUIRED' 
        } 
      }, 401);
    }

    // Admin has all permissions
    if (userRole === 'admin') {
      await next();
      return;
    }

    // TODO: Implement permission table and checking
    // For now, map basic permissions to roles:
    const rolePermissions: Record<string, string[]> = {
      user: [
        'media.view',
        'media.request',
        'downloads.view',
      ],
      moderator: [
        'media.view',
        'media.request',
        'media.add',
        'media.edit',
        'downloads.view',
        'downloads.manage',
      ],
      admin: ['*'], // All permissions
    };

    const userPermissions = rolePermissions[userRole] || [];
    const hasPermission = perms.some(perm => 
      userPermissions.includes('*') || userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return c.json({ 
        error: { 
          message: 'Insufficient permissions', 
          code: 'FORBIDDEN',
          details: { required: perms }
        } 
      }, 403);
    }

    await next();
  };
};

/**
 * Helper to get current user from context
 */
export const getCurrentUser = (c: Context) => {
  return c.get('user');
};
