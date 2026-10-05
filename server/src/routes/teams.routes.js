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
const { authenticate } = require('../middlewares/auth.middleware');
const { getGroups, autoDraw, manualDraw, resetDraw } = require('../controllers/draw.controller');

// Specific routes MUST come before /:id wildcard
router.get('/groups', getGroups);
router.post('/draw/auto', authenticate, autoDraw);
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
