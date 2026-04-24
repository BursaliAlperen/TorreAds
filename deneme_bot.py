import asyncio, random, os, sys
from datetime import datetime
from telethon import TelegramClient, errors
from telethon.tl.functions.messages import SetTypingRequest
from telethon.tl.types import SendMessageTypingAction, ChannelParticipantsAdmins

# ⚙️ BİLGİLERİN (ELLEME)
API_ID = 26025122
API_HASH = "9c832a240c0ba7cd4b01189ee35a6c59"
PHONE = "+905518951725"
GRUP = "@premierdeneme"
LINK = "https://t.me/+hY2_f2VzD0w1ZWZk"

# 🔗 GİZLİ LİNK METİNLERİ (Her mesajda rastgele biri seçilir)
LINK_METINLER = [
    "👉 Buraya tıkla",
    "🔗 Kanalı ziyaret et",
    "📌 Hemen katıl",
    "🚀 Denemelere ulaş",
    "💡 Göz atmak için tıkla",
    "⭐ Gruba gel"
]

# 📝 MESAJLAR ({isim} ve {link_metin} ile birlikte gizli link)
MESAJLAR = [
    "Merhaba {isim}, TYT-AYT denemeleri için {link_metin}",
    "Selam {isim}! YKS hazırlığında en güncel denemeler {link_metin}",
    "{isim} merhaba, denemelere birlikte çalışalım mı? {link_metin}",
    "Hey {isim}, her gün yeni denemeler burada {link_metin}",
    "Merhaba {isim}, sınav maratonunda sana destek olacak kanal {link_metin}"
]

# 🛡️ SPAM KORUMA
GUNLUK_LIMIT = 100
MIN_BEKLEME = 30
MAX_BEKLEME = 60
TARAMA_MESAJ_SAYISI = 3000

GONDERILEN_DOSYASI = "gonderilen.txt"

# ----------------- FONKSİYONLAR -----------------
async def gonderilenleri_takip_et(kullanici_id):
    with open(GONDERILEN_DOSYASI, "a", encoding="utf-8") as f:
        f.write(str(kullanici_id) + "\n")

async def daha_once_gonderilmis(kullanici_id):
    if not os.path.exists(GONDERILEN_DOSYASI):
        return False
    with open(GONDERILEN_DOSYASI, "r") as f:
        ids = set(f.read().splitlines())
    return str(kullanici_id) in ids

async def insan_gibi_yaz(client, entity):
    try:
        await client(SetTypingRequest(peer=entity, action=SendMessageTypingAction()))
        await asyncio.sleep(random.uniform(2, 4))
    except:
        pass

async def mesaj_hazirla(uye):
    ham = random.choice(MESAJLAR)
    isim = uye.first_name or "kullanıcı"
    link_metin = random.choice(LINK_METINLER)
    return f"{ham.replace('{isim}', isim).replace('{link_metin}', '')}[{link_metin}]({LINK})"

async def ana_dongu():
    client = TelegramClient("oturum_gizli", API_ID, API_HASH)
    await client.start(PHONE)
    print("✅ Bağlantı kuruldu.")

    grup = await client.get_entity(GRUP)
    print(f"📢 Grup: {grup.title}")

    adminler = await client.get_participants(grup, filter=ChannelParticipantsAdmins)
    admin_ids = set(admin.id for admin in adminler)
    print(f"👑 {len(admin_ids)} yönetici atlanacak.")

    print(f"📜 Son {TARAMA_MESAJ_SAYISI} mesaj taranıyor...")
    yazar_ids = set()
    async for mesaj in client.iter_messages(grup, limit=TARAMA_MESAJ_SAYISI):
        if mesaj.sender_id:
            yazar_ids.add(mesaj.sender_id)
    print(f"✍️ {len(yazar_ids)} aktif yazar bulundu.")

    gunluk_gonderilen = 0
    bugun = datetime.now().date()

    for yazar_id in yazar_ids:
        if datetime.now().date() > bugun:
            bugun = datetime.now().date()
            gunluk_gonderilen = 0
            if os.path.exists(GONDERILEN_DOSYASI):
                os.remove(GONDERILEN_DOSYASI)
            print("📆 Yeni gün, sayaç sıfırlandı.")

        if gunluk_gonderilen >= GUNLUK_LIMIT:
            print(f"⛔ Günlük limit ({GUNLUK_LIMIT}) doldu.")
            break

        if yazar_id in admin_ids:
            continue

        try:
            uye = await client.get_entity(yazar_id)
        except:
            continue

        if uye.bot or uye.deleted:
            continue

        if await daha_once_gonderilmis(uye.id):
            continue

        mesaj = await mesaj_hazirla(uye)

        basarili = False
        try:
            await insan_gibi_yaz(client, uye)
            await client.send_message(uye, mesaj, link_preview=False)
            basarili = True
        except errors.FloodWaitError as e:
            print(f"⏳ FloodWait: {e.seconds} sn")
            await asyncio.sleep(e.seconds)
            try:
                await insan_gibi_yaz(client, uye)
                await client.send_message(uye, mesaj, link_preview=False)
                basarili = True
            except Exception as ex:
                print(f"❌ {uye.first_name}: {ex}")
        except Exception as ex:
            print(f"❌ {uye.first_name}: {ex}")

        if basarili:
            gunluk_gonderilen += 1
            await gonderilenleri_takip_et(uye.id)
            print(f"[{gunluk_gonderilen}/{GUNLUK_LIMIT}] ✅ {uye.first_name}")
            bekle = random.randint(MIN_BEKLEME, MAX_BEKLEME)
            print(f"⏳ {bekle} sn bekleniyor...")
            await asyncio.sleep(bekle)
        else:
            await asyncio.sleep(random.randint(5, 10))

    print("\n🏁 Bitti.")
    await client.disconnect()

if __name__ == "__main__":
    try:
        import telethon
    except ImportError:
        print("Telethon yüklü değil: pip install telethon")
        sys.exit(1)
    try:
        asyncio.run(ana_dongu())
    except KeyboardInterrupt:
        print("\n⚠️ Durduruldu.")
    except Exception as e:
        print(f"\n💥 Hata: {e}")
