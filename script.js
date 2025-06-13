document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const balanceDisplay = document.getElementById('balance-display');
    const referralLinkInput = document.getElementById('referral-link');
    const copyButton = document.getElementById('copy-button');
    const invitedCountDisplay = document.getElementById('invited-count');
    const watchAdButton = document.getElementById('watch-ad-button');
    const adModal = document.getElementById('ad-modal');
    const adTimerDisplay = document.getElementById('ad-timer-display');
    const toastNotification = document.getElementById('toast-notification');
    const buttonText = watchAdButton.querySelector('.button-text');
    const buttonTimer = watchAdButton.querySelector('.button-timer');

    // --- Constants ---
    const REWARD_AMOUNT = 0.0001;
    const AD_DURATION_SECONDS = 18;
    const DB_KEY = 'torreAdsDB';

    // --- Ad Timer ---
    let adTimerInterval = null;

    // --- Audio ---
    let audioContext;
    let rewardSoundBuffer;
    let clickSoundBuffer;

    async function setupAudio() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        rewardSoundBuffer = await loadSound('reward.mp3');
        clickSoundBuffer = await loadSound('click.mp3');
    }
    
    async function loadSound(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        } catch(e) {
            console.error(`Error loading sound: ${url}`, e);
        }
    }

    function playSound(buffer) {
        if (!buffer || !audioContext || audioContext.state === 'suspended') return;
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    }
    
    // --- Application State ---
    let appState = {
        currentUser: null,
        database: {},
    };

    // --- Core Functions ---
    function init() {
        setupAudio();
        loadDatabase();
        
        const urlParams = new URLSearchParams(window.location.search);
        const referrerToken = urlParams.get('ref');

        loadUser(referrerToken);
        updateUI();
        addEventListeners();
    }

    function generateToken() {
        return Math.random().toString(36).substring(2, 12);
    }

    function loadDatabase() {
        const dbString = localStorage.getItem(DB_KEY);
        if (dbString) {
            appState.database = JSON.parse(dbString);
        }
    }

    function saveDatabase() {
        localStorage.setItem(DB_KEY, JSON.stringify(appState.database));
    }

    function loadUser(referrerToken) {
        let userToken = localStorage.getItem('userToken');
        if (!userToken) {
            userToken = generateToken();
            localStorage.setItem('userToken', userToken);

            appState.currentUser = {
                token: userToken,
                balance: 0,
                referrer: referrerToken || null,
                invitedUsers: []
            };
            appState.database[userToken] = appState.currentUser;

            if (referrerToken && appState.database[referrerToken]) {
                appState.database[referrerToken].invitedUsers.push(userToken);
            }
            showToast('TorreAds\'e hoş geldiniz!', 'success');
        } else {
            appState.currentUser = appState.database[userToken];
            // Ensure data consistency if user clears DB but not token
            if (!appState.currentUser) {
                localStorage.removeItem('userToken');
                return loadUser(referrerToken);
            }
        }
        saveDatabase();
    }

    function updateUI() {
        const user = appState.currentUser;
        if (!user) return;

        balanceDisplay.textContent = `${user.balance.toFixed(4)} TON`;
        referralLinkInput.value = `https://t.me/TorreAds_Bot?start=${user.token}`;
        invitedCountDisplay.textContent = `${user.invitedUsers.length} kişi`;
    }

    function addEventListeners() {
        watchAdButton.addEventListener('click', () => {
             if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            playSound(clickSoundBuffer);
            startAd();
        });

        copyButton.addEventListener('click', () => {
             if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            playSound(clickSoundBuffer);
            navigator.clipboard.writeText(referralLinkInput.value).then(() => {
                showToast('Link kopyalandı!', 'success');
            });
        });
    }

    function startAd() {
        watchAdButton.disabled = true;

        // Call ad SDK. It will show a popup/overlay.
        if (typeof show_9441902 === 'function') {
            show_9441902('pop').catch(e => {
                console.warn("Ad SDK failed to load or was closed:", e);
                // We still run the timer as per "ad and timer together"
                // This allows users with ad-blockers to still use the app.
            });
        } else {
            console.error("Ad SDK function not found!");
        }

        // Show our modal with countdown
        adModal.classList.remove('modal-hidden');
        let countdown = AD_DURATION_SECONDS;
        adTimerDisplay.textContent = countdown;

        adTimerInterval = setInterval(() => {
            countdown--;
            adTimerDisplay.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(adTimerInterval);
                finishAd();
            }
        }, 1000);
    }

    function finishAd() {
        adModal.classList.add('modal-hidden');
        watchAdButton.disabled = false;
        
        processReward();
    }

    function processReward() {
        // User's reward
        appState.currentUser.balance += REWARD_AMOUNT;
        
        // Referrer's reward
        const referrerToken = appState.currentUser.referrer;
        if (referrerToken && appState.database[referrerToken]) {
            appState.database[referrerToken].balance += REWARD_AMOUNT;
            showToast(`+${REWARD_AMOUNT.toFixed(4)} TON! Referansınız da kazandı!`, 'success');
        } else {
            showToast(`+${REWARD_AMOUNT.toFixed(4)} TON kazandınız!`, 'success');
        }

        playSound(rewardSoundBuffer);
        appState.database[appState.currentUser.token] = appState.currentUser;
        saveDatabase();
        updateUI();
    }

    function showToast(message, type = 'success') {
        toastNotification.textContent = message;
        toastNotification.className = `toast-visible ${type}`;
        setTimeout(() => {
            toastNotification.className = 'toast-hidden';
        }, 3000);
    }

    // --- Start the app ---
    init();
});