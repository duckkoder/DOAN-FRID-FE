import React, { useEffect } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`custom-toast custom-toast-${type}`}>
      <span className="custom-toast-icon">{icons[type]}</span>
      <span className="custom-toast-message">{message}</span>
      <button className="custom-toast-close" onClick={onClose}>×</button>
    </div>
  );
};

export default Toast;
