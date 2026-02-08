import { Hono } from 'hono';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticate,
  getUser,
  type JWTPayload,
} from '../lib/auth';

const router = new Hono();

/**
 * POST /api/auth/register
 * Register a new user (first user becomes admin)
 */
router.post('/register', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Check if username already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      return c.json({ error: 'Username already exists' }, 400);
    }

    // Check if this is the first user (will be admin and auto-approved)
    const [userCountResult] = await db.select({ count: count() }).from(users);
    const userCount = userCountResult.count;
    const role = userCount === 0 ? 'admin' : 'user';
    const approved = userCount === 0; // First user auto-approved

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const [newUser] = await db.insert(users).values({
      username,
      password: passwordHash,
      role,
      approved,
    }).returning();

    // If user is not approved (not first user), return pending message
    if (!approved) {
      return c.json({
        message: 'Registration successful! Your account is pending admin approval.',
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          approved: newUser.approved,
        },
        requiresApproval: true,
      });
    }

    // Generate token (only for auto-approved first user)
    const payload: JWTPayload = {
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role as 'admin' | 'user',
    };
    const token = generateToken(payload);

    return c.json({
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      },
      token,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check if user is approved
    if (!user.approved) {
      return c.json({ error: 'Your account is pending admin approval' }, 403);
    }

    // Generate token
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role as 'admin' | 'user',
    };
    const token = generateToken(payload);

    return c.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authenticate, async (c) => {
  try {
    const authUser = getUser(c);
    
    if (!authUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Fetch fresh user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.userId),
      columns: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error: any) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side should delete token)
 */
router.post('/logout', (c) => {
  // JWT is stateless, so we just return success
  // Client should delete the token
  return c.json({ message: 'Logged out successfully' });
});

export default router;
