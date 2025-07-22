
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { BalanceCard } from './components/BalanceCard';
import { AdWatcher } from './components/AdWatcher';
import { WithdrawalForm } from './components/WithdrawalForm';
import { Notification } from './components/Notification';
import { sendWithdrawalNotification } from './services/webhookService';
import { MINIMUM_WITHDRAWAL, REWARD_PER_AD, REFERRAL_BONUS_FOR_REFERRED, REFERRAL_BONUS_FOR_REFERRER, REFERRAL_ADS_WATCH_TARGET } from './constants';
import type { NotificationType } from './types';
import { Footer } from './components/Footer';
import { ReferralCard } from './components/ReferralCard';
import { getReferralCode } from './utils/referral';

function App(): React.ReactNode {
  const [balance, setBalance] = useState<number>(() => {
    try {
      const savedBalance = localStorage.getItem('userBalance');
      // Use parseFloat and fallback to 0 if null or invalid
      return savedBalance ? parseFloat(savedBalance) : 0;
    } catch (error) {
      console.error("Could not read balance from local storage:", error);
      return 0;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');

  // Persist balance to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('userBalance', balance.toString());
    } catch (error) {
      console.error("Could not save balance to local storage:", error);
    }
  }, [balance]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  }, []);

  useEffect(() => {
    // Generate or retrieve user's referral code
    setReferralCode(getReferralCode());

    // Check for referral on first load
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    const hasReceivedBonus = localStorage.getItem('hasReceivedReferralBonus') === 'true';

    if (refCode && !hasReceivedBonus) {
      setBalance(prev => parseFloat((prev + REFERRAL_BONUS_FOR_REFERRED).toFixed(8)));
      showNotification(`Welcome! You received ${REFERRAL_BONUS_FOR_REFERRED} TON for using a referral link.`, 'success');
      localStorage.setItem('hasReceivedReferralBonus', 'true');
      localStorage.setItem('isReferredUser', 'true');
      
      // Clean the URL for a better user experience
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showNotification]);

  const handleAdWatched = useCallback(() => {
    setBalance(prevBalance => {
      const newBalance = prevBalance + REWARD_PER_AD;
      return parseFloat(newBalance.toFixed(8));
    });
    showNotification(`You earned ${REWARD_PER_AD} TON!`, 'success');

    // Handle referral bonus for the referrer
    const adWatchCount = parseInt(localStorage.getItem('adWatchCount') || '0') + 1;
    localStorage.setItem('adWatchCount', adWatchCount.toString());

    const isReferred = localStorage.getItem('isReferredUser') === 'true';
    const referrerBonusSent = localStorage.getItem('referrerBonusSent') === 'true';

    if (isReferred && adWatchCount === REFERRAL_ADS_WATCH_TARGET && !referrerBonusSent) {
       // This is a simulation. In a real app, an API call would credit the referrer.
       showNotification(`Your referrer has been credited with ${REFERRAL_BONUS_FOR_REFERRER} TON. Thanks for joining!`, 'success');
       localStorage.setItem('referrerBonusSent', 'true');
    }

  }, [showNotification]);

  const handleWithdrawalRequest = async (address: string, amount: number) => {
    if (amount < MINIMUM_WITHDRAWAL) {
      showNotification(`Minimum withdrawal amount is ${MINIMUM_WITHDRAWAL} TON.`, 'error');
      return;
    }
    if (amount > balance) {
      showNotification('Withdrawal amount cannot exceed your balance.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await sendWithdrawalNotification(address, amount);
      setBalance(prevBalance => {
          const newBalance = prevBalance - amount;
          return parseFloat(newBalance.toFixed(8));
      });
      showNotification('Withdrawal request sent successfully!', 'success');
    } catch (error) {
      console.error('Withdrawal error:', error);
      showNotification('Failed to send withdrawal request. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white flex flex-col items-center p-4 selection:bg-sky-500 selection:text-white">
      {notification && <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
      <div className="w-full max-w-2xl mx-auto flex-grow">
        <Header />
        <main className="mt-8 space-y-8">
          <BalanceCard balance={balance} />
          <ReferralCard referralCode={referralCode} />
          <AdWatcher onAdWatched={handleAdWatched} />
          <WithdrawalForm 
            balance={balance}
            onWithdraw={handleWithdrawalRequest}
            isLoading={isLoading} 
          />
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default App;