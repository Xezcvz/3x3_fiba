const express = require('express');
const router = express.Router();
const {
  getTournamentBracket,
  generateKnockoutMatches,
  advanceKnockoutWinner,
  seedTournament24,
} = require('../controllers/tournament.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Public route: get bracket and standings for display
router.get('/bracket', getTournamentBracket);

// Protected routes for tournament admin
router.post('/generate-knockout', authenticate, generateKnockoutMatches);
router.post('/advance-winner', authenticate, advanceKnockoutWinner);
router.post('/seed-24', authenticate, seedTournament24);

module.exports = router;
