const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { getGroups, prepareDraw, spinDraw, cancelDraw, autoDraw, manualDraw, generateGroupStageMatches, resetDraw } = require('../controllers/draw.controller');

// Public: view groups
router.get('/groups', getGroups);

// Admin protected
router.post('/draw/auto', authenticate, autoDraw);
router.post('/draw/prepare', authenticate, prepareDraw);
router.post('/draw/spin', authenticate, spinDraw);
router.post('/draw/cancel', authenticate, cancelDraw);
router.post('/draw/manual', authenticate, manualDraw);
router.post('/draw/generate-group-matches', authenticate, generateGroupStageMatches);
router.post('/draw/reset', authenticate, resetDraw);

module.exports = router;
