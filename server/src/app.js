require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const teamsRoutes = require('./routes/teams.routes');
const matchesRoutes = require('./routes/matches.routes');
const newsRoutes = require('./routes/news.routes');
const statsRoutes = require('./routes/stats.routes');
const tournamentRoutes = require('./routes/tournament.routes');
const liveRoutes = require('./routes/live.routes');
const { publishLiveUpdate } = require('./utils/live-events');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
};

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:', 'https:'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Basketball Tournament API', timestamp: new Date() });
});

// API Routes
app.use('/api', (req, res, next) => {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isAuthenticationRoute = req.path.startsWith('/auth/');

  if (isMutation && !isAuthenticationRoute) {
    res.once('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) publishLiveUpdate();
    });
  }
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/tournament', tournamentRoutes);
app.use('/api/live', liveRoutes);

// Error handling middleware (must be BEFORE static serving)
app.use(errorHandler);

// Serve built React frontend from same Express server in production
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback — all non-API routes serve index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Basketball Tournament Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
