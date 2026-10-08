const express = require('express');
const router = express.Router();
const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  resetAllTeams,
} = require('../controllers/teams.controller');
const { getRosterResetPreview, resetToOfficialRoster } = require('../controllers/roster-reset.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { getGroups, prepareDraw, spinDraw, cancelDraw, autoDraw, manualDraw, resetDraw } = require('../controllers/draw.controller');

// Specific routes MUST come before /:id wildcard
router.get('/groups', getGroups);
router.get('/reset-roster/preview', authenticate, getRosterResetPreview);
router.post('/reset-roster', authenticate, resetToOfficialRoster);
router.post('/draw/auto', authenticate, autoDraw);
router.post('/draw/prepare', authenticate, prepareDraw);
router.post('/draw/spin', authenticate, spinDraw);
router.post('/draw/cancel', authenticate, cancelDraw);
router.post('/draw/manual', authenticate, manualDraw);
router.post('/draw/reset', authenticate, resetDraw);
router.post('/reset-all', authenticate, resetAllTeams);

// Generic CRUD
router.get('/', getTeams);
router.get('/:id', getTeamById);
router.post('/', authenticate, createTeam);
router.put('/:id', authenticate, updateTeam);
router.delete('/:id', authenticate, deleteTeam);

module.exports = router;
