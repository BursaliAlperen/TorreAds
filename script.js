document.addEventListener('DOMContentLoaded', () => {
    // Initialize Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
    }

    // DOM Elements
    const balanceEl = document.getElementById('balance');
    const watchAdBtn = document.getElementById('watch-ad-btn');
    const countdownEl = document.getElementById('countdown');
    const tonAddressInput = document.getElementById('ton-address');
    const withdrawAmountInput = document.getElementById('withdraw-amount');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const withdrawStatusEl = document.getElementById('withdraw-status');
    const adblockOverlay = document.getElementById('adblock-overlay');
    const adBait = document.getElementById('ad-bait');

    // State
    let balance = parseFloat(localStorage.getItem('tonBalance')) || 0.0;
    let statusTimeout = null;

    // Constants
    const REWARD_AMOUNT = 0.0003; // Reward for 1 ad
    const MIN_WITHDRAWAL = 0.75;
    const AD_SDK_URL = '//libtl.com/sdk.js';
    const AD_ZONE_ID = '9441902';

    const updateBalanceDisplay = () => {
        balanceEl.textContent = balance.toFixed(4);
        localStorage.setItem('tonBalance', balance.toString());
    };

    const showStatus = (element, message, duration = 3000) => {
        element.textContent = message;
        if (statusTimeout) clearTimeout(statusTimeout);
        if (duration > 0) {
            statusTimeout = setTimeout(() => {
                element.textContent = '';
            }, duration);
        }
    };

    const watchAd = () => {
        watchAdBtn.disabled = true;
        showStatus(countdownEl, 'Loading ad, please wait...', 0);

        // Remove any old ad scripts to prevent conflicts
        const oldScript = document.querySelector(`script[src="${AD_SDK_URL}"]`);
        if (oldScript) {
            oldScript.remove();
        }

        // Dynamically create and load the ad SDK script
        const script = document.createElement('script');
        script.src = AD_SDK_URL;
        script.dataset.zone = AD_ZONE_ID;
        script.dataset.sdk = `show_${AD_ZONE_ID}`;
        script.onload = handleAdSDK;
        script.onerror = () => {
            showStatus(countdownEl, 'Ad service failed to load. Please try again.');
            watchAdBtn.disabled = false;
        };
        document.body.appendChild(script);
    };

    const handleAdSDK = () => {
        const adFunctionName = `show_${AD_ZONE_ID}`;
        if (typeof window[adFunctionName] === 'function') {
            showStatus(countdownEl, 'Please complete the ad to receive your reward.', 0);
            
            window[adFunctionName]().then(() => {
                // Ad watched successfully
                balance += REWARD_AMOUNT;
                updateBalanceDisplay();
                showStatus(countdownEl, `Congratulations! You've earned ${REWARD_AMOUNT.toFixed(4)} TON.`);
                watchAdBtn.disabled = false;
            }).catch(e => {
                // Ad failed or was closed early
                console.error('Ad error:', e);
                showStatus(countdownEl, 'Ad could not be shown. Please try again.');
                watchAdBtn.disabled = false;
            });
        } else {
            // This case should be rare due to onload, but it's good practice
            showStatus(countdownEl, 'Ad service is not available. Please try again later.');
            watchAdBtn.disabled = false;
        }
    };
    
    const setWithdrawStatusMessage = (message, isError) => {
        withdrawStatusEl.textContent = message;
        withdrawStatusEl.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
        setTimeout(() => {
            withdrawStatusEl.textContent = '';
        }, 4000);
    };

    const handleWithdrawal = () => {
        const address = tonAddressInput.value.trim();
        const amount = parseFloat(withdrawAmountInput.value);

        if (!address) {
            setWithdrawStatusMessage('Please enter your TON address.', true);
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            setWithdrawStatusMessage('Please enter a valid amount.', true);
            return;
        }
        
        if (amount > balance) {
            setWithdrawStatusMessage('Your balance is insufficient for this withdrawal.', true);
            return;
        }

        if (amount < MIN_WITHDRAWAL) {
            setWithdrawStatusMessage(`The minimum withdrawal amount is ${MIN_WITHDRAWAL} TON.`, true);
            return;
        }

        // On success
        balance -= amount;
        updateBalanceDisplay();
        
        setWithdrawStatusMessage('Your payment request has been approved!', false);
        
        // Clear inputs after successful withdrawal
        tonAddressInput.value = '';
        withdrawAmountInput.value = '';
    };

    // Event Listeners
    watchAdBtn.addEventListener('click', watchAd);
    withdrawBtn.addEventListener('click', handleWithdrawal);

    // Initial setup
    updateBalanceDisplay();

    // Ad Blocker Check
    const checkAdBlocker = () => {
        // Use a timeout to give adblocker scripts a chance to run
        setTimeout(() => {
            if (!adBait || adBait.offsetHeight === 0 || window.getComputedStyle(adBait).display === 'none') {
                adblockOverlay.classList.remove('hidden');
                // Disable functionality
                watchAdBtn.disabled = true;
                withdrawBtn.disabled = true;
                watchAdBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Disable Ad Blocker';
            }
        }, 500);
    };

    checkAdBlocker();
});