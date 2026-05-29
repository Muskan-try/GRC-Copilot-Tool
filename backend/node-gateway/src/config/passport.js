const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const crypto = require('crypto');
const { query } = require('./postgres');
const logger = require('./logger');

const FRONTEND_URL = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0];

// Shared verify callback for both providers
async function verify(provider, profile, cb) {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return cb(new Error('No email returned from provider'), null);
    }

    // 1. Try to find user by provider + provider_id
    const existing = await query(
      'SELECT id, email, role, is_active FROM users WHERE provider = $1 AND provider_id = $2',
      [provider, profile.id]
    );
    if (existing.rows.length) {
      if (!existing.rows[0].is_active) {
        return cb(new Error('Account deactivated'), null);
      }
      return cb(null, existing.rows[0]);
    }

    // 2. Try to find by email and link provider
    const byEmail = await query(
      'SELECT id, email, role, is_active FROM users WHERE email = $1',
      [email]
    );
    if (byEmail.rows.length) {
      if (!byEmail.rows[0].is_active) {
        return cb(new Error('Account deactivated'), null);
      }
      await query(
        'UPDATE users SET provider = $1, provider_id = $2, updated_at = NOW() WHERE id = $3',
        [provider, profile.id, byEmail.rows[0].id]
      );
      return cb(null, { ...byEmail.rows[0], provider, provider_id: profile.id });
    }

    // 3. Create new user
    const displayName = profile.displayName || email.split('@')[0];
    const orgSlug = `${displayName.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;

    const userResult = await query(
      `INSERT INTO users (email, password_hash, role, provider, provider_id, is_active)
       VALUES ($1, $2, 'user', $3, $4, true)
       RETURNING id, email, role, is_active`,
      [email, null, provider, profile.id]
    );
    const user = userResult.rows[0];

    // Create org + org_members entry
    const orgResult = await query(
      `INSERT INTO organizations (user_id, name) VALUES ($1, $2) RETURNING id`,
      [user.id, `${displayName}'s Organization`]
    );
    await query(
      `INSERT INTO org_members (org_id, user_id, role, status, invited_by)
       VALUES ($1, $2, 'owner', 'active', $2) ON CONFLICT DO NOTHING`,
      [orgResult.rows[0].id, user.id]
    );

    logger.info(`New OAuth user created: ${email} via ${provider}`);
    return cb(null, user);
  } catch (err) {
    logger.error(`OAuth ${provider} verify error:`, err);
    return cb(err, null);
  }
}

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    scope: ['profile', 'email'],
  }, (accessToken, refreshToken, profile, cb) => {
    verify('google', profile, cb);
  }));
  logger.info('Google OAuth strategy configured');
}

// Microsoft Azure AD Strategy
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL || '/api/auth/microsoft/callback',
    scope: ['user.read', 'email', 'openid', 'profile'],
    tenant: process.env.MICROSOFT_TENANT || 'common',
    authorizationURL: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT || 'common'}/oauth2/v2.0/authorize`,
    tokenURL: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT || 'common'}/oauth2/v2.0/token`,
  }, (accessToken, refreshToken, profile, cb) => {
    verify('microsoft', profile, cb);
  }));
  logger.info('Microsoft OAuth strategy configured');
}

module.exports = passport;
