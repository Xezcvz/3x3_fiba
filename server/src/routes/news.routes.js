const express = require('express');
const router = express.Router();
const {
  getNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
} = require('../controllers/news.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', getNews);
router.get('/:id', getNewsById);
router.post('/', authenticate, createNews);
router.put('/:id', authenticate, updateNews);
router.delete('/:id', authenticate, deleteNews);

module.exports = router;
