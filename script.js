<script src='//libtl.com/sdk.js' data-zone='9441902' data-sdk='show_9441902'></script>
<script>
const uid = new URLSearchParams(window.location.search).get("uid") || Math.random().toString(36).substr(2, 9);
const referrer = new URLSearchParams(window.location.search).get("ref");
localStorage.setItem("uid", uid);

// Bakiye güncelle
async function fetchBakiye() {
    const res = await fetch(`/api/bakiye/${uid}`);
    const data = await res.json();
    document.getElementById("bakiye").innerText = (data.bakiye || 0).toFixed(6) + " TON";
}

// Reklam ve ödül süreci
document.getElementById("reklamBtn").addEventListener("click", async () => {
    const button = document.getElementById("reklamBtn");
    button.disabled = true;
    button.innerText = "Reklam oynatılıyor...";

    try {
        await show_9441902("pop"); // Reklam izleniyor

        let kalan = 20;
        const sayac = setInterval(() => {
            button.innerText = `Bekleniyor... (${kalan}s)`;
            kalan--;
            if (kalan < 0) {
                clearInterval(sayac);
                kazanOdul();
            }
        }, 1000);
    } catch (e) {
        button.disabled = false;
        button.innerText = "Reklam izle & 0.0001 TON kazan";
    }
});

// Ödül kazandır
async function kazanOdul() {
    const res = await fetch("/api/kazandir", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ uid, referrer })
    });

    const data = await res.json();
    if (data.success) {
        document.getElementById("reklamBtn").disabled = false;
        document.getElementById("reklamBtn").innerText = "Reklam izle & 0.0001 TON kazan";
        fetchBakiye();
    }
}

window.onload = fetchBakiye;
</script>


// Rewarded Popup

show_9441902('pop').then(() => {
    // user watch ad till the end or close it in interstitial format
    // your code to reward user for rewarded format
}).catch(e => {
    // user get error during playing ad
    // do nothing or whatever you want
})

        
