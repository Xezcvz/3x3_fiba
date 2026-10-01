const { verifyToken } = require('../utils/jwt');
const prisma = require('../prisma');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'โปรดเข้าสู่ระบบก่อนดำเนินการ (Authorization header missing or invalid)' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, name: true }
    });

    if (!admin) {
      return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ดูแลระบบ หรือ Token หมดอายุ' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ', error: error.message });
  }
}

module.exports = {
  authenticate,
};
