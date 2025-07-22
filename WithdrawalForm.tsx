
import React, { useState } from 'react';
import { MINIMUM_WITHDRAWAL } from '../constants';

interface WithdrawalFormProps {
  balance: number;
  isLoading: boolean;
  onWithdraw: (address: string, amount: number) => void;
}

export const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ balance, isLoading, onWithdraw }) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, or numbers (including decimals)
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setAmount(value);
    }
  };

  const setMaxAmount = () => {
    setAmount(balance.toString());
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (address && !isNaN(numericAmount) && numericAmount > 0) {
      onWithdraw(address, numericAmount);
    }
  };

  const isAmountValid = parseFloat(amount) >= MINIMUM_WITHDRAWAL && parseFloat(amount) <= balance;
  const isFormValid = address.trim() !== '' && amount !== '' && isAmountValid && !isLoading;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-white">Withdraw Funds</h2>
      <p className="text-slate-400 mt-2">
        Minimum withdrawal: {MINIMUM_WITHDRAWAL} TON.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="ton-address" className="block text-sm font-medium text-slate-300">
            Your TON Wallet Address
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="ton-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="UQ... or EQ..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-300">
            Amount to Withdraw
          </label>
          <div className="mt-1 relative">
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.05"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              required
            />
             <button
                type="button"
                onClick={setMaxAmount}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-sm font-semibold text-sky-400 hover:text-sky-300"
            >
                MAX
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={!isFormValid}
          className="w-full px-8 py-4 bg-sky-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500 focus:ring-opacity-50 transition-all duration-300 ease-in-out disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          ) : 'Request Withdrawal'}
        </button>
      </form>
    </div>
  );
};
