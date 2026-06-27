const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Multer for avatar upload
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// GET /api/users/search?q=query
router.get('/search', authenticate, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const db = getDB();
  const query = q.toLowerCase();
  const users = db.tables.users
    .filter(u =>
      u.id !== req.user.id &&
      (u.username.toLowerCase().includes(query) ||
       u.full_name.toLowerCase().includes(query))
    )
    .map(({ password, email, ...u }) => u)
    .slice(0, 20);
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const user = db.findOne('users', { id: req.params.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Count posts, friends
  const postCount = db.findAll('posts', { author_id: req.params.id }).length;
  const friendCount = db.tables.friends.filter(f =>
    f.status === 'accepted' &&
    (f.sender_id === req.params.id || f.receiver_id === req.params.id)
  ).length;

  const { password, ...safeUser } = user;
  res.json({ ...safeUser, postCount, friendCount });
});

// PUT /api/users/profile
router.put('/profile', authenticate, (req, res) => {
  const { fullName, bio, username } = req.body;
  const db = getDB();

  // Check username uniqueness
  if (username) {
    const existing = db.findOne('users', { username });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'Username already taken' });
    }
  }

  const updates = {};
  if (fullName) updates.full_name = fullName;
  if (bio !== undefined) updates.bio = bio;
  if (username) updates.username = username;

  db.update('users', { id: req.user.id }, updates);
  const updated = db.findOne('users', { id: req.user.id });
  const { password, ...safeUser } = updated;
  res.json(safeUser);
});

// POST /api/users/avatar
router.post('/avatar', authenticate, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const db = getDB();
  db.update('users', { id: req.user.id }, { avatar: avatarUrl });
  res.json({ avatar: avatarUrl });
});

module.exports = router;
