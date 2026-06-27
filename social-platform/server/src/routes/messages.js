const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations - list all conversations
router.get('/conversations', authenticate, (req, res) => {
  const db = getDB();
  const userId = req.user.id;

  // Find all unique people the current user has messaged
  const allMessages = db.tables.messages.filter(m =>
    m.sender_id === userId || m.receiver_id === userId
  );

  const conversationMap = new Map();
  allMessages.forEach(msg => {
    const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    const existing = conversationMap.get(otherId);
    if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
      conversationMap.set(otherId, msg);
    }
  });

  const conversations = [];
  for (const [otherId, lastMsg] of conversationMap) {
    const otherUser = db.findOne('users', { id: otherId });
    if (!otherUser) continue;
    const { password, ...safeUser } = otherUser;
    const unreadCount = db.tables.messages.filter(
      m => m.sender_id === otherId && m.receiver_id === userId && !m.read
    ).length;
    conversations.push({
      user: safeUser,
      lastMessage: lastMsg,
      unreadCount
    });
  }

  conversations.sort((a, b) =>
    new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
  );

  res.json(conversations);
});

// GET /api/messages/:userId - conversation with a specific user
router.get('/:userId', authenticate, (req, res) => {
  const db = getDB();
  const currentUserId = req.user.id;
  const otherId = req.params.userId;

  const messages = db.tables.messages
    .filter(m =>
      (m.sender_id === currentUserId && m.receiver_id === otherId) ||
      (m.sender_id === otherId && m.receiver_id === currentUserId)
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Mark messages as read
  db.tables.messages = db.tables.messages.map(m => {
    if (m.sender_id === otherId && m.receiver_id === currentUserId && !m.read) {
      return { ...m, read: true };
    }
    return m;
  });
  db.save('messages');

  // Include sender info
  const enriched = messages.map(m => {
    const sender = db.findOne('users', { id: m.sender_id });
    return {
      ...m,
      sender: sender ? { id: sender.id, username: sender.username, avatar: sender.avatar } : null
    };
  });

  res.json(enriched);
});

// POST /api/messages/:userId - send a message (REST fallback, Socket.io is primary)
router.post('/:userId', authenticate, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Message content required' });

  const db = getDB();
  const message = {
    id: uuidv4(),
    sender_id: req.user.id,
    receiver_id: req.params.userId,
    content,
    read: false,
    created_at: new Date().toISOString()
  };

  db.insert('messages', message);
  const sender = db.findOne('users', { id: req.user.id });
  res.status(201).json({
    ...message,
    sender: sender ? { id: sender.id, username: sender.username, avatar: sender.avatar } : null
  });
});

module.exports = router;
