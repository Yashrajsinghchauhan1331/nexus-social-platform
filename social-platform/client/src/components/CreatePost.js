import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function CreatePost({ onPost }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [tagResults, setTagResults] = useState([]);
  const [tags, setTags] = useState([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef();

  const handleMedia = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMedia(file);
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type: file.type.startsWith('video/') ? 'video' : 'image' });
  };

  const searchTags = async (query) => {
    if (query.length < 2) { setTagResults([]); return; }
    try {
      const res = await axios.get(`/api/users/search?q=${query}`);
      setTagResults(res.data.filter(u => !tags.find(t => t.id === u.id)));
    } catch {}
  };

  const addTag = (u) => {
    setTags([...tags, u]);
    setTagInput('');
    setTagResults([]);
  };

  const removeTag = (id) => setTags(tags.filter(t => t.id !== id));

  const handleSubmit = async () => {
    if (!content.trim() && !media) return;
    setPosting(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      if (media) formData.append('media', media);
      if (tags.length) formData.append('taggedUsers', JSON.stringify(tags.map(t => t.id)));

      const res = await axios.post('/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onPost?.(res.data);
      setContent('');
      setMedia(null);
      setMediaPreview(null);
      setTags([]);
      toast.success('Post published!');
    } catch {
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar user={user} size={40} />
        <div style={{ flex: 1 }}>
          <textarea
            className="input"
            placeholder="What's on your mind?"
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ minHeight: 80, resize: 'none', background: 'var(--bg-secondary)' }}
          />

          {/* Tag search */}
          <div style={{ marginTop: 8, position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {tags.map(t => (
                <span key={t.id} className="badge badge-accent" style={{ gap: 6 }}>
                  @{t.username}
                  <span
                    onClick={() => removeTag(t.id)}
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                  >×</span>
                </span>
              ))}
            </div>
            <input
              className="input"
              placeholder="Tag someone (@username)..."
              value={tagInput}
              onChange={e => { setTagInput(e.target.value); searchTags(e.target.value); }}
              style={{ background: 'var(--bg-secondary)' }}
            />
            {tagResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                maxHeight: 200, overflow: 'auto', marginTop: 4
              }}>
                {tagResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => addTag(u)}
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}
                    className="nav-item"
                  >
                    <Avatar user={u} size={28} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media preview */}
          {mediaPreview && (
            <div style={{ marginTop: 10, position: 'relative' }}>
              {mediaPreview.type === 'video'
                ? <video src={mediaPreview.url} style={{ width: '100%', borderRadius: 8, maxHeight: 300 }} controls />
                : <img src={mediaPreview.url} alt="Preview" style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'cover' }} />
              }
              <button
                onClick={() => { setMedia(null); setMediaPreview(null); }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white',
                  borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16
                }}
              >×</button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleMedia} />
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Photo/Video
              </button>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={posting || (!content.trim() && !media)}
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
