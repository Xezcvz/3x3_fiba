const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h', issuer: 'nvc-3x3', audience: 'nvc-3x3-admin' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { issuer: 'nvc-3x3', audience: 'nvc-3x3-admin' });
}

module.exports = {
  generateToken,
  verifyToken,
};
