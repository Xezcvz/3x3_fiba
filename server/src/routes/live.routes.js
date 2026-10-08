const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { subscribeToLiveEvents } = require('../utils/live-events');

const router = express.Router();
const connectionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.get('/events', connectionLimiter, subscribeToLiveEvents);

module.exports = router;
