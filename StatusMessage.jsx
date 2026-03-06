import React from 'react';

const StatusMessage = ({ status, message }) => {
  if (!message) return null;

  // Define styles for different states
  const styles = {
    error: "bg-red-100 border border-red-400 text-red-700",
    success: "bg-green-100 border border-green-400 text-green-700",
    loading: "bg-blue-100 border border-blue-400 text-blue-700",
  };

  // Default to error style if status is unknown, otherwise use specific style
  const activeStyle = styles[status] || styles.error;

  return (
    <div className={`px-4 py-3 rounded relative mb-4 ${activeStyle}`} role="alert">
      <div className="flex items-center">
        {status === 'loading' && (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <div>
          <strong className="font-bold capitalize">{status === 'loading' ? 'Processing' : status}: </strong>
          <span className="block sm:inline">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusMessage;