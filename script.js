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
    const adModal = document.getElementById('ad-modal-overlay');
    const adIframe = document.getElementById('ad-iframe');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const adblockOverlay = document.getElementById('adblock-overlay');
    const adBait = document.getElementById('ad-bait');

    // State
    let balance = parseFloat(localStorage.getItem('tonBalance')) || 0.0;

    // Constants
    const REWARD_AMOUNT = 0.0002;
    const MIN_WITHDRAWAL = 0.75;

    const updateBalanceDisplay = () => {
        balanceEl.textContent = balance.toFixed(4);
        localStorage.setItem('tonBalance', balance.toString());
    };

    const watchAd = () => {
        watchAdBtn.disabled = true;
        countdownEl.textContent = 'Reklam yeni sekmede açılıyor...';
        localStorage.removeItem('adWatchedResult'); // Clear previous state

        const adWindow = window.open('watchads.html', '_blank');

        if (!adWindow || adWindow.closed || typeof adWindow.closed === 'undefined') {
            countdownEl.textContent = 'Lütfen açılır pencerelere izin verin ve tekrar deneyin.';
            watchAdBtn.disabled = false;
            setTimeout(() => { countdownEl.textContent = ''; }, 5000);
            return;
        }

        // Poll for the result from the ad tab
        const pollInterval = setInterval(() => {
            // If the ad window was closed by the user before completion
            if (adWindow.closed) {
                clearInterval(pollInterval);
                // Check if a result was set before closing, if not, it means user closed it manually
                if (!localStorage.getItem('adWatchedResult')) { 
                    countdownEl.textContent = 'Reklam sekmesi kapatıldı.';
                    watchAdBtn.disabled = false;
                    setTimeout(() => { countdownEl.textContent = ''; }, 3000);
                }
                return;
            }

            // Check for the result in localStorage
            const result = localStorage.getItem('adWatchedResult');
            if (result) {
                if (result === 'success') {
                    rewardUser();
                    countdownEl.textContent = 'Tebrikler, ödül eklendi!';
                } else {
                    countdownEl.textContent = 'Reklam gösterilirken bir hata oluştu.';
                }
                
                // Clean up
                localStorage.removeItem('adWatchedResult');
                clearInterval(pollInterval);
                adWindow.close(); // Attempt to close the ad window
                watchAdBtn.disabled = false;
                setTimeout(() => { countdownEl.textContent = ''; }, 3000);
            }
        }, 1000); // Check every second
    };

    const rewardUser = () => {
        // Sadece ödül verme mantığını yönetir
        balance += REWARD_AMOUNT;
        updateBalanceDisplay();
    };

    const closeAdModal = () => {
        adModal.classList.add('hidden');
        adIframe.src = 'about:blank';
        watchAdBtn.disabled = false; // Ana butonu tekrar aktif et
        countdownEl.textContent = ''; // Durum mesajını temizle
    };

    const handleAdResult = (event) => {
        if (event.key !== 'adWatchedResult') return;

        if (event.newValue === 'success') {
            rewardUser();
            closeAdModal();
        } 
        // Hata durumunda hiçbir şey yapma. Kullanıcı iframe içinde kalır,
        // tekrar deneyebilir veya modalı manuel olarak kapatabilir.
        
        localStorage.removeItem('adWatchedResult');
    };
    
    const setStatusMessage = (message, isError) => {
        withdrawStatusEl.textContent = message;
        withdrawStatusEl.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
    };

    const handleWithdrawal = () => {
        const address = tonAddressInput.value.trim();
        const amount = parseFloat(withdrawAmountInput.value);

        if (!address) {
            setStatusMessage('Lütfen TON adresinizi girin.', true);
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            setStatusMessage('Lütfen geçerli bir tutar girin.', true);
            return;
        }
        
        if (amount > balance) {
            setStatusMessage('Bakiyeniz bu tutarı çekmek için yetersiz.', true);
            return;
        }

        if (amount < MIN_WITHDRAWAL) {
            setStatusMessage(`Minimum çekim tutarı ${MIN_WITHDRAWAL} TON'dur.`, true);
            return;
        }

        // On success
        balance -= amount;
        updateBalanceDisplay();
        
        setStatusMessage('Ödeme talebiniz onaylandı!', false);
        
        // Clear inputs after successful withdrawal
        tonAddressInput.value = '';
        withdrawAmountInput.value = '';

        setTimeout(() => {
            setStatusMessage('', false);
        }, 4000);
    };

    // Event Listeners
    watchAdBtn.addEventListener('click', watchAd);
    window.addEventListener('storage', handleAdResult);
    withdrawBtn.addEventListener('click', handleWithdrawal);
    closeModalBtn.addEventListener('click', closeAdModal);

    // Initial setup
    updateBalanceDisplay();
    localStorage.removeItem('adWatchedResult'); // Clean up on page load

    // Ad Blocker Check
    const checkAdBlocker = () => {
        // Use a timeout to give adblocker scripts a chance to run
        setTimeout(() => {
            if (!adBait || adBait.offsetHeight === 0 || window.getComputedStyle(adBait).display === 'none') {
                adblockOverlay.classList.remove('hidden');
                // Disable functionality
                watchAdBtn.disabled = true;
                withdrawBtn.disabled = true;
                watchAdBtn.textContent = 'Reklam Engelleyiciyi Kapatın';
            }
        }, 500);
    };

    checkAdBlocker();
});


// Rewarded interstitial

show_9441902().then(() => {
    // You need to add your user reward function here, which will be executed after the user watches the ad.
    // For more details, please refer to the detailed instructions.
    alert('You have seen an ad!');
})

        