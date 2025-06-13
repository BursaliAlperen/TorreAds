// Global değişkenler
const balanceDisplay = document.getElementById("balance-display");
const referralLinkInput = document.getElementById("referral-link");
const invitedCountDisplay = document.getElementById("invited-count");
const watchAdButton = document.getElementById("watch-ad-button");
const toast = document.getElementById("toast-notification");

// Kullanıcı ID’si oluştur ve sakla
let uid = localStorage.getItem("uid");
if (!uid) {
  uid = "user-" + Math.random().toString(36).slice(2, 10);
  localStorage.setItem("uid", uid);
}

// Referans parametresi varsa backend'e bildir
const urlParams = new URLSearchParams(window.location.search);
const referrer = urlParams.get("ref");
if (referrer && referrer !== uid) {
  fetch("/api/set_referrer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, referrer }),
  });
}

// Referral link oluştur
referralLinkInput.value = `${window.location.origin}?ref=${uid}`;

// Kopyalama fonksiyonu
document.getElementById("copy-button").onclick = () => {
  referralLinkInput.select();
  document.execCommand("copy");
  showToast("Davet linki kopyalandı!");
};

// Toast göster
function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.classList.add("toast-visible");
  setTimeout(() => {
    toast.classList.remove("toast-visible");
  }, duration);
}

// Bakiye ve davet sayısını güncelle
function updateBalance() {
  fetch(`/api/bakiye/${uid}`)
    .then((res) => res.json())
    .then((data) => {
      balanceDisplay.textContent = data.bakiye.toFixed(4) + " TON";
      invitedCountDisplay.textContent = data.referrals + " kişi";
    });
}

updateBalance();

// Reklam izleme ve ödül verme

watchAdButton.addEventListener("click", () => {
  watchAdButton.disabled = true;
  watchAdButton.querySelector(".button-text").textContent =
    "Reklam izleniyor... Lütfen bekleyin";

  // 20 saniyelik sayıcı
  let countdown = 20;
  const timerSpan = watchAdButton.querySelector(".button-timer");
  timerSpan.style.display = "inline";
  timerSpan.textContent = `${countdown}s`;

  const interval = setInterval(() => {
    countdown--;
    timerSpan.textContent = `${countdown}s`;
    if (countdown <= 0) {
      clearInterval(interval);
      timerSpan.style.display = "none";

      // Reklam gösterimi (libtl reklam sdk)
      show_9441902("pop")
        .then(() => {
          // Ödülü backend'e bildir
          fetch("/api/odul", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid, miktar: 0.0001 }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (!data.error) {
                showToast("Tebrikler! 0.0001 TON kazandınız.");
                updateBalance();
              } else {
                showToast("Bir hata oluştu. Lütfen tekrar deneyin.");
              }
            });
        })
        .catch(() => {
          showToast("Reklam oynatılamadı.");
        })
        .finally(() => {
          watchAdButton.disabled = false;
          watchAdButton.querySelector(".button-text").textContent =
            "Reklam İzle & 0.0001 TON Kazan";
        });
    }
  }, 1000);
});
// Rewarded Popup

show_9441902('pop').then(() => {
// user watch ad till the end or close it in interstitial format
// your code to reward user for rewarded format
}).catch(e => {
// user get error during playing ad
// do nothing or whatever you want
})

          
