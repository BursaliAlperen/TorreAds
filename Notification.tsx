
import React, { useEffect, useState } from 'react';
import type { NotificationType } from '../types';

interface NotificationProps extends NotificationType {
  onDismiss: () => void;
}

const iconStyles = {
  success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  error: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
};

const baseClasses = "fixed top-5 right-5 w-full max-w-sm p-4 rounded-lg shadow-2xl flex items-center space-x-3 z-50 transition-all duration-300 ease-in-out";
const typeClasses = {
  success: "bg-green-500/90 backdrop-blur-sm border border-green-400 text-white",
  error: "bg-red-500/90 backdrop-blur-sm border border-red-400 text-white"
};

export const Notification: React.FC<NotificationProps> = ({ message, type, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true); // Animate in
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation to finish
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
         <path strokeLinecap="round" strokeLinejoin="round" d={iconStyles[type]} />
       </svg>
       <span className="flex-grow">{message}</span>
       <button onClick={handleDismiss} className="p-1 rounded-full hover:bg-white/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
       </button>
    </div>
  );
};
