import React from 'react';

export default function Avatar({ user, size = 40, style = {} }) {
  const initials = user
    ? (user.full_name || user.username || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981'];
  const colorIndex = user ? (user.username?.charCodeAt(0) || 0) % colors.length : 0;

  if (user?.avatar) {
    return (
      <img
        src={`http://localhost:5000${user.avatar}`}
        alt={user.full_name}
        className="avatar"
        style={{ width: size, height: size, ...style }}
      />
    );
  }

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: colors[colorIndex],
        fontSize: size * 0.35,
        color: 'white',
        ...style
      }}
    >
      {initials}
    </div>
  );
}
