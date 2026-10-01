function errorHandler(err, req, res, next) {
  console.error('Error encountered:', err);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
}

module.exports = {
  errorHandler,
};
