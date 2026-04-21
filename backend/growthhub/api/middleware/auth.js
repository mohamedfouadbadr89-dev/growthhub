const { verifyToken } = require('@clerk/backend');

/**
 * Middleware to verify Clerk JWT and extract org_id
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Extract user info
    req.auth = {
      userId: payload.sub,
      orgId: payload.org_id || payload.orgId, // Clerk uses org_id in JWT
    };

    if (!req.auth.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'User must belong to an organization' });
    }

    next();
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
};

module.exports = { requireAuth };
