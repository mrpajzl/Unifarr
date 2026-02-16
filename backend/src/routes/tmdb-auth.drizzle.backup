import { Hono } from 'hono';
import { getTMDBApiKey } from './settings';

const app = new Hono();

// Step 1: Create a request token
app.post('/request-token', async (c) => {
  try {
    const apiKey = await getTMDBApiKey();
    if (!apiKey) {
      return c.json({ error: 'TMDB API key not configured. Please add it in Settings.' }, 400);
    }

    const response = await fetch(
      `https://api.themoviedb.org/3/authentication/token/new?api_key=${apiKey}`
    );
    const data = await response.json();
    
    if (!data.success) {
      return c.json({ error: 'Failed to create request token' }, 500);
    }

    return c.json({
      requestToken: data.request_token,
      expiresAt: data.expires_at,
      authUrl: `https://www.themoviedb.org/authenticate/${data.request_token}?redirect_to=${encodeURIComponent(process.env.APP_URL || 'http://localhost:3001')}/settings?tmdb_auth=approved`,
    });
  } catch (error) {
    console.error('Request token error:', error);
    return c.json({ error: 'Failed to create request token' }, 500);
  }
});

// Step 2: Create session from authorized token
app.post('/create-session', async (c) => {
  try {
    const { requestToken } = await c.req.json();
    const apiKey = await getTMDBApiKey();

    const response = await fetch(
      `https://api.themoviedb.org/3/authentication/session/new?api_key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token: requestToken }),
      }
    );
    const data = await response.json();

    if (!data.success) {
      return c.json({ error: 'Failed to create session' }, 500);
    }

    // Get account details
    const accountResponse = await fetch(
      `https://api.themoviedb.org/3/account?api_key=${apiKey}&session_id=${data.session_id}`
    );
    const account = await accountResponse.json();

    return c.json({
      sessionId: data.session_id,
      account: {
        id: account.id,
        username: account.username,
        name: account.name,
        avatar: account.avatar?.tmdb?.avatar_path
          ? `https://image.tmdb.org/t/p/w64${account.avatar.tmdb.avatar_path}`
          : null,
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});

// Get account details
app.get('/account', async (c) => {
  try {
    const sessionId = c.req.query('session_id');
    if (!sessionId) {
      return c.json({ error: 'Session ID required' }, 400);
    }

    const apiKey = await getTMDBApiKey();
    const response = await fetch(
      `https://api.themoviedb.org/3/account?api_key=${apiKey}&session_id=${sessionId}`
    );
    const account = await response.json();

    if (account.status_code) {
      return c.json({ error: account.status_message }, 401);
    }

    return c.json({
      id: account.id,
      username: account.username,
      name: account.name,
      avatar: account.avatar?.tmdb?.avatar_path
        ? `https://image.tmdb.org/t/p/w64${account.avatar.tmdb.avatar_path}`
        : null,
    });
  } catch (error) {
    console.error('Get account error:', error);
    return c.json({ error: 'Failed to get account' }, 500);
  }
});

// Logout (delete session)
app.delete('/session', async (c) => {
  try {
    const { sessionId } = await c.req.json();
    const apiKey = await getTMDBApiKey();

    const response = await fetch(
      `https://api.themoviedb.org/3/authentication/session?api_key=${apiKey}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      }
    );
    const data = await response.json();

    return c.json({ success: data.success });
  } catch (error) {
    console.error('Delete session error:', error);
    return c.json({ error: 'Failed to delete session' }, 500);
  }
});

export default app;
