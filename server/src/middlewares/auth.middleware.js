const { verifyToken } = require('../utils/jwt');
const prisma = require('../prisma');

async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.admin_session;
    if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });
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
    return res.status(401).json({ message: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
  }
}

module.exports = {
  authenticate,
};
