'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function Notification({ type, message, onClose, duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const isSuccess = type === 'success';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        transform: isVisible ? 'translateX(0)' : 'translateX(400px)',
        transition: 'transform 0.3s ease-in-out',
        maxWidth: '400px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          border: `2px solid ${isSuccess ? '#22c55e' : '#ef4444'}`,
        }}
      >
        <div style={{ 
          color: isSuccess ? '#22c55e' : '#ef4444',
          flexShrink: 0 
        }}>
          {isSuccess ? <CheckCircle size={28} /> : <XCircle size={28} />}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ 
            fontWeight: '600', 
            margin: 0,
            color: isSuccess ? '#16a34a' : '#dc2626',
          }}>
            {isSuccess ? 'Berhasil!' : 'Gagal!'}
          </p>
          <p style={{ 
            margin: '0.25rem 0 0 0', 
            color: '#666',
            fontSize: '0.875rem',
          }}>
            {message}
          </p>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

// Hook for managing notifications
export function useNotification() {
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message, duration = 3000) => {
    setNotification({ type, message, duration });
  };

  const showSuccess = (message, duration = 3000) => {
    showNotification('success', message, duration);
  };

  const showError = (message, duration = 4000) => {
    showNotification('error', message, duration);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showNotification,
    showSuccess,
    showError,
    hideNotification,
  };
}

// Provider component for notifications
export function NotificationProvider({ children, notification, onClose }) {
  return (
    <>
      {children}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onClose={onClose}
        />
      )}
    </>
  );
}