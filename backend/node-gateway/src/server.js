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
const orgRoutes = require('./routes/organization.routes');
const questionnaireRoutes = require('./routes/questionnaire.routes');
const responseRoutes = require('./routes/response.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const aiRoutes = require('./routes/ai.routes');
const complianceAgentRoutes = require('./routes/compliance-agent.routes');
const auditRoutes = require('./routes/audit.routes');
const calendarRoutes = require('./routes/calendar.routes');

// Module Routes (v2)
const v2AssessmentRoutes = require('./modules/assessment/routes/assessment.routes');
const v2QuestionnaireRoutes = require('./modules/questionnaire/routes/questionnaire.routes');
const v2RiskRoutes = require('./modules/risk/routes/risk.routes');
const v2ReportingRoutes = require('./modules/reporting/routes/reporting.routes');

const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

const app = express();

app.set('etag', false);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/organization', orgRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/agent/compliance', complianceAgentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/calendar', calendarRoutes);

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
