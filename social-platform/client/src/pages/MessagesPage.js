import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from '../components/Avatar';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const { userId: paramUserId } = useParams();
  const { user: me } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (paramUserId) {
      openConversation(paramUserId);
    }
  }, [paramUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;
    const cleanup = socket.onMessage((msg) => {
      // Only add if it's relevant to active conversation
      if (
        activeUser &&
        (msg.sender_id === activeUser.id || msg.receiver_id === activeUser.id)
      ) {
        setMessages(prev => {
          // Avoid duplicates (tempId dedup)
          if (msg.tempId && prev.find(m => m.tempId === msg.tempId)) {
            return prev.map(m => m.tempId === msg.tempId ? msg : m);
          }
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      fetchConversations();
    });
    return cleanup;
  }, [socket, activeUser]);

  // Listen for typing
  useEffect(() => {
    if (!socket) return;
    const cleanup = socket.onTyping(({ userId, isTyping }) => {
      if (activeUser && userId === activeUser.id) {
        setPartnerTyping(isTyping);
      }
    });
    return cleanup;
  }, [socket, activeUser]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get('/api/messages/conversations');
      setConversations(res.data);
    } catch {}
  };

  const openConversation = async (userId) => {
    try {
      const [userRes, msgsRes] = await Promise.all([
        axios.get(`/api/users/${userId}`),
        axios.get(`/api/messages/${userId}`)
      ]);
      setActiveUser(userRes.data);
      setMessages(msgsRes.data);
      navigate(`/messages/${userId}`, { replace: true });
    } catch {}
  };

  const handleSend = () => {
    if (!newMsg.trim() || !activeUser) return;
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      tempId,
      sender_id: me.id,
      receiver_id: activeUser.id,
      content: newMsg.trim(),
      created_at: new Date().toISOString(),
      sender: me
    };
    setMessages(prev => [...prev, optimistic]);
    socket?.sendMessage(activeUser.id, newMsg.trim(), tempId);
    setNewMsg('');
    socket?.emitTyping(activeUser.id, false);
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (!activeUser) return;
    if (!isTyping) {
      setIsTyping(true);
      socket?.emitTyping(activeUser.id, true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emitTyping(activeUser.id, false);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Conversations list */}
      <div style={{
        width: 300,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Messages</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No conversations yet.
              <br />Go to a friend's profile to start one!
            </div>
          ) : (
            conversations.map(({ user, lastMessage, unreadCount }) => (
              <div
                key={user.id}
                onClick={() => openConversation(user.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  background: activeUser?.id === user.id ? 'var(--bg-hover)' : 'transparent',
                  borderLeft: activeUser?.id === user.id ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.1s'
                }}
              >
                <Avatar user={user} size={42} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{user.full_name}</span>
                    {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMessage.sender_id === me?.id ? 'You: ' : ''}{lastMessage.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeUser ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--bg-secondary)'
          }}>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${activeUser.id}`)}>
              <Avatar user={activeUser} size={40} />
            </div>
            <div>
              <div style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/profile/${activeUser.id}`)}>
                {activeUser.full_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {partnerTyping ? <span style={{ color: 'var(--accent)' }}>typing...</span> : `@${activeUser.username}`}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === me?.id;
              const showTime = i === 0 || new Date(msg.created_at) - new Date(messages[i-1].created_at) > 300000;
              return (
                <div key={msg.id || msg.tempId}>
                  {showTime && (
                    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', margin: '8px 0' }}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                    {!isMine && <Avatar user={activeUser} size={28} />}
                    <div className={`message-bubble ${isMine ? 'sent' : 'received'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-secondary)' }}>
            <input
              className="input"
              style={{ flex: 1, background: 'var(--bg-primary)' }}
              placeholder={`Message ${activeUser.full_name}...`}
              value={newMsg}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
            />
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={!newMsg.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Send
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>Your messages</h3>
            <p>Select a conversation or message a friend from their profile.</p>
          </div>
        </div>
      )}
    </div>
  );
}
