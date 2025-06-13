let uid = localStorage.getItem("uid");
const urlParams = new URLSearchParams(window.location.search);
const referrer = urlParams.get("ref");

// Yeni kullanıcıya UID ver ve referrer bilgisini gönder
if (!uid) {
  uid = "user-" + Math.random().toString(36).substring(2, 10);
  localStorage.setItem("uid", uid);

  if (referrer && referrer !== uid) {
    fetch("/api/set_referrer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, referrer }),
    });
  }
}

// UI Elemanlarını al
const balanceDisplay = document.getElementById("balance-display");
const referralInput = document.getElementById("referral-link");
const invitedCount = document.getElementById("invited-count");
const copyButton = document.getElementById("copy-button");
const watchAdButton = document.getElementById("watch-ad-button");
const adModal = document.getElementById("ad-modal");
const adTimerDisplay = document.getElementById("ad-timer-display");
const toast = document.getElementById("toast-notification");

// Kullanıcının linkini göster
referralInput.value = `${window.location.origin}?ref=${uid}`;

// Kopyalama fonksiyonu
copyButton.addEventListener("click", () => {
  referralInput.select();
  document.execCommand("copy");
  showToast("Link kopyalandı!", "success");
});

// Bakiye ve davet sayısını al
function updateBalance() {
  fetch(`/api/bakiye/${uid}`)
    .then(res => res.json())
    .then(data => {
      balanceDisplay.textContent = `${data.bakiye.toFixed(4)} TON`;
      invitedCount.textContent = `${data.referrals} kişi`;
    });
}

// Reklam İzle Butonu
watchAdButton.addEventListener("click", () => {
  watchAdButton.disabled = true;
  adModal.classList.remove("modal-hidden");
  let timeLeft = 20;
  adTimerDisplay.textContent = timeLeft;

  const timer = setInterval(() => {
    timeLeft--;
    adTimerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      adModal.classList.add("modal-hidden");
      rewardUser();
    }
  }, 1000);

  // Reklamı başlat (popup göster)
  show_9441902("pop").then(() => {
    // Reklam başarıyla oynatıldı
  }).catch(e => {
    console.error("Reklam gösterilemedi:", e);
  });
});

// Ödül ekleme
function rewardUser() {
  fetch("/api/kazandir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast("0.0001 TON eklendi!", "success");
        updateBalance();
        watchAdButton.disabled = false;
      }
    });
}

// Bildirim
function showToast(message, type) {
  toast.textContent = message;
  toast.className = "";
  toast.classList.add("toast-visible", type);
  setTimeout(() => {
    toast.classList.remove("toast-visible");
  }, 3000);
}

// İlk yüklemede verileri getir
updateBalance();
