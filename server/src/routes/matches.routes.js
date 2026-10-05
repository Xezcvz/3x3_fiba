const express = require('express');
const router = express.Router();
const {
  getMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  resetMatchScores,
  resetAllMatches,
} = require('../controllers/matches.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', getMatches);
router.post('/reset-scores', authenticate, resetMatchScores);
router.post('/reset-all', authenticate, resetAllMatches);
router.get('/:id', getMatchById);
router.post('/', authenticate, createMatch);
router.put('/:id', authenticate, updateMatch);
router.delete('/:id', authenticate, deleteMatch);

module.exports = router;
