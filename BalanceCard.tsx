
import React from 'react';
import { ToncoinIcon } from './ToncoinIcon';

interface BalanceCardProps {
  balance: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balance }) => {
  return (
    <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-6 rounded-2xl shadow-2xl text-white">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-lg font-medium text-sky-200">Your Balance</p>
          <p className="text-5xl font-bold tracking-tight mt-1">{balance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
        </div>
        <ToncoinIcon className="w-16 h-16 text-white opacity-20" />
      </div>
       <p className="text-lg font-medium text-sky-200 mt-1">TON</p>
    </div>
  );
};
