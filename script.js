document.addEventListener("DOMContentLoaded", () => {
    const balanceDisplay = document.getElementById("balance-display");
    const referralLinkInput = document.getElementById("referral-link");
    const copyButton = document.getElementById("copy-button");
    const invitedCount = document.getElementById("invited-count");
    const watchAdButton = document.getElementById("watch-ad-button");
    const toastNotification = document.getElementById("toast-notification");
    const adModal = document.getElementById("ad-modal");
    const adTimerDisplay = document.getElementById("ad-timer-display");

    // Kullanıcı kimliği (UID) oluştur / al
    let uid = localStorage.getItem("uid");
    if (!uid) {
        uid = Math.random().toString(36).substring(2, 15);
        localStorage.setItem("uid", uid);
    }

    // Davet linki oluştur
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
            toastNotification.className = toastNotification.className.replace("toast-visible", "").trim();
        }, 3000);
    }

    function fetchBalance() {
        fetch(`/api/bakiye/${uid}`)
            .then(res => res.json())
            .then(data => {
                balanceDisplay.textContent = data.bakiye.toFixed(4) + " TON";
                invitedCount.textContent = `${data.davet_sayisi || 0} kişi`;
            })
            .catch(() => {
                showToast("Bakiye alınamadı.", false);
            });
    }

    function rewardUser() {
        fetch("/api/odul", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: uid, miktar: 0.0001 }),
        })
            .then(res => res.json())
            .then(data => {
                balanceDisplay.textContent = data.yeni_bakiye.toFixed(4) + " TON";
                showToast("🎉 0.0001 TON ödül eklendi!");
            })
            .catch(() => {
                showToast("Ödül verirken hata oluştu.", false);
            });
    }

    watchAdButton.addEventListener("click", async () => {
        watchAdButton.disabled = true;
        adModal.classList.remove("modal-hidden");

        try {
            await show_9441902("pop"); // Reklam gösterme SDK çağrısı
            let countdown = 19;
            adTimerDisplay.textContent = countdown;

            const timer = setInterval(() => {
                countdown--;
                adTimerDisplay.textContent = countdown;
                if (countdown <= 0) {
                    clearInterval(timer);
                    adModal.classList.add("modal-hidden");
                    rewardUser();
                    watchAdButton.disabled = false;
                }
            }, 1000);
        } catch (e) {
            adModal.classList.add("modal-hidden");
            watchAdButton.disabled = false;
            showToast("❌ Reklam gösterilemedi.", false);
        }
    });

    fetchBalance(); // Sayfa yüklendiğinde bakiyeyi getir
});
