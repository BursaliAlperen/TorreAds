document.addEventListener("DOMContentLoaded", () => {
  const balanceDisplay = document.getElementById("balance-display");
  const watchAdButton = document.getElementById("watch-ad-button");
  const toastNotification = document.getElementById("toast-notification");

  // Kullanıcı ID'si localStorage'de yoksa oluştur
  let uid = localStorage.getItem("uid");
  if (!uid) {
    uid = Math.random().toString(36).substr(2, 9);
    localStorage.setItem("uid", uid);
  }

  // Bakiye güncelle
  function fetchBalance() {
    fetch(`/api/bakiye/${uid}`)
      .then(res => res.json())
      .then(data => {
        balanceDisplay.textContent = `Bakiyeniz: ${data.bakiye.toFixed(4)} TON`;
      });
  }

  // Toast göster
  function showToast(message, isError = false) {
    toastNotification.textContent = message;
    toastNotification.style.color = isError ? "red" : "green";
    setTimeout(() => {
      toastNotification.textContent = "";
    }, 4000);
  }

  // 18 saniyelik sayaç ve reklam
  watchAdButton.addEventListener("click", () => {
    watchAdButton.disabled = true;
    let count = 18;

    watchAdButton.textContent = `Lütfen bekleyin... ${count}s`;

    // Reklam göster
    window.show_9441902('pop')
      .then(() => {
        // Sayaç başlat
        const interval = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(interval);
            // Ödülü ekle API çağrısı
            fetch("/api/odul", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ uid: uid, miktar: 0.0001 })
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  fetchBalance();
                  showToast("Tebrikler! 0.0001 TON kazandınız.");
                } else {
                  showToast("Ödül eklenemedi.", true);
                }
                watchAdButton.textContent = "🎥 Reklam İzle & 0.0001 TON Kazan";
                watchAdButton.disabled = false;
              })
              .catch(() => {
                showToast("Sunucu hatası.", true);
                watchAdButton.textContent = "🎥 Reklam İzle & 0.0001 TON Kazan";
                watchAdButton.disabled = false;
              });
          } else {
            watchAdButton.textContent = `Lütfen bekleyin... ${count}s`;
          }
        }, 1000);
      })
      .catch(() => {
        showToast("Reklam oynatılamadı, lütfen tekrar deneyin.", true);
        watchAdButton.textContent = "🎥 Reklam İzle & 0.0001 TON Kazan";
        watchAdButton.disabled = false;
      });
  });

  // Sayfa açılır açılmaz bakiye getir
  fetchBalance();
});
