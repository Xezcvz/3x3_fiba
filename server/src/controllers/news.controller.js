const prisma = require('../prisma');

async function getNews(req, res, next) {
  try {
    const { category, limit } = req.query;
    const where = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    const newsList = await prisma.news.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : undefined,
    });

    return res.json(newsList);
  } catch (error) {
    next(error);
  }
}

async function getNewsById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid news ID' });
    }

    const newsItem = await prisma.news.findUnique({
      where: { id },
    });

    if (!newsItem) {
      return res.status(404).json({ message: 'ไม่พบข่าวสารนี้' });
    }

    return res.json(newsItem);
  } catch (error) {
    next(error);
  }
}

async function createNews(req, res, next) {
  try {
    const { title, content, category, imageUrl } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'กรุณากรอกหัวข้อข่าวและเนื้อหาข่าว' });
    }

    const newsItem = await prisma.news.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category: category || 'ประกาศ',
        imageUrl: imageUrl || '',
      }
    });

    return res.status(201).json({ message: 'เผยแพร่ข่าวสารสำเร็จ', news: newsItem });
  } catch (error) {
    next(error);
  }
}

async function updateNews(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid news ID' });
    }

    const { title, content, category, imageUrl } = req.body;

    const updatedNews = await prisma.news.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        content: content !== undefined ? content.trim() : undefined,
        category: category !== undefined ? category : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
      }
    });

    return res.json({ message: 'อัปเดตข่าวสารสำเร็จ', news: updatedNews });
  } catch (error) {
    next(error);
  }
}

async function deleteNews(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid news ID' });
    }

    await prisma.news.delete({
      where: { id },
    });

    return res.json({ message: 'ลบข่าวสารสำเร็จ' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
};
