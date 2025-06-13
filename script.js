document.addEventListener("DOMContentLoaded", () => {
    const balanceDisplay = document.getElementById("balance-display");
    const referralLinkInput = document.getElementById("referral-link");
    const copyButton = document.getElementById("copy-button");
    const watchAdButton = document.getElementById("watch-ad-button");
    const toastNotification = document.getElementById("toast-notification");

    // Kullanıcı UID'si localStorage'dan alınır veya yeni oluşturulur
    let uid = localStorage.getItem("uid");
    if (!uid) {
        uid = Math.random().toString(36).substring(2, 15);
        localStorage.setItem("uid", uid);
    }

    // Davet linki gösterilir
    const referralLink = `${window.location.origin}?ref=${uid}`;
    referralLinkInput.value = referralLink;

    copyButton.addEventListener("click", () => {
        referralLinkInput.select();
        document.execCommand("copy");
        showToast("Davet linki kopyalandı!");
    });

    function showToast(message, success = true) {
        toastNotification.textContent = message;
        toastNotification.className = success ? "toast-visible success" : "toast-visible";
        setTimeout(() => {
            toastNotification.className = toastNotification.className.replace("toast-visible", "").replace("success", "");
        }, 3000);
    }

    async function fetchBalance() {
        try {
            const res = await fetch(`/api/bakiye/${uid}`);
            const data = await res.json();
            balanceDisplay.textContent = data.bakiye.toFixed(4) + " TON";
        } catch {
            balanceDisplay.textContent = "Hata!";
        }
    }

    async function rewardUser(amount) {
        try {
            const res = await fetch("/api/odul", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid, miktar: amount }),
            });
            const data = await res.json();
            if (data.success) {
                balanceDisplay.textContent = data.yeni_bakiye.toFixed(4) + " TON";
                showToast("Tebrikler! Ödülünüz eklendi.");
            } else {
                showToast("Ödül alınamadı.", false);
            }
        } catch {
            showToast("Ödül verilirken hata oluştu.", false);
        }
    }

    // İlk bakiye getir
    fetchBalance();

    watchAdButton.addEventListener("click", async () => {
        watchAdButton.disabled = true;

        try {
            await window.show_9441902('pop');

            // 18 saniye sayaç
            let countdown = 18;
            watchAdButton.textContent = `Reklam izleniyor... ${countdown}s`;

            const timer = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(timer);
                    watchAdButton.textContent = "Reklam İzle & 0.0001 TON Kazan";
                    watchAdButton.disabled = false;
                    rewardUser(0.0001);
                } else {
                    watchAdButton.textContent = `Reklam izleniyor... ${countdown}s`;
                }
            }, 1000);

        } catch (e) {
            watchAdButton.textContent = "Reklam İzle & 0.0001 TON Kazan";
            watchAdButton.disabled = false;
            showToast("Reklam gösterilirken hata veya iptal edildi.", false);
        }
    });
});
