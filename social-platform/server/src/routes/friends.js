const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/friends - list accepted friends
router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const friendships = db.tables.friends.filter(f =>
    f.status === 'accepted' &&
    (f.sender_id === req.user.id || f.receiver_id === req.user.id)
  );

  const friends = friendships.map(f => {
    const friendId = f.sender_id === req.user.id ? f.receiver_id : f.sender_id;
    const user = db.findOne('users', { id: friendId });
    if (!user) return null;
    const { password, ...safe } = user;
    return { ...safe, friendshipId: f.id, since: f.updated_at || f.created_at };
  }).filter(Boolean);

  res.json(friends);
});

// GET /api/friends/requests - pending friend requests received
router.get('/requests', authenticate, (req, res) => {
  const db = getDB();
  const requests = db.tables.friends.filter(f =>
    f.status === 'pending' && f.receiver_id === req.user.id
  );

  const result = requests.map(f => {
    const sender = db.findOne('users', { id: f.sender_id });
    if (!sender) return null;
    const { password, ...safe } = sender;
    return { ...safe, requestId: f.id, sentAt: f.created_at };
  }).filter(Boolean);

  res.json(result);
});

// GET /api/friends/sent - pending requests sent
router.get('/sent', authenticate, (req, res) => {
  const db = getDB();
  const sent = db.tables.friends.filter(f =>
    f.status === 'pending' && f.sender_id === req.user.id
  );

  const result = sent.map(f => {
    const receiver = db.findOne('users', { id: f.receiver_id });
    if (!receiver) return null;
    const { password, ...safe } = receiver;
    return { ...safe, requestId: f.id, sentAt: f.created_at };
  }).filter(Boolean);

  res.json(result);
});

// POST /api/friends/request/:userId - send friend request
router.post('/request/:userId', authenticate, (req, res) => {
  const db = getDB();
  const targetId = req.params.userId;

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Cannot send request to yourself' });
  }

  const targetUser = db.findOne('users', { id: targetId });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // Check existing friendship/request
  const existing = db.tables.friends.find(f =>
    (f.sender_id === req.user.id && f.receiver_id === targetId) ||
    (f.sender_id === targetId && f.receiver_id === req.user.id)
  );

  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ error: 'Already friends' });
    if (existing.status === 'pending') return res.status(409).json({ error: 'Request already sent' });
  }

  const friendship = {
    id: uuidv4(),
    sender_id: req.user.id,
    receiver_id: targetId,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  db.insert('friends', friendship);
  res.status(201).json({ message: 'Friend request sent', friendship });
});

// PUT /api/friends/accept/:requestId
router.put('/accept/:requestId', authenticate, (req, res) => {
  const db = getDB();
  const request = db.findOne('friends', { id: req.params.requestId });

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.receiver_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Request already handled' });

  db.update('friends', { id: req.params.requestId }, { status: 'accepted' });
  res.json({ message: 'Friend request accepted' });
});

// PUT /api/friends/reject/:requestId
router.put('/reject/:requestId', authenticate, (req, res) => {
  const db = getDB();
  const request = db.findOne('friends', { id: req.params.requestId });

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.receiver_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  db.delete('friends', { id: req.params.requestId });
  res.json({ message: 'Friend request rejected' });
});

// DELETE /api/friends/:userId - unfriend
router.delete('/:userId', authenticate, (req, res) => {
  const db = getDB();
  const friendship = db.tables.friends.find(f =>
    f.status === 'accepted' &&
    ((f.sender_id === req.user.id && f.receiver_id === req.params.userId) ||
     (f.sender_id === req.params.userId && f.receiver_id === req.user.id))
  );

  if (!friendship) return res.status(404).json({ error: 'Friendship not found' });
  db.delete('friends', { id: friendship.id });
  res.json({ message: 'Unfriended successfully' });
});

// GET /api/friends/status/:userId - check friendship status
router.get('/status/:userId', authenticate, (req, res) => {
  const db = getDB();
  const friendship = db.tables.friends.find(f =>
    (f.sender_id === req.user.id && f.receiver_id === req.params.userId) ||
    (f.sender_id === req.params.userId && f.receiver_id === req.user.id)
  );

  if (!friendship) return res.json({ status: 'none' });

  let statusDetails = { status: friendship.status, requestId: friendship.id };
  if (friendship.status === 'pending') {
    statusDetails.isSender = friendship.sender_id === req.user.id;
  }
  res.json(statusDetails);
});

module.exports = router;
