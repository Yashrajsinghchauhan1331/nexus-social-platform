import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullName, username, email, password } = form;
    if (!fullName || !username || !email || !password) {
      toast.error('All fields are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', form);
      login(res.data.user, res.data.token);
      toast.success('Welcome to Nexus!');
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, background: 'var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white' }}>N</div>
            <span style={{ fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Nexus</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="input" placeholder="Yashraj Patil" value={form.fullName} onChange={set('fullName')} />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="input" placeholder="yashraj" value={form.username} onChange={set('username')} />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} />
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: 14 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
