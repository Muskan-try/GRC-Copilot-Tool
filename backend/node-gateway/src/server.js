require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectPostgres, runMigrations } = require('./config/postgres');
const { connectMongo } = require('./config/mongo');
const logger = require('./config/logger');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const orgDashboardRoutes = require('./routes/org.routes');
const orgRoutes = require('./routes/organization.routes');
const questionnaireRoutes = require('./routes/questionnaire.routes');
const responseRoutes = require('./routes/response.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const aiRoutes = require('./routes/ai.routes');
const complianceAgentRoutes = require('./routes/compliance-agent.routes');
const auditRoutes = require('./routes/audit.routes');
const calendarRoutes = require('./routes/calendar.routes');
const collabRoutes = require('./routes/collaboration.routes');
const policiesRoutes = require('./routes/policies.routes');

// Module Routes (v2)
const v2AssessmentRoutes = require('./modules/assessment/routes/assessment.routes');
const v2QuestionnaireRoutes = require('./modules/questionnaire/routes/questionnaire.routes');
const v2RiskRoutes = require('./modules/risk/routes/risk.routes');
const v2ReportingRoutes = require('./modules/reporting/routes/reporting.routes');

const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const { authenticate } = require('./middleware/auth');

const app = express();

app.set('trust proxy', true);
app.set('etag', false);
const passport = require('./config/passport');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
}));
app.use(passport.initialize());

// ─── CORS Configuration ──────────────────────────────────────────────────
function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('FATAL: CORS_ORIGIN not set in production. Refusing to start.');
      process.exit(1);
    }
    return ['http://localhost:5173'];
  }
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

app.use(cors({
  origin: getAllowedOrigins(),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400,
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────
// Global default: 200 per 15 minutes
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000000 : (parseInt(process.env.RATE_LIMIT_MAX) || 10000),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

// Auth-specific: prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

// Upload-specific: prevent resource exhaustion
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Upload limit reached. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

// AI-specific: prevent compute exhaustion
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'AI request limit reached. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// ─── Global Auth Middleware ──────────────────────────────────────────────
// Protect ALL /api/* routes by default with explicit public exemptions.
// This prevents accidental exposure of new routes that forget to add
// the authenticate middleware.

const PUBLIC_API_PATHS = [
  '/auth/register',
  '/auth/login',
  '/auth/google',
  '/auth/google/callback',
  '/auth/microsoft',
  '/auth/microsoft/callback',
];

app.use('/api', (req, res, next) => {
  if (PUBLIC_API_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }
  return authenticate(req, res, next);
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/org', orgDashboardRoutes);
app.use('/api/organization', orgRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/agent/compliance', uploadLimiter, complianceAgentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/collab', collabRoutes);
app.use('/api/policies', uploadLimiter, policiesRoutes);

// V2 Modular Routes
app.use('/api/v2/assessment', v2AssessmentRoutes);
app.use('/api/v2/questionnaire', v2QuestionnaireRoutes);
app.use('/api/v2/risk', v2RiskRoutes);
app.use('/api/v2/reporting', v2ReportingRoutes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'grc-gateway', version: '1.0.0', timestamp: new Date().toISOString() }));

// Error handling
app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  try {
    // Validate JWT_SECRET before starting
    if (!process.env.JWT_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('FATAL: JWT_SECRET is not set in production mode. Refusing to start.');
        process.exit(1);
      } else {
        logger.warn('WARNING: JWT_SECRET not set. Using development fallback. DO NOT deploy this to production.');
      }
    }
    
    await connectPostgres().catch(err => logger.error('PostgreSQL connection failed, continuing in standalone mode:', err.message));
    try {
      await runMigrations();
    } catch (migErr) {
      logger.error('Database migrations failed, continuing:', migErr.message);
    }
    await connectMongo().catch(err => logger.error('MongoDB connection failed, continuing in standalone mode:', err.message));
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`GRC Copilot Gateway running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to bootstrap server cleanly:', err);
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`GRC Copilot Gateway running on port ${PORT} (Emergency Standalone Mode)`);
    });
  }
}

bootstrap();
module.exports = app;
