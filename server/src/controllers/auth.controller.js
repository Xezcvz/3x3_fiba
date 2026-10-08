const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { generateToken } = require('../utils/jwt');

const SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

async function login(req, res, next) {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!/^[A-Za-z0-9._-]{3,32}$/.test(username) || password.length < 1 || password.length > 128) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = generateToken({ id: admin.id, username: admin.username });
    res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE_MS });

    return res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  return res.json({ message: 'ออกจากระบบแล้ว' });
}

async function me(req, res) {
  return res.json({
    admin: req.admin,
  });
}

module.exports = {
  login,
  logout,
  me,
};
