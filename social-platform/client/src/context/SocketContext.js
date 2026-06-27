import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [listeners, setListeners] = useState({});

  useEffect(() => {
    if (!token || !user) return;

    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socket.on('user_online', ({ userId }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    socket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  const sendMessage = (receiverId, content, tempId) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', { receiverId, content, tempId });
    }
  };

  const onMessage = (callback) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on('receive_message', callback);
    socketRef.current.on('message_sent', callback);
    return () => {
      socketRef.current?.off('receive_message', callback);
      socketRef.current?.off('message_sent', callback);
    };
  };

  const onTyping = (callback) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on('user_typing', callback);
    return () => socketRef.current?.off('user_typing', callback);
  };

  const emitTyping = (receiverId, isTyping) => {
    socketRef.current?.emit('typing', { receiverId, isTyping });
  };

  const isOnline = (userId) => onlineUsers.has(userId);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, sendMessage, onMessage, onTyping, emitTyping, isOnline, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
