document.addEventListener("DOMContentLoaded", () => {
  const watchAdButton = document.getElementById("watch-ad-button");
  const balanceDisplay = document.getElementById("balance-display");
  const referralLinkInput = document.getElementById("referral-link");
  const copyButton = document.getElementById("copy-button");
  const invitedCount = document.getElementById("invited-count");

  // Referral UID'yi URL'den al
  const urlParams = new URLSearchParams(window.location.search);
  const uid = urlParams.get("uid") || "anonymous";
  
  // Davet linkini ayarla
  const baseUrl = window.location.origin + window.location.pathname;
  const referralUrl = `${baseUrl}?uid=${encodeURIComponent(uid)}`;
  referralLinkInput.value = referralUrl;

  // Copy butonu
  copyButton.addEventListener("click", () => {
    referralLinkInput.select();
    document.execCommand("copy");
    alert("Davet linki kopyalandı!");
  });

  // Mevcut bakiyeyi API'den al (örnek)
  fetch(`/api/bakiye/${encodeURIComponent(uid)}`)
    .then((res) => res.json())
    .then((data) => {
      balanceDisplay.textContent = `${data.bakiye.toFixed(4)} TON`;
    })
    .catch(() => {
      balanceDisplay.textContent = "0.0000 TON";
    });

  invitedCount.textContent = "0 kişi"; // Bu backend'e göre güncellenmeli

  watchAdButton.addEventListener("click", () => {
    watchAdButton.disabled = true;

    show_9441902("pop")
      .then(() => {
        // Reklam izlendi, şimdi 20 saniyelik bekleme başlasın
        let timeLeft = 20;
        const buttonText = watchAdButton.querySelector(".button-text");
        const timerSpan = watchAdButton.querySelector(".button-timer");
        
        buttonText.style.display = "none";
        timerSpan.style.display = "inline";
        timerSpan.textContent = `${timeLeft} sn`;

        const interval = setInterval(() => {
          timeLeft--;
          timerSpan.textContent = `${timeLeft} sn`;
          if (timeLeft <= 0) {
            clearInterval(interval);
            timerSpan.style.display = "none";
            buttonText.style.display = "inline";

            // Süre bitti, ödülü ver
            fetch("/api/odul", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uid, miktar: 0.0001 }),
            })
              .then((res) => res.json())
              .then((data) => {
                balanceDisplay.textContent = `${data.yeni_bakiye.toFixed(4)} TON`;
                alert("20 saniye tamamlandı, ödül hesabınıza eklendi!");
                watchAdButton.disabled = false;
              })
              .catch(() => {
                alert("Ödül güncellenirken hata oluştu.");
                watchAdButton.disabled = false;
              });
          }
        }, 1000);
      })
      .catch((err) => {
        console.error("Reklam oynatma hatası:", err);
        alert("Reklam oynatılırken hata oluştu. Lütfen tekrar deneyin.");
        watchAdButton.disabled = false;
      });
  });
});
