import confetti from 'canvas-confetti';

// --- DOM ELEMENTS ---
const balanceEl = document.getElementById('balance');
const walletBalanceEl = document.getElementById('wallet-balance');
const watchAdBtn = document.getElementById('watch-ad-btn');
const adModal = document.getElementById('ad-modal');
const adImage = document.getElementById('ad-image');
const closeAdBtn = document.getElementById('close-ad-btn');
const progressBarInner = document.getElementById('progress-bar-inner');
const copyBtn = document.getElementById('copy-btn');
const walletAddressEl = document.getElementById('wallet-address');
const copyIcon = document.getElementById('copy-icon');
const checkIcon = document.getElementById('check-icon');

// Views & Navigation
const homeView = document.getElementById('home-view');
const walletView = document.getElementById('wallet-view');
const navHomeBtn = document.getElementById('nav-home-btn');
const navWalletBtn = document.getElementById('nav-wallet-btn');

// Wallet View Elements
const withdrawBtn = document.getElementById('withdraw-btn');
const transactionList = document.getElementById('transaction-list');
const walletDisplayContainer = document.getElementById('wallet-display-container');
const walletEditContainer = document.getElementById('wallet-edit-container');
const editAddressBtn = document.getElementById('edit-address-btn');
const saveWalletBtn = document.getElementById('save-wallet-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const walletInput = document.getElementById('wallet-input');

// --- STATE ---
let balance = 0.0;
let walletAddress = '';
let transactions = [];
const AD_REWARD = 0.0001;
const AD_DURATION_MS = 5000;

const adImages = [
    'ad-image-1.png',
    'ad-image-2.png',
    'ad-image-3.png'
];

let adTimer;

// --- PERSISTENCE ---
function saveState() {
    const appState = {
        balance,
        transactions,
        walletAddress
    };
    localStorage.setItem('torreADSState', JSON.stringify(appState));
}

function loadState() {
    const savedState = localStorage.getItem('torreADSState');
    if (savedState) {
        const appState = JSON.parse(savedState);
        balance = appState.balance || 0.0;
        transactions = appState.transactions || [];
        walletAddress = appState.walletAddress || '';
    }
}

// --- AUDIO ---
let audioContext;
let rewardSoundBuffer;
let withdrawSoundBuffer;

function initAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const loadSound = (url) => {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));
    };

    loadSound('reward.mp3')
        .then(buffer => { rewardSoundBuffer = buffer; })
        .catch(error => console.error('Error loading reward sound:', error));
    
    loadSound('withdraw.mp3')
        .then(buffer => { withdrawSoundBuffer = buffer; })
        .catch(error => console.error('Error loading withdraw sound:', error));
}

