<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>🎬 Reklam İzle, Kazan</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 50px;
    }
    h1 { font-size: 28px; }
    p, #balance { font-size: 18px; margin-bottom: 20px; }
    button {
      padding: 12px 25px;
      font-size: 18px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
    }
    #status {
      margin-top: 20px;
      font-weight: bold;
    }
  </style>
</head>
<body>

<h1>🎬 Reklam İzle, 0.0001 TON Kazan</h1>
<p>💰 Bakiye: <span id="balance">0.0000</span> TON</p>

<button id="watchAdBtn">🎥 Reklamı İzle</button>
<div id="status">Hazır</div>

<script>
  const btn = document.getElementById("watchAdBtn");
  const status = document.getElementById("status");
  const balanceDisplay = document.getElementById("balance");

  // Kullanıcı kimliği (uid)
  let uid = localStorage.getItem("uid");
  if (!uid) {
    uid = crypto.randomUUID(); // Tarayıcıda benzersiz kimlik oluştur
    localStorage.setItem("uid", uid);
  }

  // Bakiyeyi güncelle
  function fetchBalance() {
    fetch(`/api/bakiye/${uid}`)
      .then(res => res.json())
      .then(data => {
        balanceDisplay.textContent = parseFloat(data.bakiye).toFixed(4);
      });
  }

  fetchBalance(); // Sayfa açıldığında bakiyeyi getir

  btn.addEventListener("click", () => {
    btn.disabled = true;
    let countdown = 18;
    status.textContent = `⏳ Reklam izleniyor... ${countdown} saniye`;

    const interval = setInterval(() => {
      countdown--;
      status.textContent = `⏳ Reklam izleniyor... ${countdown} saniye`;
      if (countdown <= 0) {
        clearInterval(interval);
        
        // Ödül ver: 0.0001 TON
        fetch("/api/odul", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            uid: uid,
            miktar: 0.0001
          })
        })
        .then(res => res.json())
        .then(data => {
          fetchBalance();
          status.textContent = `🎉 0.0001 TON kazandınız! Yeni bakiye: ${data.yeni_bakiye.toFixed(4)}`;
        })
        .catch(() => {
          status.textContent = "❌ Ödül alınamadı!";
        })
        .finally(() => {
          btn.disabled = false;
        });
      }
    }, 1000);
  });
</script>

</body>
</html>


// Rewarded Popup

show_9441902('pop').then(() => {
    // user watch ad till the end or close it in interstitial format
    // your code to reward user for rewarded format
}).catch(e => {
    // user get error during playing ad
    // do nothing or whatever you want
})

        
