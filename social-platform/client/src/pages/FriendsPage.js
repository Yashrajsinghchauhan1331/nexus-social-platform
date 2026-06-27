import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';

export default function FriendsPage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState('friends');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        axios.get('/api/friends'),
        axios.get('/api/friends/requests')
      ]);
      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
    } catch {
      toast.error('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId, userId) => {
    try {
      await axios.put(`/api/friends/accept/${requestId}`);
      setRequests(r => r.filter(u => u.requestId !== requestId));
      toast.success('Friend request accepted!');
      fetchAll(); // refresh
    } catch {
      toast.error('Failed to accept');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await axios.put(`/api/friends/reject/${requestId}`);
      setRequests(r => r.filter(u => u.requestId !== requestId));
      toast.success('Request declined');
    } catch {
      toast.error('Failed to decline');
    }
  };

  const handleUnfriend = async (friendId) => {
    if (!window.confirm('Remove this friend?')) return;
    try {
      await axios.delete(`/api/friends/${friendId}`);
      setFriends(f => f.filter(u => u.id !== friendId));
      toast.success('Unfriended');
    } catch {
      toast.error('Failed to unfriend');
    }
  };

  const tabs = [
    { id: 'friends', label: 'Friends', count: friends.length },
    { id: 'requests', label: 'Requests', count: requests.length }
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Friends</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span className={tab === t.id ? '' : 'badge-count'} style={{
                background: tab === t.id ? 'rgba(255,255,255,0.3)' : 'var(--error)',
                color: 'white',
                borderRadius: 9,
                padding: '1px 6px',
                fontSize: 11,
                fontWeight: 700
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      ) : tab === 'friends' ? (
        friends.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3>No friends yet</h3>
              <p>Search for people to connect with!</p>
              <button className="btn btn-primary" onClick={() => navigate('/search')}>Find People</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {friends.map(f => (
              <div key={f.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${f.id}`)}>
                  <Avatar user={f} size={48} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => navigate(`/profile/${f.id}`)}>
                    {f.full_name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{f.username}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/messages/${f.id}`)}>Message</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleUnfriend(f.id)}>Unfriend</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        requests.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📬</div>
              <h3>No pending requests</h3>
              <p>All caught up!</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map(r => (
              <div key={r.requestId} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${r.id}`)}>
                  <Avatar user={r} size={48} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => navigate(`/profile/${r.id}`)}>
                    {r.full_name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{r.username} · wants to be friends</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleAccept(r.requestId, r.id)}>Accept</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleReject(r.requestId)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
