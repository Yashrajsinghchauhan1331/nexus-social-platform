import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const icons = {
  feed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  friends: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">N</div>
          <span className="sidebar-logo-text">Nexus</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/feed" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {icons.feed} Feed
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {icons.search} Search
          </NavLink>
          <NavLink to="/friends" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {icons.friends} Friends
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {icons.messages} Messages
          </NavLink>
        </nav>

        <div className="sidebar-profile">
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate(`/profile/${user?.id}`)}>
            <Avatar user={user} size={36} />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              @{user?.username}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={handleLogout} title="Log out" style={{ padding: 6 }}>
            {icons.logout}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
