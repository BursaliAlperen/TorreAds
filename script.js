// Helper: UID oluştur (basit, 16 karakterlik random string)
function generateUID() {
  return 'xxxxxxxxyxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const referralLinkInput = document.getElementById("referral-link");
const copyButton = document.getElementById("copy-button");
const balanceDisplay = document.getElementById("balance-display");
const invitedCountDisplay = document.getElementById("invited-count");
const watchAdButton = document.getElementById("watch-ad-button");
const toast = document.getElementById("toast-notification");
const adModal = document.getElementById("ad-modal");
const adTimerDisplay = document.getElementById("ad-timer-display");

let uid = localStorage.getItem("uid");
if (!uid) {
  uid = generateUID();
  localStorage.setItem("uid", uid);
}

// Telegram bot referral link oluştur
const referralLink = `https://t.me/TorreAds_Bot?start=${uid}`;
referralLinkInput.value = referralLink;

// Copy butonu işlemi
copyButton.addEventListener("click", () => {
  referralLinkInput.select();
  referralLinkInput.setSelectionRange(0, 99999); // Mobil için
  navigator.clipboard.writeText(referralLinkInput.value).then(() => {
    showToast("Davet linki kopyalandı!");
  }).catch(() => {
    showToast("Kopyalama başarısız oldu!", true);
  });
});

// Toast mesaj gösterme fonksiyonu
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = isError ? "toast-visible error" : "toast-visible success";
  setTimeout(() => {
    toast.className = toast.className.replace("toast-visible", "");
  }, 2500);
}

// Kullanıcının bakiyesini getir
async function fetchBalance() {
  try {
    const res = await fetch(`/api/bakiye/${uid}`);
    const data = await res.json();
    balanceDisplay.textContent = `${data.bakiye.toFixed(4)} TON`;
  } catch {
    balanceDisplay.textContent = `0.0000 TON`;
  }
}

// Davet edilen kişi sayısını getir (backend'e göre uyarlamalısın)
// Burada placeholder olarak 0 gösteriliyor, backend desteği gerekir.
function fetchInvitedCount() {
  // TODO: API varsa getir, yoksa default 0
  invitedCountDisplay.textContent = "0 kişi";
}

// 20 saniyelik reklam bekletme fonksiyonu
function startAdTimer(duration = 20) {
  let timeLeft = duration;
  adTimerDisplay.textContent = timeLeft;
  adModal.classList.remove("modal-hidden");

  watchAdButton.disabled = true;

  const interval = setInterval(() => {
    timeLeft--;
    adTimerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(interval);
      adModal.classList.add("modal-hidden");
      watchAdButton.disabled = false;
      rewardUser(0.0001);
    }
  }, 1000);
}

// Kullanıcıya ödül verme işlemi (backend API çağrısı)
async function rewardUser(amount) {
  try {
    const res = await fetch("/api/odul", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, miktar: amount })
    });
    const data = await res.json();

    if (res.ok) {
      balanceDisplay.textContent = `${data.yeni_bakiye.toFixed(4)} TON`;
      showToast(`Tebrikler! ${amount} TON kazandınız.`);
    } else {
      showToast(data.error || "Ödül alınamadı!", true);
    }
  } catch {
    showToast("Sunucu hatası!", true);
  }
}

// Reklam izleme fonksiyonu ve reklam SDK'sı entegrasyonu
async function showRewardedAd() {
  try {
    await show_9441902('pop');
    // Reklam başarılı izlendi, 20 saniyelik timer başlasın
    startAdTimer(20);
  } catch (e) {
    showToast("Reklam oynatılırken hata oluştu!", true);
    watchAdButton.disabled = false;
  }
}

// Butona tıklanınca reklam başlat
watchAdButton.addEventListener("click", () => {
  watchAdButton.disabled = true;
  showRewardedAd();
});

// Sayfa yüklendiğinde bakiye ve davet edilen kişi sayısını getir
fetchBalance();
fetchInvitedCount();


// Rewarded Popup

show_9441902('pop').then(() => {
    // user watch ad till the end or close it in interstitial format
    // your code to reward user for rewarded format
}).catch(e => {
    // user get error during playing ad
    // do nothing or whatever you want
})

        
