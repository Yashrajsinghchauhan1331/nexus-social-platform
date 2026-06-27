const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Multer for post media
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/posts')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `post_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos allowed'));
    }
  }
});

function enrichPost(post, db, currentUserId) {
  const author = db.findOne('users', { id: post.author_id });
  const likes = db.findAll('post_likes', { post_id: post.id });
  const tags = db.findAll('post_tags', { post_id: post.id }).map(tag => {
    const taggedUser = db.findOne('users', { id: tag.user_id });
    return taggedUser ? { id: taggedUser.id, username: taggedUser.username, full_name: taggedUser.full_name } : null;
  }).filter(Boolean);

  return {
    ...post,
    author: author ? { id: author.id, username: author.username, full_name: author.full_name, avatar: author.avatar } : null,
    likeCount: likes.length,
    isLiked: likes.some(l => l.user_id === currentUserId),
    tags
  };
}

// POST /api/posts - create post
router.post('/', authenticate, mediaUpload.single('media'), (req, res) => {
  const { content, taggedUsers } = req.body;
  if (!content && !req.file) {
    return res.status(400).json({ error: 'Post must have content or media' });
  }

  const db = getDB();
  const postId = uuidv4();
  const mediaUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;
  const mediaType = req.file
    ? (req.file.mimetype.startsWith('video/') ? 'video' : 'image')
    : null;

  const post = {
    id: postId,
    author_id: req.user.id,
    content: content || '',
    media_url: mediaUrl,
    media_type: mediaType,
    created_at: new Date().toISOString()
  };

  db.insert('posts', post);

  // Handle tags
  if (taggedUsers) {
    let tags = [];
    try { tags = JSON.parse(taggedUsers); } catch { tags = []; }
    tags.forEach(userId => {
      db.insert('post_tags', {
        id: uuidv4(),
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
    });
  }

  res.status(201).json(enrichPost(post, db, req.user.id));
});

// GET /api/posts/feed - news feed (friends' posts)
router.get('/feed', authenticate, (req, res) => {
  const db = getDB();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Get friends
  const friendships = db.tables.friends.filter(f =>
    f.status === 'accepted' &&
    (f.sender_id === req.user.id || f.receiver_id === req.user.id)
  );
  const friendIds = friendships.map(f =>
    f.sender_id === req.user.id ? f.receiver_id : f.sender_id
  );
  const feedUserIds = [...friendIds, req.user.id];

  // Get posts from friends + self
  const allPosts = db.tables.posts
    .filter(p => feedUserIds.includes(p.author_id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = allPosts.length;
  const posts = allPosts
    .slice((page - 1) * limit, page * limit)
    .map(p => enrichPost(p, db, req.user.id));

  res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
});

// GET /api/posts/user/:userId - user's posts
router.get('/user/:userId', authenticate, (req, res) => {
  const db = getDB();
  const posts = db.tables.posts
    .filter(p => p.author_id === req.params.userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(p => enrichPost(p, db, req.user.id));
  res.json(posts);
});

// GET /api/posts/:id - single post
router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const post = db.findOne('posts', { id: req.params.id });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(enrichPost(post, db, req.user.id));
});

// POST /api/posts/:id/like - toggle like
router.post('/:id/like', authenticate, (req, res) => {
  const db = getDB();
  const post = db.findOne('posts', { id: req.params.id });
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = db.tables.post_likes.find(
    l => l.post_id === req.params.id && l.user_id === req.user.id
  );

  if (existing) {
    db.delete('post_likes', { post_id: req.params.id, user_id: req.user.id });
    res.json({ liked: false, likeCount: db.findAll('post_likes', { post_id: req.params.id }).length });
  } else {
    db.insert('post_likes', {
      id: uuidv4(),
      post_id: req.params.id,
      user_id: req.user.id,
      created_at: new Date().toISOString()
    });
    res.json({ liked: true, likeCount: db.findAll('post_likes', { post_id: req.params.id }).length });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  const post = db.findOne('posts', { id: req.params.id });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  db.delete('posts', { id: req.params.id });
  db.delete('post_likes', { post_id: req.params.id });
  db.delete('post_tags', { post_id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
