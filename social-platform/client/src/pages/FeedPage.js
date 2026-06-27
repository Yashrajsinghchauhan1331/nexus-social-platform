import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    fetchFeed(1, true);
    fetchFriends();
  }, []);

  const fetchFeed = async (pageNum = 1, reset = false) => {
    try {
      const res = await axios.get(`/api/posts/feed?page=${pageNum}&limit=10`);
      const newPosts = res.data.posts || [];
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setHasMore(pageNum < res.data.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await axios.get('/api/friends');
      setFriends(res.data.slice(0, 5));
    } catch {}
  };

  const handleNewPost = (post) => {
    setPosts(prev => [post, ...prev]);
  };

  const handleDelete = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="feed-layout">
      {/* Main feed */}
      <div>
        <CreatePost onPost={handleNewPost} />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" />
          </div>
        ) : posts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🌐</div>
              <h3>Your feed is empty</h3>
              <p>Connect with friends to see their posts here, or share your first post above.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map(post => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} />
            ))}
            {hasMore && (
              <button
                className="btn btn-secondary"
                onClick={() => fetchFeed(page + 1)}
                style={{ width: '100%' }}
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div>
        {/* Profile quick view */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${user?.id}`)}>
              <Avatar user={user} size={48} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{user?.full_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{user?.username}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => navigate(`/profile/${user?.id}`)}>
            View Profile
          </button>
        </div>

        {/* Online friends */}
        {friends.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>FRIENDS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {friends.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate(`/profile/${f.id}`)}>
                  <Avatar user={f} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{f.username}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={() => navigate('/friends')}>
              See all friends
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
