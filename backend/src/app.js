const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');

const { allowedOrigins, isProduction } = require('./config/env');
const errorHandler = require('./middleware/error.middleware');
const { attachRequestContext } = require('./middleware/request-context.middleware');
const { setupExpressErrorHandler } = require('./services/sentry.service');
const accountRoutes = require('./routes/account.routes');
const aiRoutes = require('./routes/ai.routes');
const authRoutes = require('./routes/auth.routes');
const billingRoutes = require('./routes/billing.routes');
const budgetRoutes = require('./routes/budget.routes');
const cardRoutes = require('./routes/card.routes');
const categoryRoutes = require('./routes/category.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const goalRoutes = require('./routes/goal.routes');
const healthRoutes = require('./routes/health.routes');
const observabilityRoutes = require('./routes/observability.routes');
const recurringRoutes = require('./routes/recurring.routes');
const reportsRoutes = require('./routes/reports.routes');
const transactionRoutes = require('./routes/transaction.routes');
const usersRoutes = require('./routes/users.routes');
const billingController = require('./controllers/billing.controller');

const app = express();
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(attachRequestContext);
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('The request origin is not allowed by CORS.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'baggage', 'sentry-trace'],
    exposedHeaders: ['X-Request-Id'],
  })
);

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (hasFrontendBuild) {
  app.use(
    express.static(frontendDistPath, {
      index: false,
      maxAge: isProduction ? '1h' : 0,
    })
  );
}

app.get('/', (req, res) => {
  if (hasFrontendBuild) {
    return res.sendFile(frontendIndexPath);
  }

  res.json({
    message: 'Personal Finance Tracker API is running.',
    health: '/api/health',
    auth: '/api/auth',
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/observability', observabilityRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/recurring-payments', recurringRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/users', usersRoutes);
app.use('/api/users', usersRoutes);

if (hasFrontendBuild) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/users')) {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
}

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found.',
    error: 'Route not found.',
    request_id: req.requestId,
  });
});

setupExpressErrorHandler(app);
app.use(errorHandler);

module.exports = app;
