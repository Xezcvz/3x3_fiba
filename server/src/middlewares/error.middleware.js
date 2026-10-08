function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  console.error('Request failed:', {
    method: req.method,
    path: req.path,
    message: err.message,
  });

  const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode
    : 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' : err.message,
  });
}

module.exports = {
  errorHandler,
};
