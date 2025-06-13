document.addEventListener("DOMContentLoaded", () => {
    const balanceDisplay = document.getElementById("balance-display");
    const referralLinkInput = document.getElementById("referral-link");
    const copyButton = document.getElementById("copy-button");
    const invitedCount = document.getElementById("invited-count");
    const watchAdButton = document.getElementById("watch-ad-button");
    const toastNotification = document.getElementById("toast-notification");

    // Örnek uid: UUID veya cookie gibi gerçek bir kullanıcı kimliği kullanmalısın
    let uid = localStorage.getItem("uid");
    if (!uid) {
        uid = Math.random().toString(36).substring(2, 15);
        localStorage.setItem("uid", uid);
    }

    // Referral link oluştur (örnek)
    const referralLink = `${window.location.origin}?ref=${uid}`;
    referralLinkInput.value = referralLink;

    copyButton.addEventListener("click", () => {
        referralLinkInput.select();
        document.execCommand("copy");
        showToast("Davet linki kopyalandı!");
    });

    function showToast(message) {
        toastNotification.textContent = message;
        toastNotification.classList.add("toast-visible");
        setTimeout(() => {
            toastNotification.classList.remove("toast-visible");
        }, 3000);
    }

    function fetchBalance() {
        fetch(`/api/bakiye/${uid}`)
            .then((res) => res.json())
            .then((data) => {
                balanceDisplay.textContent = data.bakiye.toFixed(4) + " TON";
            });
    }

    fetchBalance();

    watchAdButton.addEventListener("click", () => {
        watchAdButton.disabled = true;
        // Ad SDK reklam gösterme örneği
        window.show_9441902('pop')
            .then(() => {
                // Ödülü API'ye gönder
                fetch("/api/odul", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ uid: uid, miktar: 0.0001 }),
                })
                    .then((res) => res.json())
                    .then((data) => {
                        fetchBalance();
                        showToast("Ödülünüz hesabınıza eklendi!");
                        watchAdButton.disabled = false;
                    });
            })
            .catch(() => {
                showToast("Reklam gösterilemedi.");
                watchAdButton.disabled = false;
            });
    });
});
