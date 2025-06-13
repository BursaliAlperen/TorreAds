const watchAdBtn = document.getElementById('watch-ad-button');
const balanceDisplay = document.getElementById('balance-display');

let adDuration = 20; // saniye

function updateBalance(newBalance) {
  balanceDisplay.textContent = newBalance.toFixed(4) + " TON";
}

function showToast(message, success = true) {
  const toast = document.getElementById('toast-notification');
  toast.textContent = message;
  toast.className = success ? 'toast-visible success' : 'toast-visible';
  setTimeout(() => {
    toast.className = '';
  }, 3000);
}

watchAdBtn.addEventListener('click', () => {
  watchAdBtn.disabled = true;
  let originalText = watchAdBtn.textContent;
  watchAdBtn.textContent = `Reklam izleniyor... ${adDuration}s`;

  let countdown = adDuration;
  const timer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      watchAdBtn.textContent = `Reklam izleniyor... ${countdown}s`;
    } else {
      clearInterval(timer);
      watchAdBtn.textContent = originalText;
      watchAdBtn.disabled = false;
    }
  }, 1000);

  // Reklam gösterme - sdk fonksiyonu
  show_9441902('pop').then(() => {
    // Reklam başarıyla izlendi, ödül verme kısmı:
    // Backend'e POST isteği ile ödül verelim

    fetch('/api/odul', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: 'user1', miktar: 0.0001 })  // uid dinamik olmalı, örnek user1
    })
    .then(res => res.json())
    .then(data => {
      if (data.yeni_bakiye !== undefined) {
        updateBalance(data.yeni_bakiye);
        showToast('Tebrikler! 0.0001 TON kazandınız.');
      } else {
        showToast('Bakiye güncellenemedi.', false);
      }
    })
    .catch(() => {
      showToast('Sunucu hatası, tekrar deneyin.', false);
    });

  }).catch(() => {
    clearInterval(timer);
    watchAdBtn.textContent = originalText;
    watchAdBtn.disabled = false;
    showToast('Reklam yüklenemedi veya izlendi.', false);
  });
});
