const prisma = require('../prisma');
const { z } = require('zod');

const newsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(20_000),
  category: z.enum(['ประกาศ', 'ผลการแข่งขัน', 'ข่าวทีม', 'ระเบียบการ', 'ไฮไลท์']).optional(),
  imageUrl: z.union([z.literal(''), z.string().url().max(1000)]).optional(),
}).strict();

function parseNewsInput(input, partial = false) {
  const parsed = (partial ? newsSchema.partial() : newsSchema).safeParse(input);
  return parsed.success ? { data: parsed.data } : { error: parsed.error.issues[0]?.message || 'ข้อมูลข่าวไม่ถูกต้อง' };
}

async function getNews(req, res, next) {
  try {
    const { category, limit } = req.query;
    const where = {};

    if (category && category !== 'all') {
      if (!['ประกาศ', 'ผลการแข่งขัน', 'ข่าวทีม', 'ระเบียบการ', 'ไฮไลท์'].includes(category)) {
        return res.status(400).json({ message: 'หมวดหมู่ข่าวไม่ถูกต้อง' });
      }
      where.category = category;
    }

    const parsedLimit = limit === undefined ? undefined : Number(limit);
    if (parsedLimit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)) {
      return res.status(400).json({ message: 'limit ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 100' });
    }

    const newsList = await prisma.news.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parsedLimit,
    });

    return res.json(newsList);
  } catch (error) {
    next(error);
  }
}

async function getNewsById(req, res, next) {
  try {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
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

    const parsed = parseNewsInput({ title, content, category, imageUrl: imageUrl ?? '' });
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const newsItem = await prisma.news.create({
      data: {
        ...parsed.data,
        category: parsed.data.category || 'ประกาศ',
        imageUrl: parsed.data.imageUrl || '',
      }
    });

    return res.status(201).json({ message: 'เผยแพร่ข่าวสารสำเร็จ', news: newsItem });
  } catch (error) {
    next(error);
  }
}

async function updateNews(req, res, next) {
  try {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid news ID' });
    }

    const parsed = parseNewsInput(req.body, true);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข' });

    const updatedNews = await prisma.news.update({
      where: { id },
      data: {
        ...parsed.data,
      }
    });

    return res.json({ message: 'อัปเดตข่าวสารสำเร็จ', news: updatedNews });
  } catch (error) {
    next(error);
  }
}

async function deleteNews(req, res, next) {
  try {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
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
