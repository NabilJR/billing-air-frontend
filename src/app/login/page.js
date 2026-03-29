'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    if (token && refreshToken) {
      router.push('/dashboard');
    }
  }, [router]);

  // Check for timeout reason
  const timeoutReason = searchParams.get('reason');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('lastActivity', Date.now().toString());
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {timeoutReason === 'timeout' && (
        <div className="badge badge-warning mb-2" style={{ display: 'block', marginBottom: '1rem', padding: '0.75rem' }}>
          Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.
        </div>
      )}
      {error && (
        <div className="badge badge-danger mb-2" style={{ display: 'block', marginBottom: '1rem', padding: '0.75rem' }}>
          {error}
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Username</label>
        <input
          type="text"
          className="form-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Masukkan username"
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Masukkan password"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Memasuki...' : 'Masuk'}
      </button>
    </form>
  );
}

function LoginLoading() {
  return (
    <form>
      <div className="form-group">
        <label className="form-label">Username</label>
        <input type="text" className="form-input" placeholder="Masukkan username" disabled />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input type="password" className="form-input" placeholder="Masukkan password" disabled />
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled>
        Memasuki...
      </button>
    </form>
  );
}

export default function Login() {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Sistem Penagihan Air</h1>
        <Suspense fallback={<LoginLoading />}>
          <LoginForm />
        </Suspense>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-light)' }}>
          {/* Default: admin / admin123 */}
        </p>
      </div>
    </div>
  );
}