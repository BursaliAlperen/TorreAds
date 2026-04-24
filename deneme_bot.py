import asyncio, random, os, sys
from datetime import datetime
from telethon import TelegramClient, errors
from telethon.tl.functions.messages import SetTypingRequest
from telethon.tl.types import SendMessageTypingAction, ChannelParticipantsAdmins

# ⚙️ SENİN BİLGİLERİN (TAMAMEN HAZIR)
API_ID = 26025122
API_HASH = "9c832a240c0ba7cd4b01189ee35a6c59"
PHONE = "+905518951725"           # Başı +90 olarak düzeltildi
GRUP = "@premierdeneme"           # Hedef grup
LINK = "https://t.me/UltimateDeneme"  # Paylaşılacak link

# 📝 5 FARKLI VARYASYON MESAJ (İstersen değiştir)
MESAJLAR = [
    "Merhaba {isim}, TYT-AYT denemeleri için UltimateDeneme kanalına bekleriz: {link}",
    "Selam {isim}! YKS hazırlığında en güncel denemeler burada: {link}",
    "{isim} merhaba, deneme sınavlarına birlikte çalışalım mı? {link}",
    "Hey {isim}, bu kanalda her gün yeni denemeler paylaşılıyor: {link}",
    "Merhaba {isim}, sınav maratonunda sana destek olacak bir kanal: {link}"
]

# 🛡️ SPAM KORUMA (ASLA BAN YEMEZSİN)
GUNLUK_LIMIT = 100         # Günde en fazla 100 kişi
MIN_BEKLEME = 30           # İki mesaj arası min 30 saniye
MAX_BEKLEME = 60           # İki mesaj arası max 60 saniye
TARAMA_MESAJ_SAYISI = 3000 # Son 3000 mesajdaki yazarları tara

GONDERILEN_DOSYASI = "gonderilen.txt"

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
        await client(SetTypingRequest(
            peer=entity,
            action=SendMessageTypingAction()
        ))
        await asyncio.sleep(random.uniform(2, 4))
    except:
        pass

async def mesaj_hazirla(uye):
    ham = random.choice(MESAJLAR)
    isim = uye.first_name or "kullanıcı"
    return ham.replace("{isim}", isim).replace("{link}", LINK)

async def ana_dongu():
    client = TelegramClient("oturum", API_ID, API_HASH)
    await client.start(PHONE)
    print("✅ Bağlantı kuruldu.")

    grup = await client.get_entity(GRUP)
    print(f"📢 Grup: {grup.title}")

    # Yöneticileri al (onlara mesaj yok)
    adminler = await client.get_participants(grup, filter=ChannelParticipantsAdmins)
    admin_ids = set(admin.id for admin in adminler)
    print(f"👑 {len(admin_ids)} yönetici atlanacak.")

    # Son mesajlarda yazan aktif yazarları bul
    print(f"📜 Son {TARAMA_MESAJ_SAYISI} mesaj taranıyor...")
    yazar_ids = set()
    async for mesaj in client.iter_messages(grup, limit=TARAMA_MESAJ_SAYISI):
        if mesaj.sender_id:
            yazar_ids.add(mesaj.sender_id)
    print(f"✍️ {len(yazar_ids)} aktif yazar bulundu.")

    gunluk_gonderilen = 0
    bugun = datetime.now().date()

    for yazar_id in yazar_ids:
        # Gün değiştiyse sayaç sıfırla
        if datetime.now().date() > bugun:
            bugun = datetime.now().date()
            gunluk_gonderilen = 0
            if os.path.exists(GONDERILEN_DOSYASI):
                os.remove(GONDERILEN_DOSYASI)
            print("📆 Yeni gün, sayaç sıfırlandı.")

        if gunluk_gonderilen >= GUNLUK_LIMIT:
            print(f"⛔ Günlük limit ({GUNLUK_LIMIT}) doldu. Durduruluyor.")
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
            await client.send_message(uye, mesaj)
            basarili = True
        except errors.FloodWaitError as e:
            print(f"⏳ FloodWait: {e.seconds} sn bekleniyor...")
            await asyncio.sleep(e.seconds)
            try:
                await insan_gibi_yaz(client, uye)
                await client.send_message(uye, mesaj)
                basarili = True
            except Exception as ex:
                print(f"❌ İkinci deneme hatası ({uye.first_name}): {ex}")
        except Exception as ex:
            print(f"❌ Hata ({uye.first_name}): {ex}")

        if basarili:
            gunluk_gonderilen += 1
            await gonderilenleri_takip_et(uye.id)
            print(f"[{gunluk_gonderilen}/{GUNLUK_LIMIT}] ✅ {uye.first_name}")
            bekle = random.randint(MIN_BEKLEME, MAX_BEKLEME)
            print(f"⏳ {bekle} sn bekleniyor...")
            await asyncio.sleep(bekle)
        else:
            await asyncio.sleep(random.randint(5, 10))

    print("\n🏁 Görev tamamlandı.")
    await client.disconnect()

# Botu başlat
if __name__ == "__main__":
    try:
        import telethon
    except ImportError:
        print("Telethon yüklü değil. Lütfen yükleyin: pip install telethon")
        sys.exit(1)
    try:
        asyncio.run(ana_dongu())
    except KeyboardInterrupt:
        print("\n⚠️ Kullanıcı tarafından durduruldu.")
    except Exception as e:
        print(f"\n💥 Hata: {e}")
