import React from 'react';
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
} from 'react-icons/fa';

const Alert = ({ type = 'info', message, onClose }) => {
  const icons = {
    success: <FaCheckCircle />,
    error: <FaExclamationTriangle />,
    warning: <FaExclamationTriangle />,
    info: <FaInfoCircle />,
  };

  return (
    <div className={`alert alert-${type}`}>
      <span className="alert-icon">{icons[type]}</span>
      <span className="alert-message">{message}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose}>
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default Alert;
