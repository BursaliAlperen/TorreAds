import React, { useState } from 'react';
import { REFERRAL_BONUS_FOR_REFERRER } from '../constants';

interface ReferralCardProps {
  referralCode: string;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ referralCode }) => {
  const [copied, setCopied] = useState(false);
  
  if (!referralCode) {
    return null; // Don't render until code is generated
  }
  
  const referralLink = `${window.location.origin}${window.location.pathname}?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-white">Refer & Earn</h2>
      <p className="text-slate-400 mt-2">
        Share your referral link with friends. You'll earn {REFERRAL_BONUS_FOR_REFERRER} TON for each friend who joins and watches their first ad!
      </p>
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 bg-slate-900 border border-slate-600 rounded-lg p-3">
        <input
          type="text"
          readOnly
          value={referralLink}
          className="w-full bg-transparent text-slate-300 placeholder-slate-500 focus:outline-none"
          aria-label="Referral Link"
        />
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto flex-shrink-0 px-6 py-2 bg-sky-600 text-white font-bold rounded-md shadow-md hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 transition-all duration-200"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
};