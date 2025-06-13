// Buton ve diğer elementleri seç
const watchAdButton = document.getElementById('watch-ad-button');
const balanceDisplay = document.getElementById('balance-display');
const adModal = document.getElementById('ad-modal');
const adTimerDisplay = document.getElementById('ad-timer-display');
const toastNotification = document.getElementById('toast-notification');
const copyButton = document.getElementById('copy-button');
const referralLinkInput = document.getElementById('referral-link');

let balance = 0.0;
let countdownInterval;

// Ödülü güncelleyen fonksiyon (örnek API çağrısı, backend ile uyumlu hale getir)
function updateBalance(uid, amount) {
  return fetch('/api/odul', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, miktar: amount }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.yeni_bakiye !== undefined) {
        balance = data.yeni_bakiye;
        balanceDisplay.textContent = `${balance.toFixed(4)} TON`;
        showToast('Ödül başarıyla eklendi!', true);
      } else if (data.error) {
        showToast(`Hata: ${data.error}`, false);
      }
    })
    .catch(() => {
      showToast('Sunucu hatası, lütfen tekrar deneyin.', false);
    });
}

// Toast gösterme fonksiyonu
function showToast(message, success = true) {
  toastNotification.textContent = message;
  toastNotification.className = '';
  toastNotification.classList.add(success ? 'toast-visible' : 'toast-visible');
  if (success) toastNotification.classList.add('success');

  setTimeout(() => {
    toastNotification.classList.remove('toast-visible', 'success');
  }, 3000);
}

// 20 saniyelik geri sayım fonksiyonu
function startAdCountdown() {
  let timeLeft = 20;
  adTimerDisplay.textContent = timeLeft;
  adModal.classList.remove('modal-hidden');

  countdownInterval = setInterval(() => {
    timeLeft -= 1;
    adTimerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      adModal.classList.add('modal-hidden');
      watchAdButton.disabled = false;
      // Ödül verme işlemi burada çağrılabilir
      updateBalance('user123', 0.0001); // user id ve miktar burada gerçek verilerle değiştirilmeli
    }
  }, 1000);
}

// Reklam izleme butonu tıklama olayı
watchAdButton.addEventListener('click', () => {
  watchAdButton.disabled = true;

  // Reklamı göster (libtl reklam SDK)
  show_9441902('pop')
    .then(() => {
      // Reklam başarıyla izlendiğinde sayaç başlat
      startAdCountdown();
    })
    .catch((err) => {
      console.error('Reklam hatası:', err);
      showToast('Reklam gösterilirken bir hata oluştu.', false);
      watchAdButton.disabled = false;
    });
});

// Kopyala butonu işlevi
copyButton.addEventListener('click', () => {
  referralLinkInput.select();
  referralLinkInput.setSelectionRange(0, 99999); // mobil için
  navigator.clipboard.writeText(referralLinkInput.value).then(() => {
    showToast('Davet linki kopyalandı!', true);
  });
});

// Sayfa yüklendiğinde referral linkini ayarla (örnek)
window.addEventListener('load', () => {
  const uid = 'user123'; // Gerçek kullanıcı ID'si burada olmalı
  referralLinkInput.value = `${window.location.origin}/?ref=${uid}`;

  // Kullanıcının bakiye bilgisini backend'den çekip göster
  fetch(`/api/bakiye/${uid}`)
    .then(res => res.json())
    .then(data => {
      if (data.bakiye !== undefined) {
        balance = data.bakiye;
        balanceDisplay.textContent = `${balance.toFixed(4)} TON`;
      }
    });
});
