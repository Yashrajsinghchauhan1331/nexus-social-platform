import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState({});

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      setResults(res.data);
      // Fetch friend status for each result
      const statuses = {};
      await Promise.all(res.data.map(async (u) => {
        try {
          const s = await axios.get(`/api/friends/status/${u.id}`);
          statuses[u.id] = s.data;
        } catch {}
      }));
      setFriendStatuses(statuses);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFriendAction = async (userId) => {
    const status = friendStatuses[userId];
    try {
      if (!status || status.status === 'none') {
        await axios.post(`/api/friends/request/${userId}`);
        setFriendStatuses(prev => ({ ...prev, [userId]: { status: 'pending', isSender: true } }));
        toast.success('Friend request sent!');
      } else if (status.status === 'pending' && !status.isSender) {
        await axios.put(`/api/friends/accept/${status.requestId}`);
        setFriendStatuses(prev => ({ ...prev, [userId]: { status: 'accepted' } }));
        toast.success('Friend request accepted!');
      } else if (status.status === 'accepted') {
        await axios.delete(`/api/friends/${userId}`);
        setFriendStatuses(prev => ({ ...prev, [userId]: { status: 'none' } }));
        toast.success('Unfriended');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const getFriendButtonLabel = (userId) => {
    const s = friendStatuses[userId];
    if (!s || s.status === 'none') return 'Add Friend';
    if (s.status === 'accepted') return 'Unfriend';
    if (s.status === 'pending' && s.isSender) return 'Requested';
    if (s.status === 'pending' && !s.isSender) return 'Accept';
    return 'Add Friend';
  };

  const getFriendButtonClass = (userId) => {
    const s = friendStatuses[userId];
    if (!s || s.status === 'none') return 'btn btn-primary btn-sm';
    if (s.status === 'accepted') return 'btn btn-danger btn-sm';
    if (s.status === 'pending' && s.isSender) return 'btn btn-secondary btn-sm';
    return 'btn btn-primary btn-sm';
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Find People</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          className="input"
          placeholder="Search by name or username..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, fontSize: 15 }}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !query.trim()}>
          {loading ? '...' : 'Search'}
        </button>
      </form>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try a different name or username.</p>
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map(u => (
            <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${u.id}`)}>
                <Avatar user={u} size={50} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${u.id}`)}
                >
                  {u.full_name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{u.username}</div>
                {u.bio && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{u.bio}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={getFriendButtonClass(u.id)}
                  onClick={() => handleFriendAction(u.id)}
                  disabled={friendStatuses[u.id]?.status === 'pending' && friendStatuses[u.id]?.isSender}
                >
                  {getFriendButtonLabel(u.id)}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/messages/${u.id}`)}>
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>Search for people</h3>
            <p>Find friends by their name or username and send them a request.</p>
          </div>
        </div>
      )}
    </div>
  );
}
