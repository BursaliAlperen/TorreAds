
import React, { useState, useEffect, useCallback } from 'react';
import { AD_DURATION_SECONDS } from '../constants';

interface AdWatcherProps {
  onAdWatched: () => void;
}

export const AdWatcher: React.FC<AdWatcherProps> = ({ onAdWatched }) => {
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [countdown, setCountdown] = useState(AD_DURATION_SECONDS);

  useEffect(() => {
    if (!isWatchingAd) return;

    if (countdown > 0) {
      const timerId = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else {
      setIsWatchingAd(false);
      onAdWatched();
    }
  }, [isWatchingAd, countdown, onAdWatched]);

  const handleWatchAdClick = () => {
    setCountdown(AD_DURATION_SECONDS);
    setIsWatchingAd(true);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-2xl shadow-lg text-center">
      <h2 className="text-2xl font-bold text-white">Earn More TON</h2>
      <p className="text-slate-400 mt-2">Click the button below to watch a short ad and earn Toncoin.</p>
      <div className="mt-6">
        <button
          onClick={handleWatchAdClick}
          disabled={isWatchingAd}
          className="w-full max-w-sm mx-auto px-8 py-4 bg-yellow-400 text-slate-900 font-bold text-lg rounded-xl shadow-lg hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-50 transition-all duration-300 ease-in-out disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
        >
          {isWatchingAd ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Ad in progress... ({countdown}s)</span>
            </div>
          ) : (
             <div className="flex items-center justify-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Watch Ad & Earn</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
