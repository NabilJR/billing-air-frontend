'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Session timeout in milliseconds (30 minutes = 30 * 60 * 1000)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// Warning time before logout (5 minutes before timeout)
const WARNING_TIME = 5 * 60 * 1000;

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastActivity, setLastActivity] = useState(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // Update last activity time
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    setShowTimeoutWarning(false);
    localStorage.setItem('lastActivity', now.toString());
  }, []);

  // Check session validity
  const checkSession = useCallback(() => {
    const token = localStorage.getItem('token');
    const lastActivityTime = localStorage.getItem('lastActivity');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token || !refreshToken) {
      setIsAuthenticated(false);
      return false;
    }

    if (lastActivityTime) {
      const elapsed = Date.now() - parseInt(lastActivityTime);
      
      if (elapsed >= SESSION_TIMEOUT) {
        // Session expired
        handleLogout();
        return false;
      } else if (elapsed >= SESSION_TIMEOUT - WARNING_TIME) {
        // Show warning
        setShowTimeoutWarning(true);
      }
    }

    setIsAuthenticated(true);
    updateActivity();
    return true;
  }, [updateActivity]);

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setIsAuthenticated(false);
    setShowTimeoutWarning(false);
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login?reason=timeout';
    }
  }, []);

  // Extend session (refresh)
  const extendSession = useCallback(() => {
    updateActivity();
    setShowTimeoutWarning(false);
  }, [updateActivity]);

  // Setup activity listeners
  useEffect(() => {
    // Initialize on mount
    const token = localStorage.getItem('token');
    if (token) {
      checkSession();
    }

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle activity updates
    let throttleTimer = null;
    const throttledUpdate = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          updateActivity();
          throttleTimer = null;
        }, 1000); // Update at most once per second
      }
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, throttledUpdate, { passive: true });
    });

    // Check session periodically
    const intervalId = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        checkSession();
      }
    }, 60000); // Check every minute

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledUpdate);
      });
      if (throttleTimer) clearTimeout(throttleTimer);
      clearInterval(intervalId);
    };
  }, [checkSession, updateActivity]);

  const value = {
    isAuthenticated,
    lastActivity,
    showTimeoutWarning,
    handleLogout,
    extendSession,
    updateActivity,
    checkSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showTimeoutWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center',
          }}>
            <h2 style={{ marginBottom: '1rem' }}>⚠️ Sesi Akan Berakhir</h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Anda tidak aktif selama 25 menit. Sesi akan berakhir dalam 5 menit.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={extendSession}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Lanjutkan Sesi
              </button>
              <button 
                onClick={handleLogout}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#e5e5e5',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Logout Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;