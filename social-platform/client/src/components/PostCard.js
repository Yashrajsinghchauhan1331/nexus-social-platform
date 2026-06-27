import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await axios.post(`/api/posts/${post.id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
    } catch {
      toast.error('Failed to like post');
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`/api/posts/${post.id}`);
      toast.success('Post deleted');
      onDelete?.(post.id);
    } catch {
      toast.error('Failed to delete post');
    }
  };

  return (
    <div className="post-card">
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.author?.id}`)}>
          <Avatar user={post.author} size={40} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            onClick={() => navigate(`/profile/${post.author?.id}`)}
          >
            {post.author?.full_name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            @{post.author?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </div>
        </div>
        {post.author?.id === user?.id && (
          <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--error)', padding: '4px 8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div style={{ padding: '0 16px 12px', fontSize: 15, lineHeight: 1.6 }}>
          {post.content}
        </div>
      )}

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {post.tags.map(tag => (
            <span
              key={tag.id}
              className="badge badge-accent"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/profile/${tag.id}`)}
            >
              @{tag.username}
            </span>
          ))}
        </div>
      )}

      {/* Media */}
      {post.media_url && (
        post.media_type === 'video' ? (
          <video
            src={`http://localhost:5000${post.media_url}`}
            className="post-media"
            controls
            style={{ display: 'block' }}
          />
        ) : (
          <img
            src={`http://localhost:5000${post.media_url}`}
            alt="Post media"
            className="post-media"
            style={{ display: 'block' }}
          />
        )
      )}

      {/* Actions */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 16, borderTop: '1px solid var(--border)' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLike}
          style={{ color: liked ? '#ef4444' : 'var(--text-secondary)', gap: 6 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          {likeCount > 0 && likeCount}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(`/messages/${post.author?.id}`)}
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Message
        </button>
      </div>
    </div>
  );
}
