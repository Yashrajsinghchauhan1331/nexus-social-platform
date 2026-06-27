import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friendship, setFriendship] = useState({ status: 'none' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const isMe = userId === me?.id;

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    if (!isMe) fetchFriendStatus();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`/api/users/${userId}`);
      setProfile(res.data);
      setEditForm({ fullName: res.data.full_name, username: res.data.username, bio: res.data.bio || '' });
    } catch {
      toast.error('Profile not found');
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`/api/posts/user/${userId}`);
      setPosts(res.data);
    } catch {}
  };

  const fetchFriendStatus = async () => {
    try {
      const res = await axios.get(`/api/friends/status/${userId}`);
      setFriendship(res.data);
    } catch {}
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await axios.post('/api/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser({ avatar: res.data.avatar });
      setProfile(prev => ({ ...prev, avatar: res.data.avatar }));
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await axios.put('/api/users/profile', {
        fullName: editForm.fullName,
        username: editForm.username,
        bio: editForm.bio
      });
      setProfile(prev => ({ ...prev, ...res.data }));
      updateUser({ full_name: res.data.full_name, username: res.data.username, bio: res.data.bio });
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFriendAction = async () => {
    try {
      if (friendship.status === 'none') {
        await axios.post(`/api/friends/request/${userId}`);
        setFriendship({ status: 'pending', isSender: true });
        toast.success('Friend request sent!');
      } else if (friendship.status === 'pending' && !friendship.isSender) {
        await axios.put(`/api/friends/accept/${friendship.requestId}`);
        setFriendship({ status: 'accepted' });
        toast.success('Friend request accepted!');
      } else if (friendship.status === 'accepted') {
        await axios.delete(`/api/friends/${userId}`);
        setFriendship({ status: 'none' });
        toast.success('Unfriended');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const getFriendButtonText = () => {
    if (friendship.status === 'accepted') return 'Unfriend';
    if (friendship.status === 'pending' && friendship.isSender) return 'Request Sent';
    if (friendship.status === 'pending' && !friendship.isSender) return 'Accept Request';
    return 'Add Friend';
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
      {/* Profile card */}
      <div className="card" style={{ marginBottom: 24 }}>
        {/* Cover / Avatar area */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(167,139,250,0.2))',
          borderRadius: '10px 10px 0 0',
          height: 100,
          margin: '-20px -20px 0',
          position: 'relative'
        }}>
          <div style={{ position: 'absolute', bottom: -30, left: 24 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar user={profile} size={80} style={{ border: '4px solid var(--bg-card)' }} />
              {isMe && (
                <>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      position: 'absolute', bottom: 4, right: 4,
                      background: 'var(--accent)', border: 'none', color: 'white',
                      borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Change photo"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 42 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="input" value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="input" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="input" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell people about yourself..." style={{ minHeight: 60 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700 }}>{profile.full_name}</h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>@{profile.username}</div>
                  {profile.bio && <p style={{ marginTop: 8, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{profile.bio}</p>}
                </div>
                {isMe ? (
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit Profile</button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleFriendAction}>{getFriendButtonText()}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/messages/${userId}`)}>Message</button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{profile.postCount || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Posts</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{profile.friendCount || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Friends</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Posts */}
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
        {isMe ? 'Your Posts' : `${profile.full_name}'s Posts`}
      </h3>
      {posts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✍️</div>
            <h3>No posts yet</h3>
            <p>{isMe ? 'Share your first post from the feed!' : 'Nothing shared yet.'}</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} onDelete={id => setPosts(p => p.filter(x => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
