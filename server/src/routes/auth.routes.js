const express = require('express');
const router = express.Router();
const { login, me } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/login', login);
router.get('/me', authenticate, me);

module.exports = router;
