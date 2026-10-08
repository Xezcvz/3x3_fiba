const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const { login, logout, me } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่' },
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
