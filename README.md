# Nexus — Social Media Platform

A full-stack social media platform built with **Node.js**, **Express**, **React**, and **Socket.io**.

---

## Features

| Feature | Details |
|---|---|
| **User Authentication** | JWT-based register/login, persistent sessions, protected routes |
| **Profile Pages** | View/edit profile, upload profile picture, bio, post/friend counts |
| **Friend Connections** | Send/accept/reject requests, unfriend, friend status tracking |
| **News Feed** | Paginated feed of posts from friends + self, newest first |
| **Post Creation** | Text posts, image/video uploads, tag other users, like posts |
| **Messaging** | Real-time private messaging via Socket.io, typing indicators, conversation history |
| **User Search** | Search by name or username, send friend request from results |

---

## Tech Stack

### Backend (Node.js)
- **Express.js** — REST API server
- **Socket.io** — Real-time bidirectional messaging
- **bcryptjs** — Password hashing
- **jsonwebtoken** — JWT authentication
- **multer** — File uploads (images & videos)
- **JSON file store** — Zero-config persistence (no database install needed)

### Frontend (React.js)
- **React 18** — UI framework
- **React Router v6** — Client-side routing
- **Axios** — HTTP client
- **Socket.io-client** — Real-time messaging
- **react-hot-toast** — Notifications
- **date-fns** — Date formatting

---

## Project Structure

```
nexus/
├── server/
│   ├── src/
│   │   ├── index.js          # Express + Socket.io entry point
│   │   ├── models/
│   │   │   └── db.js         # JSON-based data persistence layer
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT authentication middleware
│   │   └── routes/
│   │       ├── auth.js       # Register, login, /me
│   │       ├── users.js      # Profile, search, avatar upload
│   │       ├── posts.js      # Create, feed, like, delete
│   │       ├── friends.js    # Requests, accept, reject, unfriend
│   │       └── messages.js   # Conversation history (Socket.io handles send)
│   ├── uploads/              # Uploaded files (avatars, post media)
│   ├── data/                 # JSON data files (auto-created)
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── App.js            # Root with routing
│   │   ├── context/
│   │   │   ├── AuthContext.js    # Global auth state + token management
│   │   │   └── SocketContext.js  # Socket.io connection + event handlers
│   │   ├── components/
│   │   │   ├── Layout.js         # Sidebar + nav shell
│   │   │   ├── Avatar.js         # User avatar with fallback initials
│   │   │   ├── PostCard.js       # Post display with like/delete
│   │   │   └── CreatePost.js     # Post composer with media + tagging
│   │   └── pages/
│   │       ├── LoginPage.js
│   │       ├── RegisterPage.js
│   │       ├── FeedPage.js       # News feed
│   │       ├── ProfilePage.js    # User profile with edit
│   │       ├── FriendsPage.js    # Friend list + requests
│   │       ├── MessagesPage.js   # Real-time chat
│   │       └── SearchPage.js     # User search
│   └── package.json
│
└── README.md
```

---

## Setup & Installation

### Prerequisites
- Node.js v16 or higher
- npm

### Step 1 — Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/nexus-social-platform.git
cd nexus-social-platform
```

### Step 2 — Install dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### Step 3 — Environment setup

The server runs with sensible defaults. Optionally create `server/.env`:
```
PORT=5000
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

### Step 4 — Run the application

Open **two terminals**:

**Terminal 1 — Start the backend:**
```bash
cd server
npm start
# Server starts on http://localhost:5000
```

**Terminal 2 — Start the frontend:**
```bash
cd client
npm start
# React app opens on http://localhost:3000
```

### Step 5 — Use the app
1. Open `http://localhost:3000`
2. Register a new account
3. Create posts, search for other users, send friend requests, and chat in real time

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/search?q=` | Search users by name/username |
| GET | `/api/users/:id` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| POST | `/api/users/avatar` | Upload profile picture |

### Posts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/posts` | Create post (supports multipart/form-data) |
| GET | `/api/posts/feed` | Get paginated news feed |
| GET | `/api/posts/user/:userId` | Get user's posts |
| POST | `/api/posts/:id/like` | Toggle like |
| DELETE | `/api/posts/:id` | Delete own post |

### Friends
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/friends` | List accepted friends |
| GET | `/api/friends/requests` | Incoming friend requests |
| POST | `/api/friends/request/:userId` | Send friend request |
| PUT | `/api/friends/accept/:requestId` | Accept request |
| PUT | `/api/friends/reject/:requestId` | Reject request |
| DELETE | `/api/friends/:userId` | Unfriend |
| GET | `/api/friends/status/:userId` | Check friendship status |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/conversations` | List all conversations |
| GET | `/api/messages/:userId` | Get messages with a user |
| POST | `/api/messages/:userId` | Send message (REST fallback) |

### Socket.io Events
| Event | Direction | Payload |
|---|---|---|
| `send_message` | Client → Server | `{ receiverId, content, tempId }` |
| `receive_message` | Server → Client | Full message object |
| `message_sent` | Server → Sender | Confirmed message with ID |
| `typing` | Client → Server | `{ receiverId, isTyping }` |
| `user_typing` | Server → Client | `{ userId, isTyping }` |
| `user_online` | Server → All | `{ userId }` |
| `user_offline` | Server → All | `{ userId }` |

---

## Architecture Notes

- **Authentication** uses JWT tokens stored in `localStorage`. All protected API routes require `Authorization: Bearer <token>`. Socket.io connections authenticate via `socket.handshake.auth.token`.
- **Data persistence** uses a lightweight JSON file store (no database install required). Each table (`users`, `posts`, `friends`, `messages`, `post_likes`, `post_tags`) is a JSON array in `/server/data/`. Suitable for evaluation; swap with PostgreSQL/MongoDB for production.
- **Real-time messaging** is handled entirely via Socket.io. When a message is sent, it's saved to the DB server-side and delivered to the recipient's socket if they're online. The REST endpoint (`POST /api/messages/:userId`) exists as a fallback.
- **File uploads** are stored in `/server/uploads/` and served as static files via Express. Images go to `avatars/` or `posts/`, videos go to `posts/`.
- **News feed** shows posts from accepted friends plus the current user's own posts, sorted newest-first with pagination.
