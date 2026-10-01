require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const teamsRoutes = require('./routes/teams.routes');
const matchesRoutes = require('./routes/matches.routes');
const newsRoutes = require('./routes/news.routes');
const statsRoutes = require('./routes/stats.routes');
const tournamentRoutes = require('./routes/tournament.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS: allow all in dev, restrict to ALLOWED_ORIGIN in production
const corsOptions = process.env.ALLOWED_ORIGIN
  ? { origin: process.env.ALLOWED_ORIGIN, credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Basketball Tournament API', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/tournament', tournamentRoutes);

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