function playSound(buffer) {
    if (!audioContext || !buffer) return;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

// --- UI & LOGIC ---
function shortenAddress(address, chars = 6) {
    if (!address) return '';
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

function updateWalletUI() {
    if (walletAddress) {
        walletAddressEl.textContent = shortenAddress(walletAddress);
        walletAddressEl.dataset.fullAddress = walletAddress;
        walletAddressEl.classList.remove('no-address');
        copyBtn.classList.remove('hidden');
        editAddressBtn.textContent = 'Edit Wallet Address';
    } else {
        walletAddressEl.textContent = 'No address set. Please add one.';
        walletAddressEl.dataset.fullAddress = '';
        walletAddressEl.classList.add('no-address');
        copyBtn.classList.add('hidden');
        editAddressBtn.textContent = 'Set Wallet Address';
    }
}

function updateBalanceDisplay() {
    const formattedBalance = balance.toFixed(4);
    balanceEl.textContent = formattedBalance;
    walletBalanceEl.textContent = formattedBalance;
    withdrawBtn.disabled = balance === 0 || !walletAddress;
}

function renderTransactions() {
    transactionList.innerHTML = ''; // Clear list

    if (transactions.length === 0) {
        transactionList.innerHTML = `<li class="empty-state">No transactions yet. Watch an ad to start!</li>`;
        return;
    }

    transactions.slice().reverse().forEach(tx => {
        const li = document.createElement('li');
        li.classList.add('tx-item');

        const typeClass = tx.type === 'earn' ? 'tx-earn' : 'tx-withdraw';
        const sign = tx.type === 'earn' ? '+' : '-';
        const text = tx.type === 'earn' ? 'Ad Watched' : 'Withdrawal';
        
        const date = new Date(tx.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

        li.innerHTML = `
            <div class="tx-icon ${typeClass}">
                ${tx.type === 'earn' 
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`
                }
            </div>
            <div class="tx-details">
                <span class="tx-type">${text}</span>
                <span class="tx-date">${formattedDate}</span>
            </div>
            <div class="tx-amount ${typeClass}">
                ${sign}${tx.amount.toFixed(4)} TON
            </div>
        `;
        transactionList.appendChild(li);
    });
}

function showAd() {
    initAudio(); // Initialize audio on first user interaction
    
    // Select a random ad
    const randomAd = adImages[Math.floor(Math.random() * adImages.length)];
    adImage.src = randomAd;
    
    // Show modal and disable button
    adModal.classList.remove('hidden');
    watchAdBtn.disabled = true;

    // Reset progress bar
    progressBarInner.style.transition = 'none';
    progressBarInner.style.width = '0%';
    
    // Force reflow to apply the reset before starting the transition
    void progressBarInner.offsetWidth;

    // Start progress bar animation
    progressBarInner.style.transition = `width ${AD_DURATION_MS / 1000}s linear`;
    progressBarInner.style.width = '100%';

    // Set timer to finish the ad
    adTimer = setTimeout(finishAd, AD_DURATION_MS);
}

function finishAd() {
    balance += AD_REWARD;
    transactions.push({
        type: 'earn',
        amount: AD_REWARD,
        timestamp: new Date().toISOString()
    });
    updateBalanceDisplay();
    
    // Show claim button
    closeAdBtn.classList.remove('hidden');
    
    // Play sound and show confetti
    playSound(rewardSoundBuffer);
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
    saveState();
}

function closeAd() {
    adModal.classList.add('hidden');
    watchAdBtn.disabled = false;
    closeAdBtn.classList.add('hidden');
    
    // Reset progress bar for the next ad
    progressBarInner.style.transition = 'none';
    progressBarInner.style.width = '0%';
    
    // Clear timer just in case
    clearTimeout(adTimer);
}

function handleCopyAddress() {
    const address = walletAddressEl.dataset.fullAddress;
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
        copyIcon.classList.add('hidden');
        checkIcon.classList.remove('hidden');

        setTimeout(() => {
            copyIcon.classList.remove('hidden');
            checkIcon.classList.add('hidden');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy address.');
    });
}

function handleWithdraw() {
    if (balance <= 0 || !walletAddress) return;

    transactions.push({
        type: 'withdraw',
        amount: balance,
        timestamp: new Date().toISOString()
    });

    balance = 0.0;
    
    playSound(withdrawSoundBuffer);
    updateBalanceDisplay();
    renderTransactions();
    saveState();
    
    // Simple confirmation
    const originalText = withdrawBtn.innerHTML;
    withdrawBtn.innerHTML = 'Success!';
    withdrawBtn.style.backgroundColor = 'var(--success-color)';
    setTimeout(() => {
        withdrawBtn.innerHTML = originalText;
        withdrawBtn.style.backgroundColor = '';
    }, 2000);
}

function handleShowEditWallet() {
    walletDisplayContainer.classList.add('hidden');
    walletEditContainer.classList.remove('hidden');
    walletInput.value = walletAddress;
    walletInput.focus();
}

function handleSaveWallet() {
    const newAddress = walletInput.value.trim();
    // Rudimentary validation for a TON address
    if (newAddress && newAddress.length > 40 && newAddress.startsWith('UQ')) {
        walletAddress = newAddress;
        saveState();
        updateWalletUI();
        updateBalanceDisplay();
        handleCancelEditWallet();
    } else {
        alert('Please enter a valid TON wallet address.');
    }
}

function handleCancelEditWallet() {
    walletDisplayContainer.classList.remove('hidden');
    walletEditContainer.classList.add('hidden');
}

function switchView(viewName) {
    if (viewName === 'home') {
        homeView.classList.remove('hidden');
        walletView.classList.add('hidden');
        navHomeBtn.classList.add('active');
        navWalletBtn.classList.remove('active');
    } else {
        homeView.classList.add('hidden');
        walletView.classList.remove('hidden');
        navHomeBtn.classList.remove('active');
        navWalletBtn.classList.add('active');
        renderTransactions();
    }
}

// --- EVENT LISTENERS ---
watchAdBtn.addEventListener('click', showAd);
closeAdBtn.addEventListener('click', closeAd);
copyBtn.addEventListener('click', handleCopyAddress);
withdrawBtn.addEventListener('click', handleWithdraw);
editAddressBtn.addEventListener('click', handleShowEditWallet);
saveWalletBtn.addEventListener('click', handleSaveWallet);
cancelEditBtn.addEventListener('click', handleCancelEditWallet);
navHomeBtn.addEventListener('click', () => switchView('home'));
navWalletBtn.addEventListener('click', () => switchView('wallet'));

// --- INITIALIZATION ---
function init() {
    loadState();
    updateBalanceDisplay();
    updateWalletUI();
}

init();