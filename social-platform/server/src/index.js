require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initDB } = require('./models/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const friendRoutes = require('./routes/friends');
const messageRoutes = require('./routes/messages');
const { authenticateSocket } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
['avatars', 'posts'].forEach(sub => {
  const d = path.join(uploadsDir, sub);
  if (!fs.existsSync(d)) fs.mkdirSync(d);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Init DB
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Server running' }));

// Socket.io for real-time messaging
const onlineUsers = new Map(); // userId -> socketId

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const user = authenticateSocket(token);
  if (!user) return next(new Error('Authentication failed'));
  socket.userId = user.id;
  next();
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  onlineUsers.set(socket.userId, socket.id);
  io.emit('user_online', { userId: socket.userId });

  socket.on('send_message', (data) => {
    const { receiverId, content, tempId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);

    // Save message to DB
    const db = require('./models/db').getDB();
    const { v4: uuidv4 } = require('uuid');
    const msgId = uuidv4();
    const stmt = db.prepare(
      'INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)'
    );
    stmt.run(msgId, socket.userId, receiverId, content);

    const message = {
      id: msgId,
      sender_id: socket.userId,
      receiver_id: receiverId,
      content,
      created_at: new Date().toISOString(),
      tempId
    };

    // Send to receiver if online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', message);
    }
    // Confirm to sender
    socket.emit('message_sent', message);
  });

  socket.on('typing', ({ receiverId, isTyping }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { userId: socket.userId, isTyping });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
    io.emit('user_offline', { userId: socket.userId });
    console.log(`User ${socket.userId} disconnected`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
