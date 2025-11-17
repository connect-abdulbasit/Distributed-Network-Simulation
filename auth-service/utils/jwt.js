const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

exports.generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

exports.verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

exports.decodeToken = (token) => {
  return jwt.decode(token);
};