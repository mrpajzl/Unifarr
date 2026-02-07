import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Context, Next } from 'hono';

const JWT_SECRET = process.env.JWT_SECRET || 'unifarr-secret-change-in-production';
const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: number;
  username: string;
  role: 'admin' | 'user';
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Get user from context (after authenticate middleware)
 */
export function getUser(c: Context): JWTPayload | null {
  return c.get('user') || null;
}

/**
 * Hono middleware to authenticate requests
 */
export async function authenticate(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);

  if (!payload) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  c.set('user', payload);
  await next();
}

/**
 * Hono middleware to require admin role
 */
export async function requireAdmin(c: Context, next: Next) {
  const user = getUser(c);
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  await next();
}
